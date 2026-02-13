
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';

dotenv.config({ path: '.env.development' }); // Adjust path if needed

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        // Count orders by status
        const paymentCounts = await Order.aggregate([
            { $group: { _id: "$payment.status", count: { $sum: 1 } } }
        ]);
        console.log('Orders by Payment Status:', paymentCounts);

        // Count orders by MeLi Shipping Status
        const shippingCounts = await Order.aggregate([
            { $group: { _id: "$shipping.status", count: { $sum: 1 } } }
        ]);
        console.log('Orders by Shipping Status (MeLi):', shippingCounts);

        const shippingSubstatusCounts = await Order.aggregate([
            { $group: { _id: "$shipping.substatus", count: { $sum: 1 } } }
        ]);
        console.log('Orders by Shipping Substatus (MeLi):', shippingSubstatusCounts);

        // List recent orders
        const recent = await Order.find().sort({ lastUpdated: -1 }).limit(20);
        console.log('\nRecent 20 Orders:');
        console.table(recent.map(o => ({
            meliId: o.meliId,
            payment: o.payment.status,
            shippingComp: o.shipping?.status, // MeLi Status
            substatus: o.shipping?.substatus || 'N/A', // MeLi Substatus
            tags: o.tags ? o.tags.join(',') : '', // Tags
            logistics: o.logisticsStatus, // Internal Logistics Status (requested if not MeLi)
            date: o.lastUpdated ? o.lastUpdated.toISOString().split('T')[0] : 'N/A'
        })));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
