import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import { User } from './src/models/User.js';

async function run() {
    try {
        const uri = process.env.MONGO_URI;
        const dbName = 'meli_development';
        
        console.log("Connecting to:", uri ? "Loaded" : "Missing");
        await mongoose.connect(uri as string, { dbName });
        
        console.log("Connected specifically to", mongoose.connection.name);
        
        const emails = ['vegliageronimo@gmail.com', 'gero.veglia@outlook.com'];
        const result = await User.deleteMany({ email: { $in: emails } });
        
        console.log(`Deleted ${result.deletedCount} ghost users.`);
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
