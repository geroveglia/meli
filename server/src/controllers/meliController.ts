
import { Request, Response } from "express";
import { getAuthUrl, authorize, handleNotification } from "../services/meliService.js";
import { Tenant } from "../models/Tenant.js";
import { Cuenta } from "../models/Cuenta.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to log to debug file
const logToFile = (message: string) => {
    const logPath = path.join(process.cwd(), 'meli_oauth.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

// Helper to encode state
const encodeState = (tenantId: string, cuentaId?: string, origin?: string) => {
    return Buffer.from(JSON.stringify({ tenantId, cuentaId, origin, nonce: Date.now() })).toString('base64');
};

// Helper to decode state
const decodeState = (state: string) => {
    try {
        return JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    } catch (e) {
        return null;
    }
};

export const configureCredentials = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId;
    const { appId, clientSecret, redirectUri } = req.body;

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
    }

    try {
        await Tenant.findByIdAndUpdate(tenantId, {
            "mercadolibre.appId": appId,
            "mercadolibre.clientSecret": clientSecret,
            "mercadolibre.redirectUri": redirectUri
        });

        // Update .env file and process.env dynamically
        try {
            const envPath = path.resolve(__dirname, '../../.env');
            if (fs.existsSync(envPath)) {
                let envContent = fs.readFileSync(envPath, 'utf8');
                
                // Regex to find and replace or append
                const appIdRegex = /^MELI_APP_ID=.*$/m;
                const secretRegex = /^MELI_SECRET=.*$/m;

                if (appIdRegex.test(envContent)) {
                    envContent = envContent.replace(appIdRegex, `MELI_APP_ID=${appId}`);
                } else {
                    envContent += `\nMELI_APP_ID=${appId}`;
                }

                if (secretRegex.test(envContent)) {
                    envContent = envContent.replace(secretRegex, `MELI_SECRET=${clientSecret}`);
                } else {
                    envContent += `\nMELI_SECRET=${clientSecret}`;
                }

                fs.writeFileSync(envPath, envContent, 'utf8');
                
                // Update active memory
                process.env.MELI_APP_ID = appId.toString();
                process.env.MELI_SECRET = clientSecret.toString();
                console.log("Global .env credentials updated successfully.");
            }
        } catch (envError) {
            console.error("Error writing to .env file:", envError);
            // We don't throw here, as the DB update was successful.
        }

        res.json({ message: "Credentials updated successfully" });
    } catch (e) {
        console.error("Error updating credentials:", e);
        res.status(500).json({ error: "Failed to update credentials" });
    }
};

export const getAuth = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId; // Set by authenticateToken
    const cuentaId = req.query.cuentaId as string;
    const customRedirectUri = req.query.redirectUri as string;

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID not found in request" });
    }

    try {
        // Fetch Tenant credentials
        const tenant = await Tenant.findById(tenantId);
        const appId = tenant?.mercadolibre?.appId;
        const savedRedirectUri = tenant?.mercadolibre?.redirectUri;

        const apiUrl = process.env.API_URL || `https://${req.get('host')}`;
        const redirectUri = (customRedirectUri && customRedirectUri.trim() !== "") 
            ? customRedirectUri 
            : (savedRedirectUri || `${apiUrl}/api/v1/meli/callback`);

        // Capture origin to redirect back to correctly - strip path to prevent duplication
        let origin = req.get('origin') || req.get('referer');
        if (origin) {
            try {
                const urlObj = new URL(origin);
                origin = urlObj.origin;
            } catch (e) {
                // Fallback to minimal sanitization if URL parsing fails
                origin = origin.split('/admin')[0];
            }
        }
        
        const state = encodeState(tenantId, cuentaId, origin);
        
        // Pass the state to getAuthUrl so it can store the PKCE verifier linked to this state
        const url = getAuthUrl(redirectUri, appId, state) + `&state=${state}`;

        logToFile(`[MELI Auth] Initiating auth. tenantId: ${tenantId}, redirectUri: ${redirectUri}, origin: ${origin}`);
        console.log(`[MELI Auth] Initiating auth. redirectUri: ${redirectUri}, origin: ${origin}, url: ${url}`);
        res.json({ url });
    } catch (e) {
        console.error("Error initiating auth:", e);
        res.status(500).json({ error: "Failed to initiate auth" });
    }
};

