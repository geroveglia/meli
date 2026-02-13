
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';

dotenv.config({ path: '.env.development' });

const ORDER_ID = "2000015134282302"; // The one we are testing with

const run = async () => {
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        // 1. Reset to initial state
        await Order.findOneAndUpdate({ meliId: ORDER_ID }, { 
            logisticsStatus: 'pendiente_preparacion',
            isPackaged: false,
            tagStatus: 'pendientes'
        });
        console.log("Reset order state.");

        // 2. Simulate PATCH request locally (bypass API call for quick DB check)
        // We are testing the DB logic mainly, but improved confidence would be actual API call.
        // Let's use fetch against localhost if server is running, otherwise direct DB update is what we implemented in route.
        
        console.log("Simulating PATCH /orders/" + ORDER_ID);
        const res = await fetch(`http://localhost:8081/api/v1/orders/${ORDER_ID}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                // Mock Auth if needed or rely on no-auth dev mode if applicable
                // For this test, we might struggle with auth middleware if we don't have a valid token.
                // Let's assume we need a token.
            },
            body: JSON.stringify({
                packaged: true
            })
        });

        if (res.status === 401 || res.status === 403) {
            console.log("Auth required. Skipping API test, verification manual via UI recommended.");
            return;
        }

        const data = await res.json();
        console.log("PATCH Response:", data);

        const order = await Order.findOne({ meliId: ORDER_ID });
        console.log("DB status after PATCH:", order?.logisticsStatus, "Packaged:", order?.isPackaged);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
