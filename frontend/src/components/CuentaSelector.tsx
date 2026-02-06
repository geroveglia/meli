import { useState, useEffect, useRef, useCallback } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, User, Check } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useCuentaContextStore, Cuenta } from "../stores/cuentaContextStore";
import { createNavbarEventListener, NavbarEventDetail } from "../utils/navbarEvents";
import { cuentasAPI } from "../api/cuentas";

interface CuentaSelectorProps {
  className?: string;
  onCuentaChange?: (cuenta: Cuenta | null) => void;
}

const CuentaSelector = ({ className = "", onCuentaChange }: CuentaSelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Store
  const selectedCuenta = useCuentaContextStore((state) => state.selectedCuenta);
  const setCuenta = useCuentaContextStore((state) => state.setCuenta);
  const clearCuenta = useCuentaContextStore((state) => state.clearCuenta);

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch cuentas
  const fetchCuentas = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await cuentasAPI.list({ limit: 100 });
      setCuentas(response.cuentas || []);
    } catch (error) {
      console.error("Error fetching cuentas:", error);
      setCuentas([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  // Listen for cuentas-changed events
  useEffect(() => {
    const unsubscribe = createNavbarEventListener("cuentasChanged", (detail: NavbarEventDetail) => {
      console.log("Cuentas changed event received:", detail);
      fetchCuentas();
    });
    return unsubscribe;
  }, [fetchCuentas]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter cuentas by search query
  const filteredCuentas = cuentas.filter((cuenta) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return cuenta.name?.toLowerCase().includes(query) || cuenta.email?.toLowerCase().includes(query);
  });

  // Handle cuenta selection
  const handleSelectCuenta = (cuenta: Cuenta) => {
    setCuenta(cuenta);
    setIsOpen(false);
    setSearchQuery("");
    onCuentaChange?.(cuenta);
    // No navegamos - solo cambiamos el contexto para que la página actual filtre los datos
  };

  // Handle "Todos" selection
  const handleSelectAll = () => {
    clearCuenta();
    setIsOpen(false);
    setSearchQuery("");
    onCuentaChange?.(null);
    // No navegamos - solo limpiamos el contexto para mostrar todos los datos
  };

  // Handle clear cuenta
  const handleClearCuenta = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearCuenta();
    onCuentaChange?.(null);
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label "CUENTA" */}
      <div className="text-accent-7 text-xs font-semibold mb-2 uppercase tracking-wide">Cuenta</div>

      {/* Trigger Button */}
      <div onClick={toggleDropdown} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${isOpen ? "ring-2 ring-accent-5" : ""} bg-accent-2 hover:bg-accent-3 border border-accent-4 shadow-sm`} role="button" tabIndex={0}>
        <span className="flex items-center min-w-0">
          {/* User Icon */}
          <div className="w-5 h-5 flex items-center justify-center mr-3 text-accent-7">
            <User size={20} />
          </div>

          <span className="text-accent-1 font-semibold truncate text-sm">{selectedCuenta ? selectedCuenta.name : "Todos"}</span>
        </span>

        <div className="flex items-center ml-2">
          {selectedCuenta && (
            <button onClick={handleClearCuenta} className="mr-2 p-1 rounded-md hover:bg-accent-4 text-accent-7 hover:text-accent-9 transition-colors duration-150" title="Deseleccionar cuenta">
              <X size={14} />
            </button>
          )}
          <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 text-accent-5 transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Línea separadora */}
      <div className="border-b border-accent-3 mt-1 mb-2" />

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="
              absolute top-full left-0 mt-1
              w-full min-w-[200px] max-h-72
              bg-accent-2
              rounded-lg shadow-xl
              border border-accent-4
              overflow-hidden z-50
            "
          >
            {/* Search Input */}
            <div className="p-2 border-b border-accent-3">
              <div
                className="
                flex items-center gap-2 px-2 py-1.5
                bg-accent-3
                rounded-md
              "
              >
                <Search size={14} className="text-accent-5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cuenta..."
                  className="
                    flex-1 bg-transparent border-none outline-none
                    text-xs text-accent-9
                    placeholder:text-accent-5
                  "
                  autoFocus
                />
              </div>
            </div>

            {/* Cuenta List */}
            <div className="max-h-56 overflow-y-auto">
              {/* "Todos" option - Always visible */}
              <button
                onClick={handleSelectAll}
                className={`
                  w-full flex items-center gap-2 px-2 py-2
                  text-left transition-colors duration-150 border-b border-accent-3
                  ${!selectedCuenta ? "bg-accent-3" : "hover:bg-accent-2"}
                `}
              >
                <div
                  className={`
                    flex items-center justify-center
                    w-7 h-7 rounded-md shrink-0
                    ${!selectedCuenta ? "bg-accent-9 text-accent-2" : "bg-accent-3 text-accent-7"}
                    text-xs font-bold
                  `}
                >
                  <User size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${!selectedCuenta ? "text-accent-9" : "text-accent-8"}`}>Todos</p>
                  <p className="text-[10px] text-accent-7 truncate">Ver todas las cuentas</p>
                </div>
                {!selectedCuenta && <Check size={14} className="text-accent-9 shrink-0" />}
              </button>

              {isLoading ? (
                <div className="p-4 text-center text-accent-7">
                  <div className="animate-spin w-5 h-5 border-2 border-accent-9 border-t-transparent rounded-full mx-auto mb-2" />
                  Cargando...
                </div>
              ) : filteredCuentas.length === 0 ? (
                <div className="p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-accent-7 mb-3">No hay cuentas disponibles</p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // navigate("/admin/cuentas"); // TODO: Reactivate when route is confirmed
                    }}
                    className="
                      flex items-center gap-2 px-4 py-2
                      bg-accent-9 hover:bg-accent-8
                      text-accent-2 text-sm font-medium
                      rounded-lg transition-colors
                    "
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    Nueva Cuenta
                  </button>
                </div>
              ) : (
                filteredCuentas.map((cuenta) => {
                  const isSelected = selectedCuenta?._id === cuenta._id;
                  return (
                    <button
                      key={cuenta._id}
                      onClick={() => handleSelectCuenta(cuenta)}
                      className={`
                        w-full flex items-center gap-2 px-2 py-2
                        text-left transition-colors duration-150
                        ${isSelected ? "bg-accent-3" : "hover:bg-accent-2"}
                      `}
                    >
                      {/* Avatar */}
                      <div
                        className={`
                        flex items-center justify-center
                        w-7 h-7 rounded-md shrink-0
                        ${isSelected ? "bg-accent-9 text-accent-2" : "bg-accent-3 text-accent-7"}
                        text-xs font-bold
                      `}
                      >
                        {cuenta.avatar ? <img src={cuenta.avatar} alt={cuenta.name} className="w-full h-full rounded-md object-cover" /> : cuenta.name?.charAt(0).toUpperCase() || <User size={14} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`
                          text-sm font-medium truncate
                          ${isSelected ? "text-accent-9" : "text-accent-8"}
                        `}
                        >
                          {cuenta.name}
                        </p>
                        <p className="text-[10px] text-accent-7 truncate">{cuenta.email}</p>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && <Check size={14} className="text-accent-9 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CuentaSelector;