export const callback = async (req: Request, res: Response) => {
    const { code, state, error } = req.query;

    if (error) {
        console.error("MELI Auth Error in callback:", error);
        return res.status(400).send(`Error de autorización: ${error}`);
    }

    if (!code || typeof code !== 'string') {
        return res.status(400).send("Código de autorización no provisto");
    }

    if (!state || typeof state !== 'string') {
        return res.status(400).send("Estado no provisto");
    }

    const decoded = decodeState(state);
    if (!decoded || !decoded.tenantId) {
        return res.status(400).send("Estado inválido");
    }

    const { tenantId, cuentaId, origin } = decoded;
    logToFile(`[MELI Callback] Decoded state. tenantId: ${tenantId}, origin: ${origin}, code: ${code?.substring(0, 10)}...`);
    console.log(`[MELI Callback] Decoded state. tenantId: ${tenantId}, cuentaId: ${cuentaId}, origin: ${origin}, code: ${code}`);

    try {
        const apiUrl = process.env.API_URL || `https://${req.get('host')}`;

        // Fetch Tenant credentials
        const tenant = await Tenant.findById(tenantId);
        const appId = tenant?.mercadolibre?.appId;
        const clientSecret = tenant?.mercadolibre?.clientSecret;
        const savedRedirectUri = tenant?.mercadolibre?.redirectUri;

        const redirectUri = savedRedirectUri || `${apiUrl}/api/v1/meli/callback`;
        logToFile(`[MELI Callback] Step 1: Found tenant ${tenant?._id}. appId: ${appId}, redirectUri: ${redirectUri}`);
        console.log(`[MELI Callback] Using redirectUri: ${redirectUri}, appId: ${appId}`);

        // Pass 'state' to authorize so it can retrieve the correct PKCE verifier
        const tokenData = await authorize(code, redirectUri, appId, clientSecret, state as string);
        logToFile(`[MELI Callback] Step 2: PKCE authorize success. sellerId: ${tokenData.sellerId}`);
        console.log(`[MELI Callback] Token exchange successful for sellerId: ${tokenData.sellerId}`);

        // Determine the effective tenantId for syncing
        let effectiveTenantId = tenantId;
        
        // --- GLOBAL UNIQUENESS CHECK ---
        // Redirect back to the captured origin, or fallback to CORS_ORIGIN/localhost
        let frontendUrl = origin;
        if (!frontendUrl) {
            frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || "http://localhost:5173";
        }
        
        // Ensure no trailing slash for consistency
        frontendUrl = frontendUrl.replace(/\/$/, "");

        const duplicateCuenta = await Cuenta.findOne({ 'mercadolibre.sellerId': tokenData.sellerId });
        const duplicateTenant = await Tenant.findOne({ 'mercadolibre.sellerId': tokenData.sellerId });

        // Check if this is the superadmin tenant
        const isSuperadmin = tenant?.slug === 'superadmin' || tenant?.isSystem;

        // If linking a Cuenta, ensure no other Cuenta or Tenant has this sellerId
        if (cuentaId) {
            if (duplicateTenant) {
               logToFile(`[MELI Callback] CONFLICT: sellerId ${tokenData.sellerId} already belongs to tenant ${duplicateTenant._id}`);
               console.warn(`[MELI Callback] Conflict: sellerId ${tokenData.sellerId} already belongs to tenant ${duplicateTenant._id}`);
               return res.redirect(`${frontendUrl}/admin/cuentas?status=error&error_message=${encodeURIComponent("Esta cuenta de MercadoLibre ya está vinculada a una organización principal en el sistema.")}`);
            }
            if (duplicateCuenta && String(duplicateCuenta._id) !== cuentaId) {
               logToFile(`[MELI Callback] CONFLICT: sellerId ${tokenData.sellerId} already belongs to another cuenta ${duplicateCuenta._id}`);
               console.warn(`[MELI Callback] Conflict: sellerId ${tokenData.sellerId} already belongs to another cuenta ${duplicateCuenta._id}`);
               return res.redirect(`${frontendUrl}/admin/cuentas?status=error&error_message=${encodeURIComponent("Esta cuenta de MercadoLibre ya está vinculada a otro cliente.")}`);
            }
        } else if (!isSuperadmin) {
            // Ordinary tenants (non-superadmin) must follow uniqueness rules
            if (duplicateCuenta) {
               logToFile(`[MELI Callback] CONFLICT: sellerId ${tokenData.sellerId} already belongs to cuenta ${duplicateCuenta._id}`);
               console.warn(`[MELI Callback] Conflict: sellerId ${tokenData.sellerId} already belongs to cuenta ${duplicateCuenta._id}`);
               return res.redirect(`${frontendUrl}/admin/integrations?status=error&error_message=${encodeURIComponent("Esta cuenta de MercadoLibre ya está vinculada a un cliente específico en el sistema.")}`);
            }
            if (duplicateTenant && String(duplicateTenant._id) !== tenantId) {
               logToFile(`[MELI Callback] CONFLICT: sellerId ${tokenData.sellerId} belongs to tenant ${duplicateTenant._id} (${duplicateTenant.name}), current is ${tenantId}`);
               console.warn(`[MELI Callback] Conflict: sellerId ${tokenData.sellerId} belongs to tenant ${duplicateTenant._id}, current is ${tenantId}`);
               return res.redirect(`${frontendUrl}/admin/integrations?status=error&error_message=${encodeURIComponent("Esta cuenta de MercadoLibre ya está vinculada a otra organización en el sistema.")}`);
            }
        } else {
            logToFile(`[MELI Callback] Superadmin bypass: Allowing link for sellerId ${tokenData.sellerId} to tenant ${tenantId}`);
        }
        // --- END GLOBAL UNIQUENESS CHECK ---

        if (cuentaId) {
             // Update specific Cuenta (Client)
             // Find by _id only (globally unique) — the decoded tenantId may be the superadmin's,
             // not the Cuenta's actual tenant, so we don't filter by tenantId here.
             const cuenta = await Cuenta.findById(cuentaId);
             if (!cuenta) {
                 return res.status(404).send("Cuenta no encontrada para vincular");
             }
             
             // Use the Cuenta's own tenantId for syncing orders
             effectiveTenantId = String(cuenta.tenantId);
             
             cuenta.mercadolibre = {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken,
                expiresAt: tokenData.expiresAt.getTime(),
                sellerId: tokenData.sellerId,
                nickname: tokenData.nickname,
                userId: String(tokenData.sellerId) // Mapping sellerId to userId field for consistency
             };
             await cuenta.save();
             logToFile(`[MELI Callback] Step 3: Updated Cuenta ${cuentaId}`);
             console.log(`Linked MELI to Cuenta: ${cuenta.name} (${cuenta._id}), Tenant: ${effectiveTenantId}`);

        } else {
            // Fallback: Update Tenant (Legacy / Single Account)
            await Tenant.findByIdAndUpdate(tenantId, {
                mercadolibre: {
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    expiresAt: tokenData.expiresAt,
                    sellerId: tokenData.sellerId,
                    nickname: tokenData.nickname,
                    appId,
                    clientSecret,
                    redirectUri
                }
            });
            logToFile(`[MELI Callback] Step 3: Updated Tenant ${tenantId} mercadolibre object`);
            console.log(`Linked MELI to Tenant: ${tenantId}`);
        }

        // Trigger initial sync of orders
        // We don't await this to avoid blocking the user redirection
        import("../services/meliService.js").then(({ syncRecentOrders }) => {
            syncRecentOrders(effectiveTenantId, cuentaId, tokenData.accessToken, tokenData.sellerId);
            logToFile(`[MELI Callback] Step 4: Sync triggered`);
        });

        logToFile(`[MELI Callback] Step 5: Redirecting to ${frontendUrl}/admin/integrations?status=success`);
        // Redirect to Frontend
        if (cuentaId) {
            res.redirect(`${frontendUrl}/admin/cuentas?status=success`);
        } else {
            res.redirect(`${frontendUrl}/admin/integrations?status=success`);
        }

    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
        logToFile(`[MELI Callback] ERROR: ${errorMsg}`);
        console.error("Error exchanging code:", e);
        const frontendUrl = origin || process.env.CORS_ORIGIN?.split(',')[0] || "http://localhost:5173";
        const errorMessage = encodeURIComponent(errorMsg);
        res.redirect(`${frontendUrl}/admin/integrations?status=error&error_message=${errorMessage}`);
    }
};

