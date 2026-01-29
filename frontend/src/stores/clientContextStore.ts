import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Client, ClientStatus } from "../api/clients";
export type { Client, ClientStatus };

interface ClientContextState {
  selectedClient: Client | null;
  setClient: (client: Client) => void;
  clearClient: () => void;
}

export const useClientContextStore = create<ClientContextState>()(
  persist(
    (set) => ({
      selectedClient: null,
      
      setClient: (client: Client) => {
        set({ selectedClient: client });
      },
      
      clearClient: () => {
        set({ selectedClient: null });
      },
    }),
    {
      name: "antigravity-storage-client",
      // Solo persistir el cliente seleccionado
      partialize: (state) => ({ selectedClient: state.selectedClient }),
    }
  )
);

// Hook de conveniencia para obtener solo el cliente
export const useSelectedClient = () => {
  return useClientContextStore((state) => state.selectedClient);
};

// Hook de conveniencia para las acciones
export const useClientActions = () => {
  const setClient = useClientContextStore((state) => state.setClient);
  const clearClient = useClientContextStore((state) => state.clearClient);
  return { setClient, clearClient };
};
