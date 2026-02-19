import { create } from "zustand";
import { persist } from "zustand/middleware";

// --- Types ---

export interface TenantAccount {
    id: string;
    name: string;
    sellerId?: number;
    type: 'tenant' | 'cuenta';
}

export type MeliAccount = "Todas" | TenantAccount;

// Ventas internal states
export type SalesState = "pendiente_facturacion" | "facturada" | "venta_cancelada" | "nota_credito";

// Logistica internal states
export type LogisticsState = "pendiente_preparacion" | "listo_para_entregar" | "despachado_meli" | "retiro_local" | "entregado" | "cancelado_vuelto_stock" | "devolucion_vuelto_stock";

// MELI states
export type MeliStatus = "ready_to_ship" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  variant: string; // New field
}

export interface Order {
  id: string; // Id venta RTSS
  meliOrderId: string; // Id ML
  packId: string | null; // Pack Id ML
  date: string; // Fecha ML (ISO string)

  account: MeliAccount;
  clientName: string;
  buyerName: string;
  buyerAddress: string;

  total: number;
  items: OrderItem[];

  // Statuses
  salesStatus: SalesState; // Gestión Interna Venta
  logisticsStatus: LogisticsState;
  meliStatus: MeliStatus; // Estado ML

  // New Statuses / Fields
  tagStatus: "impresas" | "pendientes" | "error"; // Estado etiqueta
  shippingStatus: "not_delivered" | "delivered" | "cancelled"; // Entrega ML
  shippingSubStatus: string; // Estado Envío ML (e.g. "En camino", "Entregado")
  lastUpdated: string; // Última modificación
  shippingCutoff: string; // Antes de las 15hs (Time string or "N/A")

  // Ventas New Fields
  invoiceStatus: "pending" | "invoiced" | "cancelled"; // Estado Factura
  docType: "DNI" | "CUIT" | "CUIL" | "Pasaporte" | null; // Tipo Doc
  docNumber: string | null; // Nro Doc

  // Metadata for logic
  billingType: "auto" | "manual" | null; // null if not billed
  packaged: boolean; // New field for "Empaquetado" status
  tenantId: string; // New field for Tenant filtering
  sellerId?: number; // Raw Seller ID for dynamic mapping
  clientId?: string; // Raw Client ID for dynamic mapping
  
  tags: string[]; // MeLi tags
}

interface LumbaState {
  orders: Order[];
  accounts: MeliAccount[]; // List of available accounts
  selectedAccount: MeliAccount;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;

  // Actions
  setAccount: (account: MeliAccount) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (from: string, to: string) => void;

  notifications: Record<string, boolean>;
  setNotification: (statusKey: string, hasNotification: boolean) => void;

  // Order Actions
  fetchAccounts: () => Promise<void>;
  fetchOrders: () => Promise<void>; // New Action
  updateOrderSalesStatus: (orderId: string, status: SalesState, billingType?: "auto" | "manual") => void;
  updateOrderLogisticsStatus: (orderId: string, status: LogisticsState) => void;
  setOrderPackaged: (orderId: string, isPackaged: boolean) => void;
  setOrderTagStatus: (orderId: string, status: "impresas" | "pendientes" | "error") => void;

  // Simulation
  simulateMeliUpdates: () => void;
}

// --- API Helper ---
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1',
});

// Interceptor for Auth
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); 
    const tenantId = localStorage.getItem('tenantId'); // Assuming we store this
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
    return config;
});

// --- Store Implementation ---

