
import { Tenant } from "../models/Tenant.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const LOG_FILE = "C:\\wamp64\\www\\meli\\server\\server_debug.log";
const logDebug = (msg: string) => {
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { console.error("Log failed", e); }
};


const MELI_API_URL = "https://api.mercadolibre.com";

interface MeliTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

interface MeliUserResponse {
    id: number;
    nickname: string;
    first_name: string;
    last_name: string;
    email: string;
}

export const getAuthUrl = (redirectUri: string) => {
  const appId = process.env.MELI_APP_ID;
  if (!appId) throw new Error("MELI_APP_ID not defined");
  
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
};

export const authorize = async (code: string, redirectUri: string) => {
  const appId = process.env.MELI_APP_ID;
  const clientSecret = process.env.MELI_SECRET;

  if (!appId || !clientSecret) throw new Error("MELI_APP_ID or MELI_SECRET not defined");

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", appId);
  params.append("client_secret", clientSecret);
  params.append("code", code);
  params.append("redirect_uri", redirectUri);

  const response = await fetch(`${MELI_API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MELI Auth Error:", errorText);
    throw new Error(`Failed to authorize with MercadoLibre: ${response.statusText}`);
  }

  const data = (await response.json()) as MeliTokenResponse;
  
  // Get User Info to save nickname/id
  const userResponse = await fetch(`${MELI_API_URL}/users/me`, {
      headers: {
          "Authorization": `Bearer ${data.access_token}`
      }
  });
  
  let nickname = "Unknown";
  let userId = data.user_id;

  if(userResponse.ok) {
      const userData = (await userResponse.json()) as MeliUserResponse;
      nickname = userData.nickname;
      userId = userData.id;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    sellerId: userId,
    nickname: nickname,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
    const appId = process.env.MELI_APP_ID;
    const clientSecret = process.env.MELI_SECRET;
  
    if (!appId || !clientSecret) throw new Error("MELI_APP_ID or MELI_SECRET not defined");
  
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", appId);
    params.append("client_secret", clientSecret);
    params.append("refresh_token", refreshToken);
  
    const response = await fetch(`${MELI_API_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: params,
    });
  
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }
  
    const data = (await response.json()) as MeliTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // MELI might not always return a new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
};

import { Order } from "../models/Order.js";

