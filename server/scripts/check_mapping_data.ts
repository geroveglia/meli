import mongoose from "mongoose";
import dotenv from "dotenv";
import { Order } from "../src/models/Order.js";
import { Cuenta } from "../src/models/Cuenta.js";

dotenv.config({ path: ".env.development" });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "", {
            dbName: process.env.MONGO_DB_NAME
        });
        console.log("Connected to", process.env.MONGO_DB_NAME);

        const cuentas = await Cuenta.find({});
        console.log(`Found ${cuentas.length} cuentas:`);
        cuentas.forEach(c => {
            console.log(` - ${c.name}: ID=${c._id}, SellerID=${c.mercadolibre?.sellerId} (Type: ${typeof c.mercadolibre?.sellerId})`);
        });

        const orders = await Order.find({}).limit(10);
        console.log(`Found ${orders.length} sample orders:`);
        orders.forEach(o => {
            console.log(` - Order ${o.meliId}: SellerID=${o.sellerId} (Type: ${typeof o.sellerId}) - ClientId=${o.clientId}`);
        });
        
        // Check match
        orders.forEach(o => {
            if (o.sellerId) {
                const match = cuentas.find(c => c.mercadolibre?.sellerId === o.sellerId);
                console.log(`Order ${o.meliId} (Seller ${o.sellerId}) matches Account: ${match ? match.name : 'NONE'}`);
            } else {
                console.log(`Order ${o.meliId} has NO sellerID`);
            }
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
