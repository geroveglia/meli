
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

        const orders = await Order.find({ 
            meliId: { $in: ["2000015109663342", "2000015135721860"] } 
        });

        const fs = await import('fs');
        // valid orders variable already exists from line 14
        
        const output = orders.map(o => ({
            id: o.meliId,
            payment: o.payment.status,
            shippingStatus: o.shipping?.status,
            shippingSubstatus: o.shipping?.substatus,
            logistics: o.logisticsStatus,
            sales: o.salesStatus,
            fullShipping: o.shipping
        }));

        fs.writeFileSync('defect_orders.json', JSON.stringify(output, null, 2));
        console.log("Written to defect_orders.json");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
