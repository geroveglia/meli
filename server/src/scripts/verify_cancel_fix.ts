
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { handleNotification } from '../services/meliService.js';
import { Order } from '../models/Order.js';

dotenv.config({ path: '.env.development' });

const run = async () => {
    let testTenantId: mongoose.Types.ObjectId | null = null;
    try {
        const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
        await mongoose.connect(uri);
        console.log('Connected to DB');

        // 1. Cleanup previous test order if exists
        await Order.deleteOne({ meliId: "999000222" });
        console.log('Cleaned up previous test order.');

        // 2. Create Temporary Tenant with necessary fields
        const { Tenant } = await import('../models/Tenant.js');
        const testTenant = await Tenant.create({
            name: "Test Tenant",
            slug: "test-cancel-" + Date.now(),
            company: {
                legalName: "Test Company Inc.",
                address: {
                    street: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    postalCode: "12345",
                    country: "Testland"
                }
            },
            contact: {
                firstName: "Test",
                lastName: "User",
                email: "test@example.com"
            },
            billing: {
                currentPeriod: {
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    amount: 0
                },
                invoices: []
            },
            mercadolibre: {
                accessToken: "TEST_ACCESS_TOKEN",
                refreshToken: "TEST_REFRESH_TOKEN",
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
                sellerId: 123456
            }
        });
        testTenantId = testTenant._id;
        console.log(`Created Test Tenant: ${testTenant._id}`);

        // 3. Simulate Webhook for Not Delivered Order
        // We have mock logic in meliService for 'test-order-cancelled'
        // For this test, we want to simulate 'not_delivered', so let's update meliService helper first
        // or just use 'test-order-not-delivered' if we add it.
        // Let's rely on the fact that I'll add 'test-order-not-delivered' to meliService in next step.
        await handleNotification('orders_v2', 'test-order-not-delivered', testTenant._id.toString());

        // 4. Verify Order Status
        const order = await Order.findOne({ meliId: "999000333" }); // Different ID for this test
        if (!order) {
            console.error("Test Failed: Order 999000333 not found.");
            process.exit(1);
        }

        console.log(`Order Status: ${order.payment.status}`);
        console.log(`Sales Status: ${order.salesStatus}`);
        console.log(`Logistics Status: ${order.logisticsStatus}`);

        if (order.salesStatus === 'venta_cancelada' && order.logisticsStatus === 'cancelado_vuelto_stock') {
            console.log("SUCCESS: Order correctly marked as cancelled (from not_delivered).");
        } else {
            console.error("FAILURE: Order status incorrect.");
            console.error(`Expected salesStatus 'venta_cancelada', got '${order.salesStatus}'`);
            console.error(`Expected logisticsStatus 'cancelado_vuelto_stock', got '${order.logisticsStatus}'`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        // Cleanup
        if (testTenantId) {
            const { Tenant } = await import('../models/Tenant.js');
            await Tenant.findByIdAndDelete(testTenantId);
            console.log('Cleaned up Test Tenant.');
        }
        await Order.deleteOne({ meliId: "999000222" });
        console.log('Cleaned up Test Order.');

        await mongoose.disconnect();
    }
};

run();