export const webhook = async (req: Request, res: Response) => {
    try {
        const { topic, resource, user_id, application_id } = req.body;
        
        // Respond 200 OK immediately to MELI to avoid retries
        res.status(200).send("OK");

        if (!user_id || !topic || !resource) {
            // Might be a test notification or invalid format
            return;
        }

        let tenantId: string | null = null;
        let clientId: string | null = null;

        // 1. Try to find a Cuenta (Client) with this sellerId
        const cuenta = await Cuenta.findOne({ 'mercadolibre.sellerId': user_id });
        if (cuenta) {
            tenantId = String(cuenta.tenantId);
            clientId = String(cuenta._id);
            console.log(`[MELI Webhook] Found Cuenta: ${cuenta.name} for sellerId ${user_id}`);
        } else {
            // 2. Fallback: Try to find a Tenant with this sellerId
            const tenant = await Tenant.findOne({ 'mercadolibre.sellerId': user_id });
            if (tenant) {
                 tenantId = String(tenant._id);
                 console.log(`[MELI Webhook] Found Tenant: for sellerId ${user_id}`);
            }
        }
        
        if (!tenantId) {
            console.warn(`[MELI Webhook] No tenant/cuenta found for sellerId ${user_id}`);
            return;
        }

        await handleNotification(topic, resource, tenantId, clientId);

    } catch (e) {
        console.error("Error processing webhook:", e);
        // Even if we fail processing, we already sent 200 OK. 
        // Logic failure should be logged.
    }
};

