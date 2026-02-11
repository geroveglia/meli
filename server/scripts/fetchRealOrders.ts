import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { handleNotification } from '../src/services/meliService.js';
import { Tenant } from '../src/models/Tenant.js';
import { Cuenta } from '../src/models/Cuenta.js';

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

const syncAccount = async (name: string, accessToken: string, sellerId: number, tenantId: string, clientId?: string) => {
    console.log(`\n🔍 Fetching orders for ${name} (Seller: ${sellerId})...`);

    try {
        const response = await fetch(`https://api.mercadolibre.com/orders/search?seller=${sellerId}&sort=date_desc`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error(`❌ API Error for ${name}: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        const orders = data.results || [];

        console.log(`📦 Found ${orders.length} orders for ${name}. Syncing to Lumba...`);

        if (orders.length > 0) {
            console.log("------------------------------------------------");
            for (const o of orders) {
                console.log(`🔄 Syncing Order ID: ${o.id}...`);
                await handleNotification("orders_v2", `/orders/${o.id}`, String(tenantId), clientId ? String(clientId) : undefined);
            }
            console.log("------------------------------------------------");
        }
    } catch (error) {
        console.error(`❌ Network/Script Error for ${name}:`, error);
    }
};

const main = async () => {
    await connectDB();

    console.log("🔄 Starting Sync for ALL connected accounts...");

    // 1. Sync All Clients (Cuentas)
    const cuentas = await Cuenta.find({ 'mercadolibre.sellerId': { $exists: true } });
    console.log(`ℹ️ Found ${cuentas.length} connected Clients.`);

    for (const cuenta of cuentas) {
        if (cuenta.mercadolibre && cuenta.mercadolibre.accessToken) {
            await syncAccount(
                `Client: ${cuenta.name}`,
                cuenta.mercadolibre.accessToken,
                cuenta.mercadolibre.sellerId!,
                String(cuenta.tenantId),
                String(cuenta._id)
            );
        }
    }

    // 2. Sync Tenant (if connected independently)
    const tenant = await Tenant.findOne({ 'mercadolibre.sellerId': { $exists: true } });
    if (tenant && tenant.mercadolibre && tenant.mercadolibre.accessToken) {
         // Only sync if this sellerId isn't already covered by a client (to avoid double sync if tenant == client account physically)
         // Actually, double sync is fine, logic handles upsert.
         console.log(`ℹ️ Found connected Tenant: ${tenant.name}`);
         await syncAccount(
            `Tenant: ${tenant.name}`,
            tenant.mercadolibre.accessToken,
            tenant.mercadolibre.sellerId!,
            String(tenant._id),
            undefined // No client ID for tenant-level orders
        );
    }

    console.log("\n✅ Global Sync completed! Check 'Ventas' page.");

    // Allow mongoose to flush and close
    setTimeout(() => {
        console.log("Bye.");
        process.exit(0);
    }, 2000);
};

main();