// Helper to fetch any resource from MELI
const fetchMeliResource = async (resource: string, accessToken: string) => {
    // --- MOCK MODE FOR TESTING ---
    if (resource.includes("test-order-not-delivered")) {
        console.log("Returning MOCK NOT DELIVERED order data for testing");
        return {
            id: 999000333,
            pack_id: null,
            date_created: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            buyer: { id: 123, nickname: "TEST_BUYER", first_name: "Juan", last_name: "Perez" },
            order_items: [{ item: { id: "ITEM123", title: "Producto de Prueba", variation_attributes: [] }, quantity: 1, unit_price: 1500, currency_id: "ARS" }],
            total_amount: 1500,
            currency_id: "ARS",
            status: "paid", 
            shipping: { id: 666000111 } // triggers mock not_delivered shipment
        };
    }
    if (resource.includes("test-order-cancelled")) {
        console.log("Returning MOCK CANCELLED order data for testing");
        return {
            id: 999000222,
            pack_id: null,
            date_created: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            buyer: { id: 123, nickname: "TEST_BUYER", first_name: "Juan", last_name: "Perez" },
            order_items: [{ item: { id: "ITEM123", title: "Producto de Prueba", variation_attributes: [] }, quantity: 1, unit_price: 1500, currency_id: "ARS" }],
            total_amount: 1500,
            currency_id: "ARS",
            status: "paid", // Payment is paid, but shipping cancelled
            shipping: { id: 777000111 } // triggers mock cancelled shipment
        };
    }
    if (resource.includes("test-order")) {
        console.log("Returning MOCK order data for testing");
        return {
            id: 999000111,
            pack_id: null,
            date_created: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            buyer: { id: 123, nickname: "TEST_BUYER", first_name: "Juan", last_name: "Perez" },
            order_items: [{ item: { id: "ITEM123", title: "Producto de Prueba", variation_attributes: [] }, quantity: 1, unit_price: 1500, currency_id: "ARS" }],
            total_amount: 1500,
            currency_id: "ARS",
            status: "paid",
            shipping: { id: 888000111 } // triggers mock shipment fetch
        };
    }
    if (resource.includes("shipments/888000111")) {
        return {
            id: 888000111,
            status: "ready_to_ship",
            substatus: "ready_to_print",
            tracking_number: "TRK123456",
            service_id: 1,
            receiver_address: {
                address_line: "Calle Falsa 123",
                city: { name: "Buenos Aires" },
                state: { name: "Capital Federal" },
                zip_code: "1414",
                country: { name: "Argentina" }
            }
        };
    }
    if (resource.includes("shipments/666000111")) {
        return {
            id: 666000111,
            status: "not_delivered",
            substatus: null,
            tracking_number: null,
            service_id: 1,
            receiver_address: {
                address_line: "Calle Falsa 123",
                city: { name: "Buenos Aires" },
                state: { name: "Capital Federal" },
                zip_code: "1414",
                country: { name: "Argentina" }
            }
        };
    }
    if (resource.includes("shipments/777000111")) {
        return {
            id: 777000111,
            status: "cancelled",
            substatus: null,
            tracking_number: null,
            service_id: 1,
            receiver_address: {
                address_line: "Calle Falsa 123",
                city: { name: "Buenos Aires" },
                state: { name: "Capital Federal" },
                zip_code: "1414",
                country: { name: "Argentina" }
            }
        };
    }
    // -----------------------------

    const response = await fetch(`${MELI_API_URL}${resource.startsWith('/') ? '' : '/'}${resource}`, {
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch ${resource}: ${response.statusText}`);
    }
    
    return response.json();
};

export const getShipmentLabel = async (shipmentId: number, accessToken: string) => {
    // Check for mock shipment
    if (shipmentId === 888000111) {
        console.log("Mocking label download for test shipment");
        // Return a dummy PDF buffer or URL? 
        // For simplicity in this mock context, let's return a redirect to a sample PDF or similar, 
        // but the controller expects a stream/buffer. 
        // Let's actually fail or return a simple text as PDF for now if genuinely mocking file download.
        // Or better, return a URL if we were doing client side redirect.
        // But since we want to proxy, we need to fetch.
        // Let's just mock a fetch to a public PDF for testing.
        const mockPdf = await fetch("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf");
        return mockPdf; 
    }

    const response = await fetch(`${MELI_API_URL}/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`, {
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch label: ${response.statusText}`);
    }

    return response;
};

import { Cuenta } from "../models/Cuenta.js";

// ... previous imports ...

export const handleNotification = async (topic: string, resource: string, tenantId: string, clientId?: string) => {
    console.log(`[MELI Webhook] Processing ${topic} for resource ${resource} (Tenant: ${tenantId}, Client: ${clientId || 'N/A'})`);
    
    let accessToken: string;
    let refreshToken: string;
    let expiresAt: Date | undefined;
    let saveTokens: (newTokens: any) => Promise<void>;
    let tenantObjectId = tenantId;

    if (clientId) {
        // --- Client (Cuenta) Logic ---
        const cuenta = await Cuenta.findOne({ _id: clientId, tenantId });
        if (!cuenta || !cuenta.mercadolibre?.accessToken) {
             console.error(`Cuenta ${clientId} not found or not connected to MELI`);
             return;
        }
        accessToken = cuenta.mercadolibre.accessToken;
        refreshToken = cuenta.mercadolibre.refreshToken;
        expiresAt = cuenta.mercadolibre.expiresAt ? new Date(cuenta.mercadolibre.expiresAt) : undefined;
        
        saveTokens = async (newTokens) => {
             cuenta.mercadolibre = {
                 ...cuenta.mercadolibre!,
                 accessToken: newTokens.accessToken,
                 refreshToken: newTokens.refreshToken,
                 expiresAt: newTokens.expiresAt.getTime()
             };
             await cuenta.save();
        };

    } else {
        // --- Tenant Logic (Legacy) ---
        const tenant = await Tenant.findById(tenantId);
        if(!tenant || !tenant.mercadolibre?.accessToken) {
            console.error(`Tenant ${tenantId} not found or not connected to MELI`);
            return;
        }
        accessToken = tenant.mercadolibre.accessToken;
        refreshToken = tenant.mercadolibre.refreshToken;
        expiresAt = tenant.mercadolibre.expiresAt;

        saveTokens = async (newTokens) => {
            tenant.mercadolibre = {
                 ...tenant.mercadolibre!,
                 accessToken: newTokens.accessToken,
                 refreshToken: newTokens.refreshToken,
                 expiresAt: newTokens.expiresAt
            };
            await tenant.save();
        };
    }

    // Check expiration and refresh if needed
    if(expiresAt && expiresAt.getTime() < Date.now()) {
         try {
            console.log("Refreshing expired token...");
            const newTokens = await refreshAccessToken(refreshToken);
            await saveTokens(newTokens);
            accessToken = newTokens.accessToken;
         } catch (e) {
             console.error("Failed to refresh token during webhook processing", e);
             return;
         }
    }

    try {
        if (topic === 'orders_v2' || resource.includes('/orders/')) {
            const orderData = await fetchMeliResource(resource, accessToken);
            logDebug(`Order Data: ${JSON.stringify(orderData)}`);

            // Use the extracted function
            await processOrder(orderData, tenantId, clientId, accessToken); 
        }
    } catch (error) {
        console.error("Error processing resource:", error);
    }
};

