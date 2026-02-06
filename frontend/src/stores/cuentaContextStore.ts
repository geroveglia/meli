import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Cuenta, CuentaStatus } from "../api/cuentas";
export type { Cuenta, CuentaStatus };

interface CuentaContextState {
  selectedCuenta: Cuenta | null;
  setCuenta: (cuenta: Cuenta) => void;
  clearCuenta: () => void;
}

export const useCuentaContextStore = create<CuentaContextState>()(
  persist(
    (set) => ({
      selectedCuenta: null,
      
      setCuenta: (cuenta: Cuenta) => {
        set({ selectedCuenta: cuenta });
      },
      
      clearCuenta: () => {
        set({ selectedCuenta: null });
      },
    }),
    {
      name: "antigravity-storage-cuenta",
      // Solo persistir la cuenta seleccionada
      partialize: (state) => ({ selectedCuenta: state.selectedCuenta }),
    }
  )
);

// Hook de conveniencia para obtener solo la cuenta
export const useSelectedCuenta = () => {
  return useCuentaContextStore((state) => state.selectedCuenta);
};

// Hook de conveniencia para las acciones
export const useCuentaActions = () => {
  const setCuenta = useCuentaContextStore((state) => state.setCuenta);
  const clearCuenta = useCuentaContextStore((state) => state.clearCuenta);
  return { setCuenta, clearCuenta };
};
