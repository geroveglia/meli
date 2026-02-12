
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
        
        const ids = ["2000015109934514", "2000015109897110"];
        console.log(`Checking for orders: ${ids.join(', ')}`);

        const orders = await Order.find({ meliId: { $in: ids } });
        
        if (orders.length === 0) {
            console.log("❌ No orders found with these IDs.");
        } else {
            orders.forEach(o => {
                console.log(`✅ Found Order ${o.meliId}:`);
                console.log(`   - LogisticsStatus: ${o.logisticsStatus}`);
                console.log(`   - MeliStatus: ${o.shipping?.status}`);
                console.log(`   - InternalId: ${o._id}`);
            });
        }
        
        const count = await Order.countDocuments({});
        console.log(`Total orders in DB: ${count}`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
