
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
        const order = await Order.findOne({ meliId: "999000111" });
        if (order) {
            console.log(JSON.stringify(order.toJSON(), null, 2));
        } else {
            console.log("Order 999000111 not found.");
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

verify();
