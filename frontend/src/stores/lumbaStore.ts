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
}

export interface Order {
  id: string;
  meliOrderId: string;
  date: string; // ISO string
  account: MeliAccount;
  buyerName: string;
  buyerAddress: string;
  total: number;
  items: OrderItem[];
  
  // Statuses
  salesStatus: SalesState;
  logisticsStatus: LogisticsState;
  meliStatus: MeliStatus;

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

const generateMockOrders = (): Order[] => {
  const accounts: MeliAccount[] = ['Cuenta 1', 'Cuenta 2', 'Cuenta 3'];
  const orders: Order[] = [];
  
  const salesStates: SalesState[] = ['pendiente_facturacion', 'facturada', 'venta_cancelada', 'nota_credito'];
  const logisticsStates: LogisticsState[] = ['pendiente_preparacion', 'listo_para_entregar', 'despachado_meli', 'retiro_local', 'entregado'];
  const meliStatuses: MeliStatus[] = ['ready_to_ship', 'shipped', 'delivered', 'cancelled'];
  
  for (let i = 1; i <= 30; i++) {
    const isCancelled = Math.random() > 0.9;
    const account = accounts[Math.floor(Math.random() * accounts.length)];
    
    // Logic to try and make states somewhat consistent
    let meliStatus: MeliStatus = 'ready_to_ship';
    let logisticsStatus: LogisticsState = 'pendiente_preparacion';
    let salesStatus: SalesState = 'pendiente_facturacion';

    if (isCancelled) {
      meliStatus = 'cancelled';
      salesStatus = 'venta_cancelada';
      logisticsStatus = 'cancelado_vuelto_stock';
    } else {
      const rand = Math.random();
      if (rand > 0.8) {
        meliStatus = 'delivered';
        logisticsStatus = 'entregado';
        salesStatus = 'facturada';
      } else if (rand > 0.5) {
        meliStatus = 'shipped';
        logisticsStatus = 'despachado_meli';
        salesStatus = 'facturada';
      } else if (rand > 0.3) {
        meliStatus = 'ready_to_ship';
        logisticsStatus = 'listo_para_entregar';
        salesStatus = 'facturada';
      }
    }

    orders.push({
      id: `internal-${i}`,
      meliOrderId: `MELI-${100000 + i}`,
      date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
      account: account,
      buyerName: `Comprador ${i}`,
      buyerAddress: `Calle Falsa ${123 + i}, CABA`,
      total: Math.floor(Math.random() * 50000) + 1000,
      items: [
        {
          id: `item-${i}`,
          title: `Producto Mock ${i}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: Math.floor(Math.random() * 10000) + 1000,
        }
      ],
      salesStatus,
      logisticsStatus,
      meliStatus,
      billingType: salesStatus === 'facturada' ? (Math.random() > 0.3 ? 'auto' : 'manual') : null,
    });
  }
  return orders;
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
