import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type MeliAccount = 'Cuenta 1' | 'Cuenta 2' | 'Cuenta 3' | 'Todas';

// Ventas internal states
export type SalesState = 
  | 'pendiente_facturacion'
  | 'facturada'
  | 'venta_cancelada'
  | 'nota_credito';

// Logistica internal states
export type LogisticsState = 
  | 'pendiente_preparacion'
  | 'listo_para_entregar'
  | 'despachado_meli'
  | 'retiro_local'
  | 'entregado'
  | 'cancelado_vuelto_stock'
  | 'devolucion_vuelto_stock';

// MELI states
export type MeliStatus = 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  variant: string; // New field
}

export interface Order {
  id: string; // Id venta RTSS
  meliOrderId: string; // Id venta ML
  packId: string | null; // Pack Id ML
  date: string; // Fecha ML (ISO string)
  
  account: MeliAccount;
  buyerName: string;
  buyerAddress: string;
  
  total: number;
  items: OrderItem[];
  
  // Statuses
  salesStatus: SalesState; // Gestión Interna Venta
  logisticsStatus: LogisticsState;
  meliStatus: MeliStatus; // Estado ML
  
  // New Statuses / Fields
  tagStatus: 'impresas' | 'pendientes' | 'error'; // Estado etiqueta
  shippingStatus: 'not_delivered' | 'delivered' | 'cancelled'; // Entrega ML
  shippingSubStatus: string; // Estado Envío ML (e.g. "En camino", "Entregado")
  lastUpdated: string; // Última modificación
  shippingCutoff: string; // Antes de las 15hs (Time string or "N/A")

  // Ventas New Fields
  invoiceStatus: 'pending' | 'invoiced' | 'cancelled'; // Estado Factura
  docType: 'DNI' | 'CUIT' | 'CUIL' | 'Pasaporte' | null; // Tipo Doc
  docNumber: string | null; // Nro Doc

  // Metadata for logic
  billingType: 'auto' | 'manual' | null; // null if not billed
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
  
  // Order Actions
  updateOrderSalesStatus: (orderId: string, status: SalesState, billingType?: 'auto' | 'manual') => void;
  updateOrderLogisticsStatus: (orderId: string, status: LogisticsState) => void;
  
  // Simulation
  simulateMeliUpdates: () => void;
}

// --- Mock Data Generator ---

import mockOrders from '../mocks/orders.json';
import mockShipments from '../mocks/shipments.json';

// --- Mock Data Generator ---

