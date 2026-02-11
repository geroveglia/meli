
import { Request, Response } from "express";
import { getAuthUrl, authorize, handleNotification } from "../services/meliService.js";
import { Tenant } from "../models/Tenant.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

// Helper to encode state
const encodeState = (tenantId: string) => {
    return Buffer.from(JSON.stringify({ tenantId, nonce: Date.now() })).toString('base64');
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

    const state = encodeState(tenantId);
    
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

    const { tenantId } = decoded;

    try {
        const apiUrl = process.env.API_URL || `https://${req.get('host')}`;
        const redirectUri = `${apiUrl}/api/v1/meli/callback`;

        const tokenData = await authorize(code, redirectUri);

        // Update Tenant
        await Tenant.findByIdAndUpdate(tenantId, {
            mercadolibre: {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken,
                expiresAt: tokenData.expiresAt,
                sellerId: tokenData.sellerId,
                nickname: tokenData.nickname
            }
        });

        // Redirect to Frontend
        // Ideally, we redirect to a success page on the frontend
        // We know the frontend URL from CORS_ORIGIN or hardcoded
        const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || "http://localhost:5173";
        res.redirect(`${frontendUrl}/admin/integrations?status=success`);

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

        // Find tenant by sellerId
        const tenant = await Tenant.findOne({ 'mercadolibre.sellerId': user_id });
        
        if (!tenant) {
            console.warn(`[MELI Webhook] No tenant found for sellerId ${user_id}`);
            return;
        }

        await handleNotification(topic, resource, String(tenant._id));

    } catch (e) {
        console.error("Error processing webhook:", e);
        // Even if we fail processing, we already sent 200 OK. 
        // Even if we fail processing, we already sent 200 OK. 
        // Logic failure should be logged.
    }
};

export const disconnect = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenantId;

    if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID not found" });
    }

    try {
        await Tenant.findByIdAndUpdate(tenantId, {
            $unset: { mercadolibre: 1 }
        });
        res.json({ message: "Disconnected successfully" });
    } catch (e) {
        console.error("Error disconnecting MELI:", e);
        res.status(500).json({ error: "Failed to disconnect" });
    }
};
