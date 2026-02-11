
import { Tenant } from "../models/Tenant.js";

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

export const handleNotification = async (topic: string, resource: string, tenantId: string) => {
    console.log(`[MELI Webhook] Processing ${topic} for resource ${resource} (Tenant: ${tenantId})`);
    
    const tenant = await Tenant.findById(tenantId);
    if(!tenant || !tenant.mercadolibre?.accessToken) {
        console.error(`Tenant ${tenantId} not found or not connected to MELI`);
        return;
    }

    // Check expiration and refresh if needed
    let accessToken = tenant.mercadolibre.accessToken;
    if(tenant.mercadolibre.expiresAt && tenant.mercadolibre.expiresAt.getTime() < Date.now()) {
         try {
            console.log("Refreshing expired token...");
            const newTokens = await refreshAccessToken(tenant.mercadolibre.refreshToken);
            tenant.mercadolibre.accessToken = newTokens.accessToken;
            tenant.mercadolibre.refreshToken = newTokens.refreshToken;
            tenant.mercadolibre.expiresAt = newTokens.expiresAt;
            await tenant.save();
            accessToken = newTokens.accessToken;
         } catch (e) {
             console.error("Failed to refresh token during webhook processing", e);
             return;
         }
    }

    try {
        if (topic === 'orders_v2' || resource.includes('/orders/')) {
            const orderData = await fetchMeliResource(resource, accessToken);
            // console.log("Order Data:", JSON.stringify(orderData, null, 2));

            // Fetch Shipping info if available
            let shippingData = null;
            if (orderData.shipping && orderData.shipping.id) {
                try {
                    shippingData = await fetchMeliResource(`/shipments/${orderData.shipping.id}`, accessToken);
                } catch (err) {
                    console.warn(`Could not fetch shipment ${orderData.shipping.id}`, err);
                }
            }

            // Map to our Order Model
            const orderUpdate = {
                tenantId: tenant._id,
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
                
                // Logic for internal status mappings
                // If MELI status is 'paid', we set to 'pendiente_facturacion' locally if new
                // If MELI shipping is 'shipped', we set 'despachado_meli'
            };

            // Upsert Order
            const existingOrder = await Order.findOne({ meliId: orderUpdate.meliId });
            
            if (existingOrder) {
                // Update existing
                // Only update status if meaningful changes
                existingOrder.lastUpdated = orderUpdate.lastUpdated;
                existingOrder.payment = orderUpdate.payment; // update status
                
                if (orderUpdate.shipping) {
                    existingOrder.shipping = orderUpdate.shipping;
                    
                    // Automations based on Shipping Status
                    if (orderUpdate.shipping.status === 'shipped') {
                        existingOrder.logisticsStatus = 'despachado_meli';
                    } else if (orderUpdate.shipping.status === 'delivered') {
                        existingOrder.logisticsStatus = 'entregado';
                    }
                }

                if (orderUpdate.payment.status === 'cancelled') {
                    existingOrder.salesStatus = 'venta_cancelada';
                    existingOrder.logisticsStatus = 'cancelado_vuelto_stock'; // simplified logic
                }

                await existingOrder.save();
                console.log(`Order ${orderUpdate.meliId} updated.`);
            } else {
                // New Order
                await Order.create(orderUpdate);
                console.log(`Order ${orderUpdate.meliId} created.`);
            }
        }
    } catch (error) {
        console.error("Error processing resource:", error);
    }
};
