
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const audit = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
        
        console.log("--- Audit Start ---");
        
        // 1. Find inconsistencies
        const inconsistent = await Order.find({
            "shipping.status": "delivered",
            logisticsStatus: { $ne: "entregado" }
        });
        
        console.log(`Found ${inconsistent.length} inconsistent orders (Delivered but not Entregado).`);
        inconsistent.forEach(o => {
            console.log(`- ID: ${o.meliId} | Logistics: ${o.logisticsStatus} | Shipping: ${o.shipping?.status} | Date: ${o.dateCreated}`);
        });

        // 2. Check for specific IDs from screenshot
        const ids = ["2000015109934514", "2000015109897110"];
        const specific = await Order.find({ meliId: { $in: ids } });
        console.log(`\n--- Specific Check ---`);
        if (specific.length === 0) {
            console.log("Specific orders NOT FOUND in DB.");
        } else {
            specific.forEach(o => {
                console.log(`- ID: ${o.meliId} | Logistics: ${o.logisticsStatus} | Shipping: ${o.shipping?.status}`);
            });
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

audit();
