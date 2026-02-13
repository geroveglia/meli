
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';
import { Tenant } from '../models/Tenant.js';
import { Cuenta } from '../models/Cuenta.js';

dotenv.config({ path: '.env.development' });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const orders = await Order.find().sort({ dateCreated: -1 });
        console.log(`Found ${orders.length} orders in DB. Checking against MeLi...`);
        console.log("-----------------------------------------------------------------------------------------");
        console.log("| MeLi ID          | Buyer         | Local Status (Pay/Log) | MeLi Status (Pay/Ship) | Sync? |");
        console.log("-----------------------------------------------------------------------------------------");

        // Cache tokens
        const tokenCache: Record<string, string> = {};
        const getToken = async (tenantId: string, clientId?: string) => {
            const key = `${tenantId}:${clientId || ''}`;
            if (tokenCache[key]) return tokenCache[key];

            let accessToken = "";
            if (clientId) {
                const cuenta = await Cuenta.findById(clientId);
                if (cuenta?.mercadolibre?.accessToken) accessToken = cuenta.mercadolibre.accessToken;
            }
            if (!accessToken) {
                const tenant = await Tenant.findById(tenantId);
                if (tenant?.mercadolibre?.accessToken) accessToken = tenant.mercadolibre.accessToken;
            }
            
            if(accessToken) tokenCache[key] = accessToken;
            return accessToken;
        };

        for (const order of orders) {
            const accessToken = await getToken(order.tenantId, order.clientId?.toString());
            
            let meliStatus = "N/A";
            let meliShipStatus = "N/A";
            let error = "";

            if (!accessToken) {
                error = "No Token";
            } else {
                try {
                    const res = await fetch(`https://api.mercadolibre.com/orders/${order.meliId}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        meliStatus = data.status;
                        
                        if (data.shipping && data.shipping.id) {
                             const shipRes = await fetch(`https://api.mercadolibre.com/shipments/${data.shipping.id}`, {
                                headers: { Authorization: `Bearer ${accessToken}` }
                            });
                            if (shipRes.ok) {
                                const shipData = await shipRes.json();
                                meliShipStatus = shipData.status;
                            }
                        }
                    } else {
                        error = `API ${res.status}`;
                    }
                } catch (e: any) {
                    error = "Net Error";
                }
            }

            const localSummary = `${order.payment.status.substring(0,8)}/${order.logisticsStatus.substring(0,8)}`;
            const meliSummary = error ? error : `${meliStatus.substring(0,8)}/${meliShipStatus.substring(0,10)}`;
            const isSync = (order.payment.status === meliStatus) ? "✅" : "⚠️";

            console.log(`| ${order.meliId.padEnd(16)} | ${order.buyer.nickname.substring(0,12).padEnd(13)} | ${localSummary.padEnd(22)} | ${meliSummary.padEnd(22)} | ${isSync}    |`);
        }
        console.log("-----------------------------------------------------------------------------------------");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
