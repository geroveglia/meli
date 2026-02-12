
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
        
        const sellerId = 249684738;
        console.log(`Searching for Tenant with sellerId: ${sellerId} (Type: ${typeof sellerId})`);

        const tenant = await Tenant.findOne({ 'mercadolibre.sellerId': sellerId });
        
        if (tenant) {
            console.log("✅ Found Tenant:", tenant.name, tenant._id);
            console.log("SellerId in DB:", tenant.mercadolibre?.sellerId, "Type:", typeof tenant.mercadolibre?.sellerId);
        } else {
            console.log("❌ No Tenant found!");
            
            // Try matching as string?
            const tenantStr = await Tenant.findOne({ 'mercadolibre.sellerId': String(sellerId) });
            if (tenantStr) {
                console.log("✅ Found Tenant via String Query!", tenantStr.name);
            }

            // List all tenants with mercadolibre
            const all = await Tenant.find({ 'mercadolibre': { $exists: true } });
            console.log("All Tenants with MELI:");
            all.forEach(t => {
                console.log(`- ${t.name}: ${t.mercadolibre?.sellerId} (Type: ${typeof t.mercadolibre?.sellerId})`);
            });
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

debug();
