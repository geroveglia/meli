import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

async function removeGhostUsers() {
    try {
        await mongoose.connect(env.MONGO_URI, {
            dbName: env.MONGO_DB_NAME,
        });
        console.log('✅ Connected to DB');

        const emailsToDelete = ['vegliageronimo@gmail.com', 'gero.veglia@outlook.com'];
        
        const result = await User.deleteMany({ email: { $in: emailsToDelete } });
        
        console.log(`🗑️ Deleted ${result.deletedCount} ghost users.`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

removeGhostUsers();
