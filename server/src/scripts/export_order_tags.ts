
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';
import fs from 'fs';

dotenv.config({ path: '.env.development' });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        
        const orders = await Order.find({ 
            meliId: { $in: ["2000015136780804", "2000015109753534"] } 
        });

        let output = "Order Tags Export:\n\n";
        orders.forEach(o => {
            output += `MeliId: ${o.meliId}\n`;
            output += `SalesStatus: ${o.salesStatus}\n`;
            output += `LogisticsStatus: ${o.logisticsStatus}\n`;
            output += `PaymentStatus: ${o.payment?.status}\n`;
            output += `ShippingStatus: ${o.shipping?.status}\n`;
            output += `Tags: ${o.tags ? JSON.stringify(o.tags) : 'None'}\n`;
            output += `-----------------------------------\n`;
        });

        fs.writeFileSync('order_tags_export.txt', output);
        console.log("Exported to order_tags_export.txt");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
