
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

        const orderId = "2000015397632216";
        const order = await Order.findOne({ meliId: orderId });
        
        if (!order) throw new Error("Order not found");

        console.log("Triggering sync for order:", orderId);
        
        // The handleNotification function logs "Order Data: ..." in debug log, 
        // but we want to see it here or in the log file.
        // We will run this and then check the server_debug.log or console output if it logs there.
        // Actually, meliService logs to console.log as well "Order ... updated".
        // To get the RAW data, I might need to modify meliService temporarily or trust the logs.
        // For now, let's just run it and see if the status changes.
        
        await handleNotification('orders_v2', `/orders/${orderId}`, order.tenantId.toString(), order.clientId?.toString());

        console.log("Sync complete. Checking final state...");

        const updatedOrder = await Order.findOne({ meliId: orderId });
        if(updatedOrder) {
             console.log("Updated Order State:");
             console.log(`Payment: ${updatedOrder.payment.status}`);
             console.log(`Shipping Status: ${updatedOrder.shipping?.status}`);
             console.log(`Shipping ID: ${updatedOrder.shipping?.id}`);
             console.log(`Sales Status: ${updatedOrder.salesStatus}`);
             console.log(`Logistics Status: ${updatedOrder.logisticsStatus}`);
             console.log(`Shipping Mode: ${updatedOrder.shippingMode}`);
             console.log(`Tags: ${updatedOrder.tags?.join(', ')}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
