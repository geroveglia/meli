
import { Request, Response } from "express";
import { getAuthUrl, authorize, handleNotification } from "../services/meliService.js";
import { Tenant } from "../models/Tenant.js";
import { Cuenta } from "../models/Cuenta.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";

// Helper to encode state
const encodeState = (tenantId: string, cuentaId?: string) => {
    return Buffer.from(JSON.stringify({ tenantId, cuentaId, nonce: Date.now() })).toString('base64');
};

// Helper to decode state
const decodeState = (state: string) => {
    try {
        return JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    } catch (e) {
        return null;
    }
};

export const getAuth = (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId; // Set by authenticateToken
    const cuentaId = req.query.cuentaId as string;

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID not found in request" });
    }

    // We use the tenantId in state to recover it during callback
    // The redirect URI should point to our backend callback 
    const callbackPath = "/api/v1/meli/callback"; 
    // Construct full URL based on request host or env
    // Assuming API_URL is set in env or we can infer it
    const apiUrl = process.env.API_URL || `https://${req.get('host')}`;
    const redirectUri = `${apiUrl}${callbackPath}`;

    const state = encodeState(tenantId, cuentaId);
    
    // Check if we need to persist redirectUri in session or just rely on env/params
    // For now, we regenerate it in callback or pass it if needed, but MELI requires exact match.
    // simpler to just call getAuthUrl with the computed redirectUri
    
    const url = getAuthUrl(redirectUri) + `&state=${state}`;

    res.json({ url });
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

    const { tenantId, cuentaId } = decoded;

    try {
        const apiUrl = process.env.API_URL || `https://${req.get('host')}`;
        const redirectUri = `${apiUrl}/api/v1/meli/callback`;

        const tokenData = await authorize(code, redirectUri);

        if (cuentaId) {
             // Update specific Cuenta (Client)
             const cuenta = await Cuenta.findOne({ _id: cuentaId, tenantId });
             if (!cuenta) {
                 return res.status(404).send("Cuenta no encontrada para vincular");
             }
             
             cuenta.mercadolibre = {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken,
                expiresAt: tokenData.expiresAt.getTime(),
                sellerId: tokenData.sellerId,
                nickname: tokenData.nickname,
                userId: String(tokenData.sellerId) // Mapping sellerId to userId field for consistency
             };
             await cuenta.save();
             console.log(`Linked MELI to Cuenta: ${cuenta.name} (${cuenta._id})`);

        } else {
            // Fallback: Update Tenant (Legacy / Single Account)
            await Tenant.findByIdAndUpdate(tenantId, {
                mercadolibre: {
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    expiresAt: tokenData.expiresAt,
                    sellerId: tokenData.sellerId,
                    nickname: tokenData.nickname
                }
            });
            console.log(`Linked MELI to Tenant: ${tenantId}`);
            console.log(`Linked MELI to Tenant: ${tenantId}`);
        }

        // Trigger initial sync of orders
        // We don't await this to avoid blocking the user redirection
        import("../services/meliService.js").then(({ syncRecentOrders }) => {
            syncRecentOrders(tenantId, cuentaId, tokenData.accessToken, tokenData.sellerId);
        });
        // Redirect to Frontend
        // Ideally, we redirect to a success page on the frontend
        // We know the frontend URL from CORS_ORIGIN or hardcoded
        const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || "http://localhost:5173";
        if (cuentaId) {
            res.redirect(`${frontendUrl}/admin/cuentas/${cuentaId}?status=success`);
        } else {
            res.redirect(`${frontendUrl}/admin/cuentas?status=success`);
        }

    } catch (e) {
        console.error("Error exchanging code:", e);
        res.status(500).send("Error al conectar con MercadoLibre");
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
            const cuenta = await Cuenta.findOne({ _id: cuentaId, tenantId });
            if (cuenta) {
                cuenta.mercadolibre = undefined;
                await cuenta.save();
            }
        } else {
            await Tenant.findByIdAndUpdate(tenantId, {
                $unset: { mercadolibre: 1 }
            });
        }
        
        res.json({ message: "Disconnected successfully" });
    } catch (e) {
        console.error("Error disconnecting MELI:", e);
        res.status(500).json({ error: "Failed to disconnect" });
    }
};

export const sync = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId;
    const { cuentaId } = req.body;

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
    }

    try {
        let accessToken;
        let sellerId; 

        if (cuentaId) {
             const cuenta = await Cuenta.findOne({ _id: cuentaId, tenantId });
             if (!cuenta || !cuenta.mercadolibre?.accessToken) {
                 return res.status(404).json({ error: "Cuenta not connected" });
             }
             accessToken = cuenta.mercadolibre.accessToken;
             sellerId = cuenta.mercadolibre.sellerId;
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

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
    }

    try {
        // Aggregation for Total Orders and Revenue
        const totalStats = await Order.aggregate([
            { $match: { 
                tenantId: new mongoose.Types.ObjectId(tenantId),
                // Exclude cancelled sales from even counting? Maybe. 
                // Usually dashboard shows Volume. Let's keep it simple.
            }},
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
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
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
                tenantId: new mongoose.Types.ObjectId(tenantId),
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
            }))
        });

    } catch (e) {
        console.error("Error fetching dashboard stats:", e);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};


