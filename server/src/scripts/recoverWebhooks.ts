import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from '../models/Tenant.js';
import { Cuenta } from '../models/Cuenta.js';
import { recoverMissedFeeds, refreshAccessToken } from '../services/meliService.js';

dotenv.config({ path: '.env.development' });

// Helper: ensures a valid (non-expired) access token, refreshing if needed
const getValidToken = async (
    accessToken: string,
    refreshToken: string,
    expiresAt: number | Date | undefined,
    appId: string,
    clientSecret: string,
    saveNewTokens: (tokens: { accessToken: string; refreshToken: string; expiresAt: Date }) => Promise<void>
): Promise<string | null> => {
    const expiresMs = expiresAt instanceof Date ? expiresAt.getTime() : (expiresAt ?? 0);
    
    if (expiresMs > Date.now()) {
        return accessToken; // Still valid
    }

    // Token expired — refresh it
    try {
        console.log('[Missed Feeds] Token expired, refreshing...');
        const newTokens = await refreshAccessToken(refreshToken, appId, clientSecret);
        await saveNewTokens(newTokens);
        console.log('[Missed Feeds] Token refreshed successfully.');
        return newTokens.accessToken;
    } catch (e) {
        console.error('[Missed Feeds] Failed to refresh token:', e);
        return null;
    }
};

export const runRecoverWebhooks = async () => {
    try {
        console.log('[Missed Feeds] Starting webhook recovery process...');
        
        // 1. Recover for Cuentas (Clients)
        const cuentas = await Cuenta.find({ 'mercadolibre.accessToken': { $exists: true } });
        console.log(`[Missed Feeds] Found ${cuentas.length} Cuentas connected to MELI.`);
        
        for (const cuenta of cuentas) {
            if (!cuenta.tenantId) continue;
            
            const tenant = await Tenant.findById(cuenta.tenantId);
            if (!tenant || !tenant.mercadolibre?.appId || !tenant.mercadolibre?.clientSecret) {
                console.warn(`[Missed Feeds] Tenant, AppId or ClientSecret missing for Cuenta ${cuenta._id}`);
                continue;
            }

            if (cuenta.mercadolibre && cuenta.mercadolibre.accessToken && cuenta.mercadolibre.refreshToken) {
                const validToken = await getValidToken(
                    cuenta.mercadolibre.accessToken,
                    cuenta.mercadolibre.refreshToken,
                    cuenta.mercadolibre.expiresAt,
                    tenant.mercadolibre.appId,
                    tenant.mercadolibre.clientSecret,
                    async (newTokens) => {
                        cuenta.mercadolibre = {
                            ...cuenta.mercadolibre!,
                            accessToken: newTokens.accessToken,
                            refreshToken: newTokens.refreshToken,
                            expiresAt: newTokens.expiresAt.getTime()
                        };
                        await cuenta.save();
                    }
                );

                if (validToken) {
                    await recoverMissedFeeds(
                        tenant._id.toString(),
                        cuenta._id.toString(),
                        validToken,
                        tenant.mercadolibre.appId
                    );
                }
            }
        }

        // 2. Recover for Tenants (Legacy / Single Account)
        const tenants = await Tenant.find({ 'mercadolibre.accessToken': { $exists: true }, 'mercadolibre.appId': { $exists: true } });
        console.log(`[Missed Feeds] Found ${tenants.length} Tenants connected to MELI directly.`);
        
        for (const tenant of tenants) {
            if (tenant.mercadolibre && tenant.mercadolibre.accessToken && tenant.mercadolibre.refreshToken && tenant.mercadolibre.appId && tenant.mercadolibre.clientSecret) {
                const validToken = await getValidToken(
                    tenant.mercadolibre.accessToken,
                    tenant.mercadolibre.refreshToken,
                    tenant.mercadolibre.expiresAt,
                    tenant.mercadolibre.appId,
                    tenant.mercadolibre.clientSecret,
                    async (newTokens) => {
                        tenant.mercadolibre = {
                            ...tenant.mercadolibre!,
                            accessToken: newTokens.accessToken,
                            refreshToken: newTokens.refreshToken,
                            expiresAt: newTokens.expiresAt
                        };
                        await tenant.save();
                    }
                );

                if (validToken) {
                    await recoverMissedFeeds(
                        tenant._id.toString(),
                        undefined,
                        validToken,
                        tenant.mercadolibre.appId
                    );
                }
            }
        }

        console.log('[Missed Feeds] Webhook recovery process completed.');
    } catch (e) {
        console.error('[Missed Feeds] Error in recovery script:', e);
    }
};

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        await runRecoverWebhooks();

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

// Only run standalone if executed directly (not imported)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    run();
}