// Extracting logic to process a single order data object
export const processOrder = async (orderData: any, tenantId: string, clientId?: string, accessToken?: string) => {
    try {
        logDebug(`Processing Order: ${orderData.id}`);

        // Fetch Shipping info if available
        let shippingData = null;
        if (orderData.shipping && orderData.shipping.id && accessToken) {
            try {
                shippingData = await fetchMeliResource(`/shipments/${orderData.shipping.id}`, accessToken);
            } catch (err) {
                console.warn(`Could not fetch shipment ${orderData.shipping.id}`, err);
                logDebug(`Error fetching shipment ${orderData.shipping.id}: ${err}`);
            }
        }

        // Map to our Order Model
        // Logic for internal status mappings
        let computedLogisticsStatus = 'pendiente_preparacion';
        if (shippingData) {
            if (shippingData.status === 'delivered') computedLogisticsStatus = 'entregado';
            else if (shippingData.status === 'shipped') computedLogisticsStatus = 'despachado_meli';
        } else {
            // If no shipping (e.g. pickup), check if fulfilled
            if (orderData.fulfilled) computedLogisticsStatus = 'entregado';
        }

        // Map to our Order Model
        const orderUpdate = {
            tenantId: new mongoose.Types.ObjectId(tenantId),
            clientId: clientId ? new mongoose.Types.ObjectId(clientId) : undefined,
            sellerId: orderData.seller?.id, // Capture Seller ID
            meliId: orderData.id.toString(),
            packId: orderData.pack_id ? orderData.pack_id.toString() : null,
            dateCreated: new Date(orderData.date_created),
            lastUpdated: new Date(orderData.last_updated),
            
            buyer: {
                id: orderData.buyer.id,
                nickname: orderData.buyer.nickname,
                firstName: orderData.buyer.first_name,
                lastName: orderData.buyer.last_name,
            },

            items: orderData.order_items.map((item: any) => ({
                id: item.item.id,
                title: item.item.title,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                currencyId: item.currency_id,
            })),

            payment: {
                total: orderData.total_amount,
                currencyId: orderData.currency_id,
                status: orderData.status,
            },

            shipping: shippingData ? {
                id: shippingData.id,
                status: shippingData.status,
                substatus: shippingData.substatus,
                trackingNumber: shippingData.tracking_number,
                serviceId: shippingData.service_id,
                receiverAddress: shippingData.receiver_address ? {
                    addressLine: shippingData.receiver_address.address_line,
                    city: shippingData.receiver_address.city.name,
                    state: shippingData.receiver_address.state.name,
                    zipCode: shippingData.receiver_address.zip_code,
                    country: shippingData.receiver_address.country.name
                } : undefined
            } : undefined,
            
            salesStatus: 'pendiente_facturacion' as any,
            logisticsStatus: computedLogisticsStatus as any,
            tags: orderData.tags || [], // Map tags
        };

        // Automations based on Computed Logistics Status (Checking fulfilled or shipping status)
        // Apply these to the orderUpdate object directly so they apply to NEW and EXISTING orders
        if (orderUpdate.logisticsStatus === 'entregado' || orderUpdate.logisticsStatus === 'despachado_meli') {
            // computedLogisticsStatus already handles this, but ensuring consistency
        }

        // Enhanced check for active shipping
        const isShippingActive = orderUpdate.shipping && (
            ['pending', 'ready_to_ship', 'shipped', 'delivered'].includes(orderUpdate.shipping.status) ||
            // Also consider active if status is undefined/null but we have an ID, or if it's not explicitly cancelled/not_delivered
            !['cancelled', 'not_delivered'].includes(orderUpdate.shipping.status)
        );
        
        // Pickup Handling
        const isPickup = orderUpdate.tags && orderUpdate.tags.includes('no_shipping');

        const hasCancellationTags = orderUpdate.tags && (
            orderUpdate.tags.includes('cancelled') || 
            (orderUpdate.tags.includes('not_delivered') && !isShippingActive && !isPickup) // Ignore not_delivered for pickup orders
        );

        if (
            ['cancelled', 'partially_refunded', 'refunded'].includes(orderUpdate.payment.status) || 
            (orderUpdate.shipping && (orderUpdate.shipping.status === 'cancelled' || orderUpdate.shipping.status === 'not_delivered')) ||
            hasCancellationTags
        ) {
            orderUpdate.salesStatus = 'venta_cancelada';
            orderUpdate.logisticsStatus = 'cancelado_vuelto_stock'; 
        }

        // Upsert Order
        const existingOrder = await Order.findOne({ meliId: orderUpdate.meliId });
        
        if (existingOrder) {
            // Update existing
            // Only update status if meaningful changes
            existingOrder.lastUpdated = orderUpdate.lastUpdated;
            existingOrder.payment = orderUpdate.payment; // update status
            
            // Ensure clientId is set if missing
            if (clientId && !existingOrder.clientId) {
                existingOrder.clientId = new mongoose.Types.ObjectId(clientId);
            }

            // Update sellerId if missing
            if (!existingOrder.sellerId && orderUpdate.sellerId) {
                existingOrder.sellerId = orderUpdate.sellerId;
            }

            if (orderUpdate.shipping) {
                existingOrder.shipping = orderUpdate.shipping;
            }
            
            // Update internal statuses if changed in orderUpdate
            existingOrder.salesStatus = orderUpdate.salesStatus;
            
            // Prevent regression: If we are 'listo_para_entregar' internally, and MeLi says 'pendiente_preparacion' (ready_to_ship), keep our internal state.
            // We only overwrite if MeLi advances to 'despachado_meli', 'entregado', or 'cancelado'.
            if (existingOrder.logisticsStatus === 'listo_para_entregar' && orderUpdate.logisticsStatus === 'pendiente_preparacion') {
                // Keep existing
            } else {
                existingOrder.logisticsStatus = orderUpdate.logisticsStatus;
            }

            await existingOrder.save();
            console.log(`Order ${orderUpdate.meliId} updated.`);
        } else {
            // New Order
            await Order.create(orderUpdate);
            console.log(`Order ${orderUpdate.meliId} created.`);
        }
    } catch (e) {
        console.error(`Error processing order ${orderData.id}:`, e);
    }
}

export const syncRecentOrders = async (tenantId: string, clientId?: string, accessToken?: string, sellerId?: number) => {
    if (!accessToken || !sellerId) return;
    
    console.log(`[Sync] Starting initial sync for Seller ${sellerId}`);
    try {
        // Fetch last 50 orders
        const searchUrl = `/orders/search?seller=${sellerId}&sort=date_desc&limit=50`;
        const result = await fetchMeliResource(searchUrl, accessToken);
        
        if (result && result.results) {
            console.log(`[Sync] Found ${result.results.length} orders to sync.`);
            for (const order of result.results) {
                await processOrder(order, tenantId, clientId, accessToken);
            }
        }
    } catch (e) {
        console.error("[Sync] Error syncing recent orders:", e);
    }
}

