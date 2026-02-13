
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';

dotenv.config({ path: '.env.development' });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const order = await Order.findOne({ meliId: "2000015109753534" });
        // Also log tags
        if (order) {
            console.log("Order Found:");
            console.log(JSON.stringify({
                id: order.meliId,
                payment: order.payment,
                shipping: order.shipping,
                salesStatus: order.salesStatus,
                logisticsStatus: order.logisticsStatus,
                tags: order.tags // Show tags
            }, null, 2));
        } else {
            console.log("Order not found in DB");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
