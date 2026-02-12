
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order.js';
import { handleNotification } from '../src/services/meliService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const syncRecent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
        
        // Find orders from last 48 hours
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        const recentOrders = await Order.find({ 
            lastUpdated: { $gte: twoDaysAgo } 
        });
        
        console.log(`Found ${recentOrders.length} recent orders to sync.`);
        
        for (const order of recentOrders) {
            const meliId = order.meliId;
            const tenantId = order.tenantId.toString();
            const clientId = order.clientId ? order.clientId.toString() : null;
            const resource = `/orders/${meliId}`;
            
            console.log(`Syncing ${meliId}...`);
            try {
                // Call handleNotification to update order from MELI
                await handleNotification("orders_v2", resource, tenantId, clientId);
            } catch (err) {
                console.error(`Status sync failed for ${meliId}:`, err);
            }
        }
        
        console.log("✅ Sync complete.");
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

syncRecent();
