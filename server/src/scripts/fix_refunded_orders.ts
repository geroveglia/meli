import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';

dotenv.config({ path: '.env.development' }); // Or .env depending on env

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '', {
            dbName: process.env.MONGO_DB_NAME,
        });
        console.log('Connected to DB');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const backfillRefundedOrders = async () => {
    await connectDB();

    try {
        const query = {
            'payment.status': { $in: ['partially_refunded', 'refunded'] },
            // Only update if not already cancelled/returned/unpacked
            logisticsStatus: { $nin: ['cancelado_vuelto_stock', 'devolucion_vuelto_stock'] } 
        };

        const count = await Order.countDocuments(query);
        console.log(`Found ${count} orders to update.`);

        if (count > 0) {
            const result = await Order.updateMany(query, {
                $set: {
                    logisticsStatus: 'cancelado_vuelto_stock', // Or distinct based on logic, but user said "cancelados"
                    salesStatus: 'venta_cancelada',
                    // lastUpdated: new Date() // Maybe update?
                }
            });
            console.log(`Updated ${result.modifiedCount} orders.`);
        }

    } catch (error) {
        console.error("Error backfilling:", error);
    } finally {
        await mongoose.disconnect();
    }
};

backfillRefundedOrders();
