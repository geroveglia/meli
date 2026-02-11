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

    try {
        const response = await fetch(`${API_URL}/api/v1/meli/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: "orders_v2",
                resource: "/orders/test-order",
                user_id: 249684738, // Real Seller ID found in DB
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
