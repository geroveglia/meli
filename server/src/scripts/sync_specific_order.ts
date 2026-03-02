
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

        const orderId = "2000015360333956";
        const order = await Order.findOne({ meliId: orderId });
        
        if (!order) throw new Error("Order not found");

        console.log("Syncing order:", orderId, "Tenant:", order.tenantId);
        
        // Trigger simulation/sync
        await handleNotification('orders_v2', `/orders/${orderId}`, order.tenantId.toString(), order.clientId?.toString());

        console.log("Sync complete.");

        // Check new status
        const updatedOrder = await Order.findOne({ meliId: orderId });
        console.log("New Status:", updatedOrder?.shipping?.status);
        console.log("New Sales Status:", updatedOrder?.salesStatus);
        console.log("New Logistics Status:", updatedOrder?.logisticsStatus);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
