import { create } from "zustand";
import { persist } from "zustand/middleware";

// --- Types ---

export type MeliAccount = "Cuenta 1" | "Cuenta 2" | "Cuenta 3" | "Todas";

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
}

interface LumbaState {
  orders: Order[];
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

      setAccount: (account) => set({ selectedAccount: account }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
      setNotification: (statusKey, hasNotification) =>
        set((state) => ({
          notifications: { ...state.notifications, [statusKey]: hasNotification },
        })),
        
      fetchOrders: async () => {
          try {
              const response = await api.get('/orders');
              const backendOrders = response.data;
              
              // Map Backend Order to Frontend Order Interface
              const mappedOrders: Order[] = backendOrders.map((o: any) => ({
                  id: o.id || o._id, // Use Mongo ID or Virtual
                  meliOrderId: o.meliId,
                  packId: o.packId,
                  date: o.dateCreated,
                  account: "Cuenta 1", // Default for now
                  clientName: "Cliente Demo", // Default
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
                              
                  tagStatus: "pendientes", // Default
                  shippingStatus: o.shipping?.status === 'delivered' ? 'delivered' : 'not_delivered',
                  shippingSubStatus: o.shipping?.substatus || "-",
                  lastUpdated: o.lastUpdated,
                  shippingCutoff: "15:00 hs",
                  
                  invoiceStatus: o.invoiceId ? "invoiced" : "pending",
                  docType: null,
                  docNumber: null,
                  billingType: null,
                  packaged: o.isPackaged || false
              }));
              
              set({ orders: mappedOrders });
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

      updateOrderLogisticsStatus: (orderId, status) =>
        set((state) => { 
            // TODO: Call API
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
        }),

      setOrderPackaged: (orderId, isPackaged) =>
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
        }),

      setOrderTagStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id !== orderId) return o;
            
            let newMeliStatus = o.meliStatus;
            let newLogisticsStatus = o.logisticsStatus;
            
            if (status === "impresas" && o.meliStatus !== "shipped" && o.meliStatus !== "delivered") {
               newMeliStatus = "ready_to_ship";
               if(o.packaged) {
                   newLogisticsStatus = "listo_para_entregar";
               }
            }

            return { 
                ...o, 
                tagStatus: status,
                meliStatus: newMeliStatus,
                logisticsStatus: newLogisticsStatus
            };
          }),
        })),

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

