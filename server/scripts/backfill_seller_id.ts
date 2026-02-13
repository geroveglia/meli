import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import { Order } from "../src/models/Order.js";
import { Tenant } from "../src/models/Tenant.js";
import { Cuenta } from "../src/models/Cuenta.js";
import { refreshAccessToken } from "../src/services/meliService.js";

dotenv.config({ path: ".env.development" });

const logFile = "backfill.log";
const log = (msg: string) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + "\n");
};

fs.writeFileSync(logFile, "Starting backfill...\n");

const MELI_API_URL = "https://api.mercadolibre.com";

const fetchMeliOrder = async (orderId: string, accessToken: string) => {
    const response = await fetch(`${MELI_API_URL}/orders/${orderId}`, {
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });
    if (!response.ok) throw new Error(`Failed to fetch order ${orderId}: ${response.statusText}`);
    return response.json();
};

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb://localhost:27017/";
        const dbName = process.env.MONGO_DB_NAME || "lumba";
        
        console.log(`Connecting to MongoDB... (DB: ${dbName})`);
        await mongoose.connect(uri, { dbName });
        console.log("Connected to MongoDB");

        // Debug: Check one order
        const sampleOrder = await Order.findOne({});
        console.log("Sample Order:", JSON.stringify(sampleOrder, null, 2));

        const orders = await Order.find({ 
            $or: [
                { sellerId: { $exists: false } }, 
                { sellerId: null }
            ] 
        });
        console.log(`Found ${orders.length} orders without sellerId`);

        // Load all available tokens
        const connectedCuentas = await Cuenta.find({ 
            'mercadolibre.accessToken': { $exists: true, $ne: null } 
        });
        const connectedTenants = await Tenant.find({
            'mercadolibre.accessToken': { $exists: true, $ne: null }
        });

        const tokenPool = [
            ...connectedCuentas.map(c => ({ token: c.mercadolibre!.accessToken, name: `Cuenta ${c.name}`, type: 'cuenta', id: c._id })),
            ...connectedTenants.map(t => ({ token: t.mercadolibre!.accessToken, name: `Tenant ${t.name || t._id}`, type: 'tenant', id: t._id }))
        ];

        console.log(`Found ${tokenPool.length} potential tokens:`);
        tokenPool.forEach(t => console.log(` - ${t.name} (${t.id})`));

        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const order of orders) {
            try {
                let meliOrder = null;
                let usedToken = null;

                // 1. Try direct token (if linked)
                if (order.clientId) {
                     const directAccount = connectedCuentas.find(c => c._id.toString() === order.clientId?.toString());
                     if (directAccount) {
                         // console.log(`Trying direct token for Client ${directAccount.name}`);
                         try {
                             meliOrder = await fetchMeliOrder(order.meliId, directAccount.mercadolibre!.accessToken);
                             usedToken = directAccount.mercadolibre!.accessToken;
                         } catch (e: any) { 
                             console.log(`Direct token failed: ${e.message}`);
                         }
                     } else {
                         // console.log(`Order has clientId ${order.clientId} but account not in connected pool`);
                     }
                }

                // ...

                // 3. If still not found, try POOL
                if (!meliOrder) {
                    // console.log(`Attempting to recover order ${order.meliId} using token pool...`);
                    for (const candidate of tokenPool) {
                        try {
                            meliOrder = await fetchMeliOrder(order.meliId, candidate.token);
                            if (meliOrder) {
                                console.log(`Recovered order ${order.meliId} using token from ${candidate.name}`);
                                usedToken = candidate.token;
                                break;
                            }
                        } catch (e: any) { 
                             // Log only if not 404
                             if (e.message.includes("401") || e.message.includes("403") || e.message.includes("Unauthorized") || e.message.includes("Forbidden")) {
                                 console.log(`Token from ${candidate.name} failed for order ${order.meliId}: ${e.message}`);
                                 
                                 // Try Refresh
                                 if (e.message.includes("401") || e.message.includes("Unauthorized")) {
                                     console.log(`Attempting to refresh token for ${candidate.name}...`);
                                     try {
                                         // We need refreshToken. Fetch from DB again to be sure (or add to pool)
                                         let refreshToken = "";
                                         const poolItem = candidate; 
                                         // fetch from DB
                                         if (poolItem.type === 'cuenta') {
                                             const c = await Cuenta.findById(poolItem.id);
                                             refreshToken = c?.mercadolibre?.refreshToken || "";
                                         } else {
                                             const t = await Tenant.findById(poolItem.id);
                                             refreshToken = t?.mercadolibre?.refreshToken || "";
                                         }
                                         
                                         if (refreshToken) {
                                             const newTokens = await refreshAccessToken(refreshToken);
                                             console.log(`Token refreshed for ${candidate.name}. Retrying fetch...`);
                                             
                                             // Save to DB
                                             if (poolItem.type === 'cuenta') {
                                                 await Cuenta.findByIdAndUpdate(poolItem.id, {
                                                     'mercadolibre.accessToken': newTokens.accessToken,
                                                     'mercadolibre.refreshToken': newTokens.refreshToken,
                                                     'mercadolibre.expiresAt': newTokens.expiresAt.getTime()
                                                 });
                                             } else {
                                                  await Tenant.findByIdAndUpdate(poolItem.id, {
                                                     'mercadolibre.accessToken': newTokens.accessToken,
                                                     'mercadolibre.refreshToken': newTokens.refreshToken,
                                                     'mercadolibre.expiresAt': newTokens.expiresAt
                                                 });
                                             }
                                             
                                             // Retry fetch
                                             meliOrder = await fetchMeliOrder(order.meliId, newTokens.accessToken);
                                             if (meliOrder) {
                                                 console.log(`Recovered order ${order.meliId} using REFRESHED token from ${candidate.name}`);
                                                 usedToken = newTokens.accessToken;
                                                 break;
                                             }
                                         }
                                     } catch (refreshErr: any) {
                                         console.log(`Refresh failed for ${candidate.name}: ${refreshErr.message}`);
                                     }
                                 }
                             }
                        }
                    }
                }

                if (!meliOrder) {
                    console.warn(`Skipping order ${order.meliId}: No working token found in pool.`);
                    skippedCount++;
                    continue;
                }

                const sellerId = meliOrder.seller.id;

                if (sellerId) {
                    order.sellerId = sellerId;
                    
                    // Link Client matches sellerId
                    if (!order.clientId) {
                         const match = connectedCuentas.find(c => c.mercadolibre?.sellerId === sellerId);
                         if (match) {
                             order.clientId = match._id as any;
                             // Verify tenant? order.tenantId = match.tenantId;
                             console.log(`Linked order ${order.meliId} to Cuenta ${match.name}`);
                         } else {
                             // Maybe it belongs to the Tenant itself (if single account)
                             const matchTenant = connectedTenants.find(t => t.mercadolibre?.sellerId === sellerId);
                             if (matchTenant) {
                                 // It's a tenant order (no specific client)
                                 console.log(`Linked order ${order.meliId} to Tenant`);
                                 // Ensure tenantId matches?
                             }
                         }
                    }
                    
                    await order.save();
                    // console.log(`Updated order ${order.meliId} with sellerId ${sellerId}`);
                    successCount++;
                }

            } catch (err: any) {
                // console.error(`Error processing order ${order.meliId}:`, err.message);
                errorCount++;
            }
        }

        console.log(`Backfill complete. Success: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
        process.exit(0);

    } catch (error) {
        console.error("Script failed:", error);
        process.exit(1);
    }
};

run();
