import { useState, useEffect, useRef, useCallback } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, User, Check } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useClientContextStore, Client } from "../stores/clientContextStore";
import { createNavbarEventListener, NavbarEventDetail } from "../utils/navbarEvents";
import { clientsAPI } from "../api/clients";

interface ClientSelectorProps {
  className?: string;
  onClientChange?: (client: Client | null) => void;
}

const ClientSelector = ({ className = "", onClientChange }: ClientSelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Store
  const selectedClient = useClientContextStore((state) => state.selectedClient);
  const setClient = useClientContextStore((state) => state.setClient);
  const clearClient = useClientContextStore((state) => state.clearClient);

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await clientsAPI.list({ limit: 100 });
      setClients(response.clients || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Listen for clients-changed events
  useEffect(() => {
    const unsubscribe = createNavbarEventListener("clientsChanged", (detail: NavbarEventDetail) => {
      console.log("Clients changed event received:", detail);
      fetchClients();
    });
    return unsubscribe;
  }, [fetchClients]);

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

  // Filter clients by search query
  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return client.name?.toLowerCase().includes(query) || client.email?.toLowerCase().includes(query);
  });

  // Handle client selection
  const handleSelectClient = (client: Client) => {
    setClient(client);
    setIsOpen(false);
    setSearchQuery("");
    onClientChange?.(client);
    // No navegamos - solo cambiamos el contexto para que la página actual filtre los datos
  };

  // Handle "Todos" selection
  const handleSelectAll = () => {
    clearClient();
    setIsOpen(false);
    setSearchQuery("");
    onClientChange?.(null);
    // No navegamos - solo limpiamos el contexto para mostrar todos los datos
  };

  // Handle clear client
  const handleClearClient = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearClient();
    onClientChange?.(null);
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
      {/* Label "CLIENTE" */}
      <div className="text-accent-7 text-xs font-semibold mb-2 uppercase tracking-wide">Cliente</div>

      {/* Trigger Button */}
      <div onClick={toggleDropdown} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${isOpen ? "ring-2 ring-accent-5" : ""} bg-accent-2 hover:bg-accent-3 border border-accent-4 shadow-sm`} role="button" tabIndex={0}>
        <span className="flex items-center min-w-0">
          {/* User Icon */}
          <div className="w-5 h-5 flex items-center justify-center mr-3 text-accent-7">
            <User size={20} />
          </div>

          <span className="text-accent-1 font-semibold truncate text-sm">{selectedClient ? selectedClient.name : "Todos"}</span>
        </span>

        <div className="flex items-center ml-2">
          {selectedClient && (
            <button onClick={handleClearClient} className="mr-2 p-1 rounded-md hover:bg-accent-4 text-accent-7 hover:text-accent-9 transition-colors duration-150" title="Deseleccionar cliente">
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
                  placeholder="Buscar cliente..."
                  className="
                    flex-1 bg-transparent border-none outline-none
                    text-xs text-accent-9
                    placeholder:text-accent-5
                  "
                  autoFocus
                />
              </div>
            </div>

            {/* Client List */}
            <div className="max-h-56 overflow-y-auto">
              {/* "Todos" option - Always visible */}
              <button
                onClick={handleSelectAll}
                className={`
                  w-full flex items-center gap-2 px-2 py-2
                  text-left transition-colors duration-150 border-b border-accent-3
                  ${!selectedClient ? "bg-accent-3" : "hover:bg-accent-2"}
                `}
              >
                <div
                  className={`
                    flex items-center justify-center
                    w-7 h-7 rounded-md shrink-0
                    ${!selectedClient ? "bg-accent-9 text-accent-2" : "bg-accent-3 text-accent-7"}
                    text-xs font-bold
                  `}
                >
                  <User size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${!selectedClient ? "text-accent-9" : "text-accent-8"}`}>Todos</p>
                  <p className="text-[10px] text-accent-7 truncate">Ver todos los clientes</p>
                </div>
                {!selectedClient && <Check size={14} className="text-accent-9 shrink-0" />}
              </button>

              {isLoading ? (
                <div className="p-4 text-center text-accent-7">
                  <div className="animate-spin w-5 h-5 border-2 border-accent-9 border-t-transparent rounded-full mx-auto mb-2" />
                  Cargando...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-accent-7 mb-3">No hay clientes disponibles</p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/admin/clients");
                    }}
                    className="
                      flex items-center gap-2 px-4 py-2
                      bg-accent-9 hover:bg-accent-8
                      text-accent-2 text-sm font-medium
                      rounded-lg transition-colors
                    "
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    Nuevo Cliente
                  </button>
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClient?._id === client._id;
                  return (
                    <button
                      key={client._id}
                      onClick={() => handleSelectClient(client)}
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
                        {client.avatar ? <img src={client.avatar} alt={client.name} className="w-full h-full rounded-md object-cover" /> : client.name?.charAt(0).toUpperCase() || <User size={14} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`
                          text-sm font-medium truncate
                          ${isSelected ? "text-accent-9" : "text-accent-8"}
                        `}
                        >
                          {client.name}
                        </p>
                        <p className="text-[10px] text-accent-7 truncate">{client.email}</p>
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

export default ClientSelector;
