import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order.js';
import { Cuenta } from '../src/models/Cuenta.js';
import { Tenant } from '../src/models/Tenant.js';
import { refreshAccessToken } from '../src/services/meliService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const MELI_ORDER_ID = process.argv[2] || "2000015360333956";

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
    console.log(`Connected to ${process.env.MONGO_DB_NAME}`);

    const order = await Order.findOne({ meliId: MELI_ORDER_ID });
    if (!order) { console.log(`Order ${MELI_ORDER_ID} not in DB`); process.exit(1); }

    console.log(`\n=== LOCAL DB ===`);
    console.log(`logisticsStatus: ${order.logisticsStatus}`);
    console.log(`salesStatus: ${order.salesStatus}`);
    console.log(`shipping.status: ${order.shipping?.status}`);
    console.log(`shipping.id: ${order.shipping?.id}`);
    console.log(`tags: ${JSON.stringify(order.tags)}`);

    // Get token
    let accessToken: string | null = null;
    const cuenta = order.clientId ? await Cuenta.findById(order.clientId) : null;
    
    if (cuenta?.mercadolibre?.accessToken) {
        accessToken = cuenta.mercadolibre.accessToken;
        const expiresAt = cuenta.mercadolibre.expiresAt ? new Date(cuenta.mercadolibre.expiresAt) : null;
        if (expiresAt && expiresAt.getTime() < Date.now()) {
            const tenant = await Tenant.findById(order.tenantId);
            const appId = tenant?.mercadolibre?.appId || process.env.MELI_APP_ID;
            const clientSecret = tenant?.mercadolibre?.clientSecret || process.env.MELI_SECRET;
            const newTokens = await refreshAccessToken(cuenta.mercadolibre.refreshToken, appId, clientSecret);
            accessToken = newTokens.accessToken;
            cuenta.mercadolibre = { ...cuenta.mercadolibre, accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken, expiresAt: newTokens.expiresAt.getTime() };
            await cuenta.save();
        }
    }

    if (!accessToken) { console.log('No access token'); process.exit(1); }

    // Fetch from MELI
    const res = await fetch(`https://api.mercadolibre.com/orders/${MELI_ORDER_ID}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
    });
    
    if (!res.ok) { console.log(`MELI Error: ${res.status}`); process.exit(1); }
    
    const meli = await res.json() as any;
    
    console.log(`\n=== MELI API RAW ===`);
    console.log(`status: ${meli.status}`);
    console.log(`fulfilled: ${meli.fulfilled}`);
    console.log(`tags: ${JSON.stringify(meli.tags)}`);
    console.log(`shipping: ${JSON.stringify(meli.shipping)}`);
    console.log(`date_closed: ${meli.date_closed}`);
    
    // Check if shipping exists
    if (meli.shipping?.id) {
        const shipRes = await fetch(`https://api.mercadolibre.com/shipments/${meli.shipping.id}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        if (shipRes.ok) {
            const ship = await shipRes.json() as any;
            console.log(`\n=== MELI SHIPMENT ===`);
            console.log(`status: ${ship.status}`);
            console.log(`substatus: ${ship.substatus}`);
            console.log(`logistic_type: ${ship.logistic_type}`);
        }
    } else {
        console.log(`\nNo shipping.id on this order`);
    }

    // Write full JSON for inspection
    const fs = await import('fs');
    fs.writeFileSync('C:\\tmp\\meli_order_raw.json', JSON.stringify(meli, null, 2));
    console.log(`\nFull MELI response saved to C:\\tmp\\meli_order_raw.json`);

    process.exit();
};

run();
