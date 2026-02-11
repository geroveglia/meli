import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { handleNotification } from '../src/services/meliService.js';
import { Tenant } from '../src/models/Tenant.js';

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

const main = async () => {
    await connectDB();

    const tenant = await Tenant.findOne({ 'mercadolibre.sellerId': { $exists: true } });
    
    if (!tenant || !tenant.mercadolibre) {
        console.error("❌ No tenant with MELI connection found.");
        process.exit(1);
    }

    const { accessToken, sellerId } = tenant.mercadolibre;

    console.log(`🔍 Fetching orders for Seller: ${sellerId}...`);

    try {
        const response = await fetch(`https://api.mercadolibre.com/orders/search?seller=${sellerId}&sort=date_desc`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error(`❌ API Error: ${response.status} ${response.statusText}`);
            console.log(await response.text());
            process.exit(1);
        }

        const data = await response.json();
        const orders = data.results || [];

        console.log(`📦 Found ${orders.length} orders in MercadoLibre. Syncing to Lumba...`);

        if (orders.length > 0) {
            console.log("------------------------------------------------");
            for (const o of orders) {
                console.log(`🔄 Syncing Order ID: ${o.id}...`);
                // Manually trigger the webhook logic for this order
                await handleNotification("orders_v2", `/orders/${o.id}`, String(tenant._id));
            }
            console.log("------------------------------------------------");
            console.log("✅ Sync completed! Check 'Ventas' page.");
        }
    } catch (error) {
        console.error("❌ Network/Script Error:", error);
    }

    // Allow mongoose to flush and close
    setTimeout(() => {
        console.log("Bye.");
        process.exit(0);
    }, 2000);
};

main();
