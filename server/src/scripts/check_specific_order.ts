
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';
import { Tenant } from '../models/Tenant.js';
import { Cuenta } from '../models/Cuenta.js';

dotenv.config({ path: '.env.development' });

const ORDER_ID = "2000015134282302";

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const order = await Order.findOne({ meliId: ORDER_ID });
        if (!order) {
            console.error("Order not found in DB");
            return;
        }

        console.log("DB Order Status:", order.payment.status);

        // Fetch from MeLi
        let accessToken = "";
        
        if (order.clientId) {
            const cuenta = await Cuenta.findById(order.clientId);
            if (cuenta && cuenta.mercadolibre) {
                 accessToken = cuenta.mercadolibre.accessToken;
            }
        } else {
            const tenant = await Tenant.findById(order.tenantId);
             if (tenant && tenant.mercadolibre) {
                 accessToken = tenant.mercadolibre.accessToken;
            }
        }

        if (!accessToken) {
            console.error("Could not find access token");
            return;
        }

        console.log("Fetching from MeLi...");
        const response = await fetch(`https://api.mercadolibre.com/orders/${ORDER_ID}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            console.error("MeLi API Error:", response.status, await response.text());
            return;
        }

        const meliData = await response.json();
        console.log("MeLi Current Status:", meliData.status);
        
        const fs = await import('fs');
        fs.writeFileSync('meli_order_full.json', JSON.stringify(meliData, null, 2));
        console.log("Dumped full MeLi response to meli_order_full.json");

        if (meliData.mediations && meliData.mediations.length > 0) {
            console.log("Fetching Mediation/Claim...");
            for (const m of meliData.mediations) {
                // Try claims API
                const claimRes = await fetch(`https://api.mercadolibre.com/post-purchase/v1/claims/${m.id}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (claimRes.ok) {
                    const claimData = await claimRes.json();
                    console.log(`Claim ${m.id} Status:`, claimData.status);
                    console.log(`Claim ${m.id} Stage:`, claimData.stage);
                    console.log(`Claim ${m.id} Resolution:`, claimData.resolution);
                } else {
                     console.log(`Failed to fetch claim ${m.id}: ${claimRes.status}`);
                     // Try old mediation API
                     const medRes = await fetch(`https://api.mercadolibre.com/mediations/${m.id}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (medRes.ok) {
                        const medData = await medRes.json();
                        console.log(`Mediation ${m.id} Status:`, medData.status);
                    } else {
                        console.log(`Failed to fetch mediation ${m.id}: ${medRes.status}`);
                    }
                }
            }
        } else {
            console.log("No mediations found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
