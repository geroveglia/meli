
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../src/models/Order.js';

dotenv.config({ path: '.env.development' });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lumba');
        console.log("Connected to DB");

        const orders = await Order.find().sort({ dateCreated: -1 }).limit(5);
        
        console.log("--- LATEST 5 ORDERS ---");
        orders.forEach(o => {
            console.log({
                id: o._id,
                meliId: o.meliId,
                tenantId: o.tenantId,
                clientId: o.clientId,
                buyer: o.buyer.nickname,
                date: o.dateCreated
            });
        });
        
        console.log("-----------------------");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
