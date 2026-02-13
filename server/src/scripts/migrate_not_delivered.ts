
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

        const result = await Order.updateMany(
            { 
                $or: [
                    { "shipping.status": "cancelled" },
                    { "shipping.status": "not_delivered" }
                ],
                $or: [
                    { salesStatus: { $ne: "venta_cancelada" } },
                    { logisticsStatus: { $ne: "cancelado_vuelto_stock" } }
                ]
            },
            {
                $set: {
                    salesStatus: "venta_cancelada",
                    logisticsStatus: "cancelado_vuelto_stock"
                }
            }
        );

        console.log(`Matched ${result.matchedCount} orders.`);
        console.log(`Modified ${result.modifiedCount} orders.`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
