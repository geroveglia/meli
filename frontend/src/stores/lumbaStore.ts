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
  updateOrderSalesStatus: (orderId: string, status: SalesState, billingType?: "auto" | "manual") => void;
  updateOrderLogisticsStatus: (orderId: string, status: LogisticsState) => void;
  setOrderPackaged: (orderId: string, isPackaged: boolean) => void;
  setOrderTagStatus: (orderId: string, status: "impresas" | "pendientes" | "error") => void;

  // Simulation
  simulateMeliUpdates: () => void;
}

// --- Mock Data Generator ---

import mockOrders from "../mocks/orders.json";
import mockShipments from "../mocks/shipments.json";

// Demo client names - these should match the clients in the database
// Only include clients that actually exist in your system
const DEMO_CLIENTS = ["Cliente", "Cliente 2"];

// --- Mock Data Generator ---

const generateMockOrders = (): Order[] => {
  const allLogisticsStates: LogisticsState[] = [
    "pendiente_preparacion",
    "listo_para_entregar",
    "despachado_meli",
    "retiro_local",
    "entregado",
    "cancelado_vuelto_stock",
    "devolucion_vuelto_stock",
  ];

  const mappedOrders: Order[] = mockOrders.map((meliOrder: any, index: number) => {
    // Find corresponding shipment
    const shipment = mockShipments.find((s: any) => s.order_id === meliOrder.id || (meliOrder.shipping && s.id === meliOrder.shipping.id));

    // Assign client cyclically between available clients
    const clientIndex = index % DEMO_CLIENTS.length;
    const assignedClient = DEMO_CLIENTS[clientIndex];

    // Map items
    const items: OrderItem[] = meliOrder.order_items.map((item: any) => {
      // Try to find variant info in variation_attributes
      const variantColor = item.item.variation_attributes?.find((attr: any) => attr.id === "COLOR")?.value_name;
      const variantVoltage = item.item.variation_attributes?.find((attr: any) => attr.id === "VOLTAGE")?.value_name;
      const variant = [variantColor, variantVoltage].filter(Boolean).join(" / ") || "-";

      return {
        id: item.item.id,
        title: item.item.title,
        quantity: item.quantity,
        price: item.unit_price,
        variant: variant,
      };
    });

    // Determine derived statuses
    let meliStatus: MeliStatus = "ready_to_ship";
    if (shipment?.status === "ready_to_ship") meliStatus = "ready_to_ship";
    if (shipment?.status === "shipped") meliStatus = "shipped";
    if (shipment?.status === "delivered") meliStatus = "delivered";
    if (shipment?.status === "cancelled") meliStatus = "cancelled";

    // Fallback if no shipment found but order status exists
    if (!shipment && meliOrder.status === "paid") meliStatus = "ready_to_ship";

    let logisticsStatus: LogisticsState = "pendiente_preparacion";
    if (meliStatus === "shipped") logisticsStatus = "despachado_meli";
    if (meliStatus === "delivered") logisticsStatus = "entregado";
    if (shipment?.substatus === "ready_to_print") logisticsStatus = "pendiente_preparacion";

    let salesStatus: SalesState = "pendiente_facturacion";
    if (meliOrder.status === "paid") {
      salesStatus = "pendiente_facturacion";
    }
    // Example logic if we wanted to map 'billed' status if it existed
    // if (meliOrder.status === 'billed') salesStatus = 'facturada';

    // Calculate Invoice Status
    let invoiceStatus: "pending" | "invoiced" | "cancelled" = "pending";
    // Logic: derived directly from salesStatus
    if ((salesStatus as string) === "facturada") {
      invoiceStatus = "invoiced";
    } else if ((salesStatus as string) === "venta_cancelada") {
      invoiceStatus = "cancelled";
    }

    // --- FORCE STATES FOR DEMO ---
    // Ensure we have at least one order in each state
    if (index < allLogisticsStates.length) {
      logisticsStatus = allLogisticsStates[index];
    }

    // Consistency Adjustments for Forced States
    let tagStatus: "impresas" | "pendientes" | "error" = "pendientes";
    let packaged = false;

    if (logisticsStatus === "listo_para_entregar") {
      packaged = true;
      tagStatus = "impresas";
    } else if (logisticsStatus === "despachado_meli") {
       packaged = true;
       tagStatus = "impresas";
       meliStatus = "shipped"; // Sync meli status
    } else if (logisticsStatus === "entregado") {
       packaged = true;
       tagStatus = "impresas";
       meliStatus = "delivered";
    } else if (logisticsStatus === "retiro_local") {
       // Optional: configure specific fields for local pickup
       packaged = true; // Assumed packaged for pickup
    }

    if (logisticsStatus === "pendiente_preparacion") {
        // Leave defaults
    } else {
        // For other states (cancelado, devolucion), ensure reasonable defaults
         if(logisticsStatus === "cancelado_vuelto_stock") {
             meliStatus = "cancelled";
         }
    }

    return {
      id: `INT-${meliOrder.id.toString().slice(-6)}`, // Fake internal ID
      meliOrderId: meliOrder.id.toString(),
      packId: meliOrder.pack_id ? meliOrder.pack_id.toString() : null,
      date: meliOrder.date_created,
      account: "Cuenta 1", // Hardcoded as mocks don't specify account mapping
      clientName: assignedClient, // Distributed among demo clients
      buyerName: `${meliOrder.buyer.first_name} ${meliOrder.buyer.last_name}`,
      buyerAddress: shipment?.receiver_address ? `${shipment.receiver_address.address_line}, ${shipment.receiver_address.city.name}` : "-",
      total: meliOrder.total_amount,
      items: items,

      salesStatus,
      logisticsStatus,
      meliStatus,

      tagStatus,
      shippingStatus: meliStatus === "delivered" ? "delivered" : "not_delivered",
      shippingSubStatus: shipment?.substatus || "-",
      lastUpdated: meliOrder.last_updated,
      shippingCutoff: "-", // Not in JSON

      invoiceStatus,
      docType: null, // Not explicit in provided JSON
      docNumber: null, // Not explicit in provided JSON

      billingType: null,
      packaged,
    };
  });

  return mappedOrders;
};