export const disconnect = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId;
    const { cuentaId } = req.body; // Expect cuentaId in body if disconnecting a specific account

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID not found" });
    }

    try {
        if (cuentaId) {
            // Find by _id only — tenantId in JWT may not match the Cuenta's tenant
            const cuenta = await Cuenta.findById(cuentaId);
            if (cuenta) {
                cuenta.mercadolibre = undefined;
                await cuenta.save();
            }
        } else {
            // Global Disconnect: Remove Tenant credentials AND disconnect all associated Cuentas
            await Tenant.findByIdAndUpdate(tenantId, {
                $unset: { mercadolibre: 1 }
            });

            // Disconnect all accounts associated with this tenant
            await Cuenta.updateMany(
                { tenantId: tenantId },
                { $unset: { mercadolibre: 1 } }
            );
        }
        
        res.json({ message: "Disconnected successfully" });
    } catch (e) {
        console.error("Error disconnecting MELI:", e);
        res.status(500).json({ error: "Failed to disconnect" });
    }
};

export const sync = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    let tenantId = authReq.tenantId;
    const { cuentaId } = req.body;

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
    }

    try {
        let accessToken;
        let sellerId; 

        if (cuentaId) {
             // Find by _id only — tenantId in JWT may not match the Cuenta's tenant
             const cuenta = await Cuenta.findById(cuentaId);
             if (!cuenta || !cuenta.mercadolibre?.accessToken) {
                 return res.status(404).json({ error: "Cuenta not connected" });
             }
             accessToken = cuenta.mercadolibre.accessToken;
             sellerId = cuenta.mercadolibre.sellerId;
             // Use the Cuenta's own tenantId for syncing
             tenantId = String(cuenta.tenantId);
        } else {
            const tenant = await Tenant.findById(tenantId);
             if (!tenant || !tenant.mercadolibre?.accessToken) {
                 return res.status(404).json({ error: "Tenant not connected" });
             }
             accessToken = tenant.mercadolibre.accessToken;
             sellerId = tenant.mercadolibre.sellerId;
        }

        // Trigger sync
        import("../services/meliService.js").then(({ syncRecentOrders }) => {
            syncRecentOrders(tenantId, cuentaId, accessToken, sellerId);
        });

        res.json({ message: "Sync started in background" });

    } catch (e) {
        console.error("Sync error:", e);
        res.status(500).json({ error: "Failed to start sync" });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId;
    const { clientId } = req.query;

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
    }

    try {
        const emptyStatsResponse = {
            orders: {
                total: 0,
                revenue: 0,
                average: 0
            },
            statusDistribution: [],
            salesHistory: [],
            totalTenants: 0,
            totalClients: 0
        };

        const tenant = await Tenant.findById(tenantId).lean();
        const isSuperadmin = tenant?.slug === 'superadmin' || tenant?.isSystem;
        
        const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
        const matchStage: any = { 
            tenantId: tenantObjectId 
        };

        const rawClientId = Array.isArray(clientId) ? clientId[0] : clientId;

        // Strict behavior: if clientId is present but invalid, return empty stats instead of global data.
        if (rawClientId !== undefined) {
            if (typeof rawClientId !== "string") {
                return res.json(emptyStatsResponse);
            }

            const normalizedClientId = rawClientId.trim();
            if (!normalizedClientId || !mongoose.Types.ObjectId.isValid(normalizedClientId)) {
                return res.json(emptyStatsResponse);
            }

            const clientObjectId = new mongoose.Types.ObjectId(normalizedClientId);
            const cuenta = await Cuenta.findOne(
                { _id: clientObjectId, tenantId: tenantObjectId },
                { mercadolibre: 1 }
            ).lean();

            // If selected client does not exist in this tenant, return empty stats.
            if (!cuenta) {
                return res.json(emptyStatsResponse);
            }

            const sellerId = cuenta.mercadolibre?.sellerId;

            // Match same semantics as /orders: allow legacy orders linked by sellerId.
            if (typeof sellerId === "number") {
                matchStage.$or = [
                    { clientId: clientObjectId },
                    { sellerId }
                ];
            } else {
                matchStage.clientId = clientObjectId;
            }
        }

        // Aggregation for Total Orders and Revenue
        const totalStats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    // Only sum revenue if not cancelled? Or total processed?
                    // Let's rely on payment.status = 'approved' for revenue
                    totalRevenue: { 
                        $sum: { 
                            $cond: [{ $eq: ["$payment.status", "approved"] }, "$payment.total", 0] 
                        } 
                    }
                }
            }
        ]);

        // Aggregation for Logistics Status
        const statusStats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$logisticsStatus",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Aggregation for Sales History (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const salesHistory = await Order.aggregate([
            { $match: { 
                ...matchStage,
                dateCreated: { $gte: sevenDaysAgo }
            }},
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateCreated" } },
                    orders: { $sum: 1 },
                    revenue: { 
                        $sum: { 
                            $cond: [{ $eq: ["$payment.status", "approved"] }, "$payment.total", 0] 
                        } 
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalOrders = totalStats[0]?.count || 0;
        const totalRevenue = totalStats[0]?.totalRevenue || 0;

        let totalTenants = 0;
        let totalClients = 0;

        // If superadmin and no specific clientId, include global counts
        if (isSuperadmin && rawClientId === undefined) {
            totalTenants = await Tenant.countDocuments();
            totalClients = await Cuenta.countDocuments();
        }

        res.json({
            orders: {
                total: totalOrders,
                revenue: totalRevenue,
                average: totalOrders > 0 ? totalRevenue / totalOrders : 0
            },
            statusDistribution: statusStats.map(s => ({ 
                name: s._id || "Desconocido", 
                value: s.count 
            })),
            salesHistory: salesHistory.map(h => ({
                date: h._id,
                orders: h.orders,
                revenue: h.revenue
            })),
            totalTenants,
            totalClients
        });

    } catch (e) {
        console.error("Error fetching dashboard stats:", e);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};




