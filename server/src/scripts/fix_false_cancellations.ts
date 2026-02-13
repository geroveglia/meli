
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { handleNotification } from '../services/meliService.js';
import { Order } from '../models/Order.js';

dotenv.config({ path: '.env.development' });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        // Find orders that are marked as cancelled but have 'pending' or 'delivered' or 'shipped' shipping status
        // AND payment status 'paid' just to be safe (unless cancelled payment implies cancelled sale)
        // Actually, just target 'shipping.status' != 'cancelled' AND != 'not_delivered'
        const ordersToFix = await Order.find({ 
            salesStatus: 'venta_cancelada',
            "shipping.status": { $nin: ['cancelled', 'not_delivered'] } // If shipping is valid, verify logic
        });

        console.log(`Found ${ordersToFix.length} orders to potentially fix.`);

        for (const order of ordersToFix) {
            console.log(`Syncing order ${order.meliId} (Current Shipping: ${order.shipping?.status})...`);
            try {
                await handleNotification(
                    'orders_v2', 
                    `/orders/${order.meliId}`, 
                    order.tenantId.toString(), 
                    order.clientId?.toString()
                );
            } catch (err) {
                console.error(`Failed to sync ${order.meliId}:`, err);
            }
        }

        console.log("Bulk sync complete.");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
