import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order.js';
import { Cuenta } from '../src/models/Cuenta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB_NAME });
    console.log(`✅ MongoDB connected to ${process.env.MONGO_DB_NAME}\n`);
};

const check_orders = async () => {
    await connectDB();

    // Get cuentas for name mapping
    const cuentas = await Cuenta.find({});
    const cuentaMap = new Map(cuentas.map(c => [String(c._id), c.name]));

    const orders = await Order.find({}).sort({ dateCreated: -1 });
    console.log(`📦 Total órdenes en la DB: ${orders.length}\n`);

    // Summary counters
    const salesCount: Record<string, number> = {};
    const logisticsCount: Record<string, number> = {};
    const paymentCount: Record<string, number> = {};
    const shippingCount: Record<string, number> = {};
    const tagStatusCount: Record<string, number> = {};

    console.log('─'.repeat(120));
    console.log(
        'MELI ID'.padEnd(20),
        'Ventas'.padEnd(24),
        'Logística'.padEnd(28),
        'Pago'.padEnd(12),
        'Envío MELI'.padEnd(16),
        'Tags'.padEnd(14),
        'Cuenta'
    );
    console.log('─'.repeat(120));

    orders.forEach(o => {
        const cuenta = o.clientId ? (cuentaMap.get(String(o.clientId)) || '?') : 'N/A';
        
        console.log(
            String(o.meliId).padEnd(20),
            String(o.salesStatus).padEnd(24),
            String(o.logisticsStatus).padEnd(28),
            String(o.payment.status).padEnd(12),
            String(o.shipping?.status || '-').padEnd(16),
            String(o.tagStatus || '-').padEnd(14),
            cuenta
        );

        // Count
        salesCount[o.salesStatus] = (salesCount[o.salesStatus] || 0) + 1;
        logisticsCount[o.logisticsStatus] = (logisticsCount[o.logisticsStatus] || 0) + 1;
        paymentCount[o.payment.status] = (paymentCount[o.payment.status] || 0) + 1;
        const ss = o.shipping?.status || 'sin_envio';
        shippingCount[ss] = (shippingCount[ss] || 0) + 1;
        const ts = o.tagStatus || 'sin_tag';
        tagStatusCount[ts] = (tagStatusCount[ts] || 0) + 1;
    });

    console.log('─'.repeat(120));

    console.log('\n📊 RESUMEN DE ESTADOS:\n');

    console.log('🏷️  Sales Status:');
    Object.entries(salesCount).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    console.log('\n🚚 Logistics Status:');
    Object.entries(logisticsCount).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    console.log('\n💰 Payment Status:');
    Object.entries(paymentCount).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    console.log('\n📦 Shipping Status (MELI):');
    Object.entries(shippingCount).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    console.log('\n🏷️  Tag Status:');
    Object.entries(tagStatusCount).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    process.exit();
};

check_orders();
