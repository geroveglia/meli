import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Order } from '../src/models/Order.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, {
            dbName: process.env.MONGO_DB_NAME
        });
        console.log(`✅ MongoDB connected to ${process.env.MONGO_DB_NAME}`);
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
};

const checkState = async () => {
    await connectDB();

    console.log("\n🔍 Checking Tenants...");
    const tenants = await Tenant.find({});
    
    if (tenants.length === 0) {
        console.log("⚠️ No tenants found!");
    } else {
        tenants.forEach(t => {
            console.log(`Tenant: ${t.name} (${t.slug})`);
            if (t.mercadolibre && t.mercadolibre.sellerId) {
                console.log(`  ✅ MELI Connected! Seller ID: ${t.mercadolibre.sellerId}`);
                console.log(`  👤 Nickname: ${t.mercadolibre.nickname}`);
            } else {
                console.log(`  ❌ MELI NOT Connected (No sellerId)`);
            }
        });
    }

    console.log("\n🔍 Checking Orders...");
    const orders = await Order.find({});
    console.log(`📦 Total Orders found: ${orders.length}`);
    
    orders.forEach(o => {
        console.log(`  - Order MELI ID: ${o.meliId} | Sales: ${o.salesStatus} | Logistics: ${o.logisticsStatus} | Payment: ${o.payment.status}`);
    });

    process.exit();
};

checkState();
