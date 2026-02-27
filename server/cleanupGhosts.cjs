const { MongoClient } = require('mongodb');

async function run() {
    const uri = 'mongodb+srv://geroveglia_db_user:753e2SAdjOOUAFgX@autolab.xlc1wod.mongodb.net/';
    const dbName = 'meli_development';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('users');

        const emails = ['vegliageronimo@gmail.com', 'gero.veglia@outlook.com'];
        const result = await collection.deleteMany({ email: { $in: emails } });

        console.log(`Deleted ${result.deletedCount} ghost users from ${dbName}`);
    } finally {
        await client.close();
    }
}

run().catch(console.error);