// --- Store Implementation ---

export const useLumbaStore = create<LumbaState>()(
  persist(
    (set, _get) => ({
      orders: generateMockOrders(),
      selectedAccount: "Todas",
      searchQuery: "",
      dateFrom: "",
      dateTo: "",
      notifications: (() => {
        // Initialize with PENDIENTE_PREPARACION true if we have pending preparation orders
        return { PENDIENTE_PREPARACION: true };
      })(),

      setAccount: (account) => set({ selectedAccount: account }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
      setNotification: (statusKey, hasNotification) =>
        set((state) => ({
          notifications: { ...state.notifications, [statusKey]: hasNotification },
        })),

      updateOrderSalesStatus: (orderId, status, billingType) =>
        set((state) => {
          // Map internal status to Tab/Notification Key
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
          // Map internal status to Tab/Notification Key
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
               // Override key if packaged and going to cancel/return
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
             // If unpacking, notify the destination tab
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
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, tagStatus: status } : o)),
        })),

      simulateMeliUpdates: () =>
        set((state) => {
          // Randomly pick some orders and advance their MELI state
          const newOrders = state.orders.map((order) => {
            if (Math.random() > 0.2) return order; // 20% chance to update

            let newMeliStatus = order.meliStatus;
            let newLogisticsStatus = order.logisticsStatus;
            let newSalesStatus = order.salesStatus;
            let newBillingType = order.billingType;

            // Automation Rules logic
            if (order.meliStatus === "ready_to_ship") {
              // Simulate moving to shipped
              newMeliStatus = "shipped";
            } else if (order.meliStatus === "shipped") {
              // Simulate moving to delivered
              newMeliStatus = "delivered";
            }

            // Apply side effects
            if (newMeliStatus === "shipped") {
              newLogisticsStatus = "despachado_meli";
              // Sales automation: if shipped, ensure it is billed (if not already)
              if (newSalesStatus === "pendiente_facturacion") {
                newSalesStatus = "facturada";
                newBillingType = "auto"; // Auto-billing triggered
              }
            }
            if (newMeliStatus === "delivered") {
              newLogisticsStatus = "entregado";
            }

            return {
              ...order,
              meliStatus: newMeliStatus,
              logisticsStatus: newLogisticsStatus,
              salesStatus: newSalesStatus,
              billingType: newBillingType,
            };
          });

          return { orders: newOrders };
        }),
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