export const useLumbaStore = create<LumbaState>()(
  persist(
    (set, get) => ({
      orders: [], // Start empty, fetch on mount
      selectedAccount: "Todas",
      searchQuery: "",
      dateFrom: "",
      dateTo: "",
      notifications: {},

      accounts: [], // List of available tenants
      
      setAccount: (account) => {
          if (account !== "Todas") {
              localStorage.setItem('tenantId', account.id);
          } else {
              localStorage.removeItem('tenantId'); // Revert to default
          }
          // Clear orders and notifications on account switch to prevent false positives
          set({ selectedAccount: account, orders: [], notifications: {} });
      },
      setSearchQuery: (query) => set({ searchQuery: query }),
      setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
      setNotification: (statusKey, hasNotification) =>
        set((state) => ({
          notifications: { ...state.notifications, [statusKey]: hasNotification },
        })),
        
      fetchAccounts: async () => {
          try {
              // Fetch Tenants (Admin/Agency level)
              const tenantsPromise = api.get('/tenants?limit=100').catch(() => ({ data: { tenants: [] } }));
              // Fetch Cuentas (Clients level)
              const cuentasPromise = api.get('/cuentas?limit=100').catch(() => ({ data: { cuentas: [] } }));

              const [tenantsRes, cuentasRes] = await Promise.all([tenantsPromise, cuentasPromise]);
        
              // console.log("Fetch Accounts Debug:", { 
              //    tenants: tenantsRes.data.tenants, 
              //    cuentas: cuentasRes.data.cuentas 
              // });

              const tenants = tenantsRes.data.tenants || [];
              const cuentas = cuentasRes.data.cuentas || [];
              
              const accounts: MeliAccount[] = [
                  "Todas", 
                  ...tenants.map((t: any) => ({
                      id: t._id,
                      name: t.company?.legalName || t.name,
                      sellerId: t.mercadolibre?.sellerId,
                      type: 'tenant' as const
                  })),
                  ...cuentas.map((c: any) => ({
                      id: c._id,
                      name: c.name + (c.company ? ` (${c.company})` : ''),
                      sellerId: c.mercadolibre?.sellerId,
                      type: 'cuenta' as const
                  }))
              ];
              
              set({ accounts });
          } catch (error) {
              console.error("Failed to fetch accounts:", error);
          }
      },

      fetchOrders: async () => {
          try {
              const { selectedAccount, accounts, orders: currentOrders } = get();
              const params: any = {};
              
              // Handle Multi-tenant selection
              if (selectedAccount === "Todas") {
                  // If SuperAdmin, might want all tenants. If Agency, might want all clients.
                  // Default behavior: "all" tenants/clients visible to user.
                  params.mode = "all"; 
              } else if (typeof selectedAccount === 'object' && selectedAccount?.id) {
                  if (selectedAccount.type === 'tenant') {
                      params.tenantId = selectedAccount.id;
                  } else {
                      params.clientId = selectedAccount.id;
                  }
              }

              const response = await api.get('/orders', { params });
              const backendOrders = response.data;
              
              // Map Backend Order to Frontend Order Interface
              const mappedOrders: Order[] = backendOrders.map((o: any) => ({
                  id: o.id || o._id, // Use Mongo ID or Virtual
                  meliOrderId: o.meliId,
                  packId: o.packId,
                  date: o.dateCreated,
                  sellerId: o.sellerId, // Store Raw ID
                  clientId: o.clientId, // Store Raw ID
                  account: (() => {
                      if (o.clientId) {
                          const acc = accounts.find(a => typeof a !== 'string' && a.id === o.clientId);
                          if (acc) return acc;
                      }
                      if (o.sellerId) {
                           // console.log(`Mapping Order ${o.meliOrderId} - SellerID: ${o.sellerId} (Type: ${typeof o.sellerId})`);
                           const acc = accounts.find(a => {
                               if (typeof a === 'string') return false;
                               // console.log(`Checking vs Account ${a.name} - SellerID: ${a.sellerId} (Type: ${typeof a.sellerId})`);
                               return a.sellerId === o.sellerId;
                           });
                           if (acc) return acc;
                           return `ID: ${o.sellerId}`;
                      }
                      return "Cuenta Desconocida";
                  })() as MeliAccount,
                  clientName: o.buyer.id ? (o.buyer.nickname || "Cliente Web") : "Cliente Demo",
                  buyerName: o.buyer.nickname || `${o.buyer.firstName} ${o.buyer.lastName}`,
                  buyerAddress: o.shipping?.receiverAddress?.addressLine || "-",
                  total: o.payment.total,
                  items: o.items.map((i: any) => ({
                      id: i.id,
                      title: i.title,
                      quantity: i.quantity,
                      price: i.unitPrice,
                      variant: "-"
                  })),
                  
                  salesStatus: o.salesStatus,
                  logisticsStatus: o.logisticsStatus,
                  meliStatus: o.shipping?.status === 'shipped' ? 'shipped' : 
                              o.shipping?.status === 'delivered' ? 'delivered' : 
                              o.shipping?.status === 'cancelled' ? 'cancelled' : 'ready_to_ship',
                              
                  tagStatus: o.tagStatus || "pendientes",
                  // Preserve tagStatus if existing order
                  // tagStatus: currentOrders.find(co => co.id === (o.id || o._id))?.tagStatus || "pendientes",
                  
                  shippingStatus: o.shipping?.status === 'delivered' ? 'delivered' : 'not_delivered',
                  shippingSubStatus: o.shipping?.substatus || "-",
                  lastUpdated: o.lastUpdated,
                  shippingCutoff: "15:00 hs",
                  
                  invoiceStatus: o.invoiceId ? "invoiced" : "pending",
                  docType: null,
                  docNumber: null,
                  billingType: null,
                  packaged: o.isPackaged || false,
                  tenantId: o.tenantId || "",
                  tags: o.tags || []
              }));

              // Preserve local state (tagStatus)
              // We refetch to get updates from backend (e.g. status changes from webhooks),
              // but we want to keep our local `tagStatus` if it hasn't been synced or if we trust local more for now.
              // Actually, `tagStatus` is persisted in backend now (we patched it).
              // So we should trust backend, unless we are in the middle of an edit?
              // The backend `tagStatus` field is not fully implemented in the endpoint yet (mappedOrders doesn't read it from `o.tagStatus` explicitly above, it defaults to "pendientes").
              // detailed check: `tagStatus: "pendientes"` in map above. 
              // We need to map `o.tagStatus` from backend if it exists. 
              // Assuming backend sends it (we added it to updates but did we add it to GET?).
              // Let's assume for now we want to carry over local if backend is missing it or to be safe.
              
              const mergedOrders = mappedOrders.map(newOrder => {
                  const existing = currentOrders.find(co => co.id === newOrder.id);
                  if (existing) {
                      // Preserve tagStatus if backend doesn't send it or sends default
                      // If backend sends it, we should use it.
                      // For now, let's look at `o.tagStatus` in the map.  Wait, I set it to "pendientes" hardcoded above.
                      // I should fix that first to read `o.tagStatus` if available.
                      
                      // Let's recover it from existing if backend provided "pendientes" (default)
                      if (newOrder.tagStatus === "pendientes" && existing.tagStatus !== "pendientes") {
                          return { ...newOrder, tagStatus: existing.tagStatus };
                      }
                  }
                  return newOrder;
              });


              // --- NEW ORDER DETECTION LOGIC ---
              const newNotifications: Record<string, boolean> = { ...get().notifications };
              let hasChanges = false;

              // If we have current orders, check for new ones
              // We only notify if we already had some state (not first load after clear)
              // But `fetchOrders` runs on mount. `orders` is empty.
              // We don't want to notify ALL orders on first load.
              // So we only notify if `currentOrders.length > 0`.
              
              if (currentOrders.length > 0) {
                  mergedOrders.forEach(order => {
                      const exists = currentOrders.some(co => co.id === order.id);
                      if (!exists) {
                          // It's a new order!
                          // Determine notification key based on status
                          
                          // Status Key Mapping (Same as in updateOrderLogisticsStatus)
                           const statusToKey: Record<string, string> = {
                              pendiente_preparacion: "PENDIENTE_PREPARACION",
                              listo_para_entregar: "LISTO_PARA_ENTREGAR",
                              despachado_meli: "DESPACHADO_MELI",
                              retiro_local: "RETIRO_EN_LOCAL",
                              entregado: "ENTREGADOS",
                              cancelado_vuelto_stock: "CANCELADOS",
                              devolucion_vuelto_stock: "DEVOLUCION",
                              // Salex
                              pendiente_facturacion: "PENDIENTE_FACTURACION",
                              facturada: "FACTURADAS",
                              venta_cancelada: "VENTAS_CANCELADAS",
                              nota_credito: "NOTAS_DE_CREDITO",
                            };

                          let key = statusToKey[order.logisticsStatus];
                          
                          // Special cases
                          if (order.packaged && (order.logisticsStatus === "cancelado_vuelto_stock" || order.logisticsStatus === "devolucion_vuelto_stock")) {
                               key = "DESEMPAQUETAR";
                          }
                          
                          // Also notify Sales Status
                          const salesKey = statusToKey[order.salesStatus];
                          if(salesKey) {
                              newNotifications[salesKey] = true;
                              hasChanges = true;
                          }

                          if (key) {
                              newNotifications[key] = true;
                              hasChanges = true;
                          }
                      }
                  });
              }
              
              set({ orders: mergedOrders });
              if (hasChanges) {
                  set({ notifications: newNotifications });
              }

          } catch (error) {
              console.error("Failed to fetch orders:", error);
          }
      },

      updateOrderSalesStatus: (orderId, status, billingType) =>
        set((state) => {
            // TODO: Call API to update status in backend
          const statusToKey: Record<string, string> = {
            pendiente_facturacion: "PENDIENTE_FACTURACION",
            facturada: "FACTURADAS",
            venta_cancelada: "VENTAS_CANCELADAS",
            nota_credito: "NOTAS_DE_CREDITO",
          };
          const statusKey = statusToKey[status] || status.toUpperCase();

          return {
            orders: state.orders.map((o) => (o.id === orderId ? { ...o, salesStatus: status, billingType: billingType || o.billingType } : o)),
            notifications: { ...state.notifications, [statusKey]: true },
          };
        }),

      updateOrderLogisticsStatus: async (orderId, status) => {
          // Optimistic Update
          set((state) => { 
            const statusToKey: Record<string, string> = {
              pendiente_preparacion: "PENDIENTE_PREPARACION",
              listo_para_entregar: "LISTO_PARA_ENTREGAR",
              despachado_meli: "DESPACHADO_MELI",
              retiro_local: "RETIRO_EN_LOCAL",
              entregado: "ENTREGADOS",
              cancelado_vuelto_stock: "CANCELADOS",
              devolucion_vuelto_stock: "DEVOLUCION",
            };
            const statusKey = statusToKey[status] || status.toUpperCase();
  
            return {
              orders: state.orders.map((o) => (o.id === orderId ? { ...o, logisticsStatus: status } : o)),
              notifications: (() => {
                 const order = state.orders.find((o) => o.id === orderId);
                 let key = statusKey;
                 if (order?.packaged && (status === "cancelado_vuelto_stock" || status === "devolucion_vuelto_stock")) {
                   key = "DESEMPAQUETAR";
                 }
                 return { ...state.notifications, [key]: true };
              })(),
            };
          });

          // API Call
          try {
              await api.patch(`/orders/${orderId}`, { logisticsStatus: status });
          } catch (error) {
              console.error("Failed to persist logistics status:", error);
              // Revert? For now, we assume success or user will retry / see error next reload.
              // toast.error("Error al guardar el estado");
          }
      },

      setOrderPackaged: async (orderId, isPackaged) => {
        // Optimistic Update
        set((state) => {
           let newNotifications = { ...state.notifications };
           const order = state.orders.find((o) => o.id === orderId);

           if (order && !isPackaged) {
             if (order.logisticsStatus === "cancelado_vuelto_stock") {
               newNotifications["CANCELADOS"] = true;
             } else if (order.logisticsStatus === "devolucion_vuelto_stock") {
               newNotifications["DEVOLUCION"] = true;
             }
           }

           return {
            orders: state.orders.map((o) => (o.id === orderId ? { ...o, packaged: isPackaged } : o)),
            notifications: newNotifications,
           };
        });

        // API Call
        try {
            await api.patch(`/orders/${orderId}`, { packaged: isPackaged });
        } catch (error) {
            console.error("Failed to persist packaged status:", error);
        }
      },

      setOrderTagStatus: async (orderId, status) => {
        // Optimistic Update
        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id !== orderId) return o;
            
            let newMeliStatus = o.meliStatus;
            let newLogisticsStatus = o.logisticsStatus;
            
            if (status === "impresas" && o.meliStatus !== "shipped" && o.meliStatus !== "delivered") {
               newMeliStatus = "ready_to_ship";
               // Removed automatic transition to "listo_para_entregar" per user request
               // Status change must be manual via the truck button
            }

            return { 
                ...o, 
                tagStatus: status,
                meliStatus: newMeliStatus,
                logisticsStatus: newLogisticsStatus
            };
          }),
        }));

        // API Call
        try {
            await api.patch(`/orders/${orderId}`, { tagStatus: status });
        } catch (error) {
            console.error("Failed to persist tag status:", error);
        }
      },

      simulateMeliUpdates: () =>
        set((state) => ({ orders: state.orders })), // Disable simulation for now
    }),
    {
      name: "lumba-store", // key in local storage
      partialize: (state) => ({
        selectedAccount: state.selectedAccount,
        notifications: state.notifications,
      }),
    },
  ),
);

