
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
        
        const collection = mongoose.connection.collection('tenants');
        const all = await collection.find({}).toArray();
        
        console.log("Native Tenant Data:");
        all.forEach(t => {
            const m = t.mercadolibre;
            if (m) {
                console.log(`- ${t.name}: sellerId = ${m.sellerId} (Type: ${typeof m.sellerId})`);
            } else {
                console.log(`- ${t.name}: No MELI`);
            }
        });
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

debug();
