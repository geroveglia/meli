import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const API_URL = process.env.API_URL || "http://localhost:8081";

const main = async () => {
    console.log(`Sending webhook simulation to: ${API_URL}`);

    // Connect to DB to get a valid sellerId
    const mongoose = (await import('mongoose')).default;
    const { Tenant } = await import('../src/models/Tenant.js');
    
    await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
    
    const tenant = await Tenant.findOne({ 'mercadolibre.sellerId': { $exists: true } });
    if (!tenant || !tenant.mercadolibre?.sellerId) {
        console.error("❌ No tenant with MELI connection found in DB.");
        process.exit(1);
    }
    
    const sellerId = tenant.mercadolibre.sellerId;
    console.log(`Using Seller ID: ${sellerId} from Tenant: ${tenant.name}`);

    try {
        const response = await fetch(`${API_URL}/api/v1/meli/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: "orders_v2",
                resource: "/orders/test-order",
                user_id: sellerId,
                application_id: 12345
            })
        });

        if (response.ok) {
            console.log("✅ Simulation sent successfully!");
            console.log("Check your 'Ventas' page in the App.");
        } else {
            console.error(`❌ Failed: ${response.status} ${response.statusText}`);
            console.log(await response.text());
        }
    } catch (error) {
        console.error("❌ Error sending request:", error);
    }
};

main();
