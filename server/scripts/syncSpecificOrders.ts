
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order.js';
import { handleNotification } from '../src/services/meliService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const sync = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
        
        const ids = ["2000015109934514", "2000015109897110"];
        
        for (const meliId of ids) {
            console.log(`\nSyncing Order: ${meliId}...`);
            const order = await Order.findOne({ meliId });
            
            if (!order) {
                console.error(`❌ Order ${meliId} not found in DB! Cannot identify tenant.`);
                continue;
            }
            
            const tenantId = order.tenantId.toString();
            // We pass resource string as '/orders/{meliId}'
            const resource = `/orders/${meliId}`;
            
            try {
                const clientId = order.clientId ? order.clientId.toString() : undefined;
                
                await handleNotification("orders_v2", resource, tenantId, clientId);
                console.log(`✅ Sync triggered successfully.`);
            } catch (err) {
                console.error(`❌ Failed to sync order ${meliId}:`, err);
            }
        }
        
        console.log("\n--- Verification ---");
        // Verify update
        const updatedOrders = await Order.find({ meliId: { $in: ids } });
        updatedOrders.forEach(o => {
             console.log(`- ID: ${o.meliId} | New Logistics: ${o.logisticsStatus} | New Shipping: ${o.shipping?.status}`);
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

sync();