const generateMockOrders = (): Order[] => {
  const mappedOrders: Order[] = mockOrders.map((meliOrder: any) => {
    // Find corresponding shipment
    const shipment = mockShipments.find((s: any) => s.order_id === meliOrder.id || (meliOrder.shipping && s.id === meliOrder.shipping.id));
    
    // Map items
    const items: OrderItem[] = meliOrder.order_items.map((item: any) => {
        // Try to find variant info in variation_attributes
        const variantColor = item.item.variation_attributes?.find((attr: any) => attr.id === 'COLOR')?.value_name;
        const variantVoltage = item.item.variation_attributes?.find((attr: any) => attr.id === 'VOLTAGE')?.value_name;
        const variant = [variantColor, variantVoltage].filter(Boolean).join(' / ') || '-';

        return {
            id: item.item.id,
            title: item.item.title,
            quantity: item.quantity,
            price: item.unit_price,
            variant: variant
        };
    });

    // Determine derived statuses
    let meliStatus: MeliStatus = 'ready_to_ship';
    if (shipment?.status === 'ready_to_ship') meliStatus = 'ready_to_ship';
    if (shipment?.status === 'shipped') meliStatus = 'shipped';
    if (shipment?.status === 'delivered') meliStatus = 'delivered';
    if (shipment?.status === 'cancelled') meliStatus = 'cancelled';
    
    // Fallback if no shipment found but order status exists
    if (!shipment && meliOrder.status === 'paid') meliStatus = 'ready_to_ship'; 

    let logisticsStatus: LogisticsState = 'pendiente_preparacion';
    if (meliStatus === 'shipped') logisticsStatus = 'despachado_meli';
    if (meliStatus === 'delivered') logisticsStatus = 'entregado';
    if (shipment?.substatus === 'ready_to_print') logisticsStatus = 'pendiente_preparacion';

    let salesStatus: SalesState = 'pendiente_facturacion';
    if (meliOrder.status === 'paid') {
        salesStatus = 'pendiente_facturacion';
    } 
    // Example logic if we wanted to map 'billed' status if it existed
    // if (meliOrder.status === 'billed') salesStatus = 'facturada';

    // Calculate Invoice Status
    let invoiceStatus: 'pending' | 'invoiced' | 'cancelled' = 'pending';
    // Logic: derived directly from salesStatus
    if ((salesStatus as string) === 'facturada') {
        invoiceStatus = 'invoiced';
    } else if ((salesStatus as string) === 'venta_cancelada') {
        invoiceStatus = 'cancelled';
    }
    
    return {
        id: `INT-${meliOrder.id.toString().slice(-6)}`, // Fake internal ID
        meliOrderId: meliOrder.id.toString(),
        packId: meliOrder.pack_id ? meliOrder.pack_id.toString() : null,
        date: meliOrder.date_created,
        account: 'Cuenta 1', // Hardcoded as mocks don't specify account mapping
        buyerName: `${meliOrder.buyer.first_name} ${meliOrder.buyer.last_name}`,
        buyerAddress: shipment?.receiver_address ? `${shipment.receiver_address.address_line}, ${shipment.receiver_address.city.name}` : '-',
        total: meliOrder.total_amount,
        items: items,

        salesStatus,
        logisticsStatus,
        meliStatus,

        tagStatus: shipment?.substatus === 'ready_to_print' ? 'pendientes' : 'impresas', // Logic assumption
        shippingStatus: meliStatus === 'delivered' ? 'delivered' : 'not_delivered',
        shippingSubStatus: shipment?.substatus || '-',
        lastUpdated: meliOrder.last_updated,
        shippingCutoff: '-', // Not in JSON

        invoiceStatus,
        docType: null, // Not explicit in provided JSON
        docNumber: null, // Not explicit in provided JSON

        billingType: null
    };
  });

  return mappedOrders;
};

// --- Store Implementation ---

export const useLumbaStore = create<LumbaState>()(
  persist(
    (set, get) => ({
      orders: generateMockOrders(),
      selectedAccount: 'Todas',
      searchQuery: '',
      dateFrom: '',
      dateTo: '',

      setAccount: (account) => set({ selectedAccount: account }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),

      updateOrderSalesStatus: (orderId, status, billingType) => set((state) => ({
        orders: state.orders.map(o => 
          o.id === orderId 
            ? { ...o, salesStatus: status, billingType: billingType || o.billingType } 
            : o
        )
      })),

      updateOrderLogisticsStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map(o => 
          o.id === orderId 
            ? { ...o, logisticsStatus: status } 
            : o
        )
      })),

      simulateMeliUpdates: () => set((state) => {
        // Randomly pick some orders and advance their MELI state
        const newOrders = state.orders.map(order => {
          if (Math.random() > 0.2) return order; // 20% chance to update

          let newMeliStatus = order.meliStatus;
          let newLogisticsStatus = order.logisticsStatus;
          let newSalesStatus = order.salesStatus;
          let newBillingType = order.billingType;

          // Automation Rules logic
          if (order.meliStatus === 'ready_to_ship') {
             // Simulate moving to shipped
             newMeliStatus = 'shipped';
          } else if (order.meliStatus === 'shipped') {
             // Simulate moving to delivered
             newMeliStatus = 'delivered';
          }

          // Apply side effects
          if (newMeliStatus === 'shipped') {
             newLogisticsStatus = 'despachado_meli';
             // Sales automation: if shipped, ensure it is billed (if not already)
             if (newSalesStatus === 'pendiente_facturacion') {
               newSalesStatus = 'facturada';
               newBillingType = 'auto'; // Auto-billing triggered
             }
          }
          if (newMeliStatus === 'delivered') {
             newLogisticsStatus = 'entregado';
          }

          return {
            ...order,
            meliStatus: newMeliStatus,
            logisticsStatus: newLogisticsStatus,
            salesStatus: newSalesStatus,
            billingType: newBillingType
          };
        });

        return { orders: newOrders };
      })
    }),
    {
      name: 'lumba-store', // key in local storage
      partialize: (state) => ({ selectedAccount: state.selectedAccount }), // only persist selectedAccount
    }
  )
);
