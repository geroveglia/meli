import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order.js';
import { Tenant } from '../models/Tenant.js';
import { processCreditNote, processInvoice } from '../services/billingService.js';
import { processOrder } from '../services/meliService.js';
import * as fs from 'fs';
import * as path from 'path';

// Fix path for windows / server root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not defined");
  await mongoose.connect(uri);
  console.log("Connected to DB");

  let tenant = await Tenant.findOne();
  if (!tenant) {
    tenant = await Tenant.create({
      name: "Test Tenant for NC",
      slug: "test-nc",
      settings: {},
      isSystem: false,
      company: { legalName: "MOCK CO" },
      contact: { firstName: "Mock", lastName: "Mocking", email: "mock@test.com" },
      billing: {
        currentPeriod: {
          startDate: new Date(),
          endDate: new Date(),
          amount: 0,
          currency: "ARS"
        }
      }
    });
    console.log("Created mock tenant");
  }

  // Create a mock order
  const orderId = "MOCK-" + Date.now();
  const orderData = {
    id: orderId,
    pack_id: null,
    date_created: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    seller: { id: 555 },
    buyer: { id: 123, nickname: "TEST_BUYER", first_name: "Juan", last_name: "Perez" },
    order_items: [{ item: { id: "ITEM123", title: "Producto de Prueba", variation_attributes: [] }, quantity: 2, unit_price: 1500, currency_id: "ARS" }],
    total_amount: 3000,
    currency_id: "ARS",
    status: "paid",
    shipping: { id: 888000111, status: "pending" },
    tags: []
  };

  // 1. Process Order normally -> Should be pendiente_facturacion
  await processOrder(orderData, tenant.id.toString());
  
  let order = await Order.findOne({ meliId: orderId });
  console.log("Initial status:", order?.salesStatus); // Expected: pendiente_facturacion

  if (order) {
    // 2. Bill the order explicitly
    order.salesStatus = "facturada";
    await order.save();
    console.log("After manual invoice (mock):", order?.salesStatus); // Expected: facturada
  }

  // 3. Process Cancellation
  orderData.status = "cancelled"; // payment cancelled
  // @ts-ignore
  orderData.tags = ["cancelled"]; 
  await processOrder(orderData, tenant.id.toString());
  
  order = await Order.findOne({ meliId: orderId });
  console.log("After cancellation status:", order?.salesStatus); // Expected: nota_credito

  await mongoose.disconnect();
}

run().catch(console.error);
