import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { useLumbaStore, Order, LogisticsState, MeliAccount } from "../../stores/lumbaStore";
import { OrderDetailModal } from "../../components/lumba/OrderDetailModal";
import { toast } from "sonner";
import { sweetAlert } from "../../utils/sweetAlert";
import { Card } from "../../components/Card";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faCheck, faEye, faTable, faGrip, faTruck, faPrint, faBoxOpen, faDownload } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "../../components/Badge";
import { Checkbox } from "../../components/Checkbox";
import { Button } from "../../components/Button";

import { useClientContextStore } from "../../stores/clientContextStore";

export const LogisticaPage: React.FC = () => {
  const { orders, selectedAccount, setAccount, searchQuery, setSearchQuery, dateFrom, dateTo, setDateRange, updateOrderLogisticsStatus, setOrderPackaged, setOrderTagStatus } = useLumbaStore();
  const { selectedClient } = useClientContextStore();

  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("status") || "TODAS";

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [exitingOrderIds, setExitingOrderIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    const saved = localStorage.getItem("logistica_view_mode");
    return saved === "table" || saved === "cards" ? saved : "cards";
  });

  // Save preference
  React.useEffect(() => {
    localStorage.setItem("logistica_view_mode", viewMode);
  }, [viewMode]);

  // Force cards view on mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("cards");
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Derived Data / Filtering ---
  const filteredOrders = useMemo(() => {
    let result = orders;

    // 0. Filter by Client Context
    if (selectedClient) {
      result = result.filter((o) => o.clientName === selectedClient.name);
    }

    // 1. Filter by Account
    if (selectedAccount !== "Todas") {
      result = result.filter((o) => o.account === selectedAccount);
    }

    // 2. Filter by Search Query
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter((o) => o.meliOrderId.toLowerCase().includes(lowerQ) || o.buyerName.toLowerCase().includes(lowerQ) || o.id.toLowerCase().includes(lowerQ));
    }

    // 3. Filter by Date Range
    if (dateFrom) {
      result = result.filter((o) => new Date(o.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      result = result.filter((o) => new Date(o.date) <= new Date(dateTo));
    }

    // 4. Filter by Tab (State) - Derived from URL
    const tabMap: Record<string, LogisticsState[]> = {
      PENDIENTE_PREPARACION: ["pendiente_preparacion"],
      LISTO_PARA_ENTREGAR: ["listo_para_entregar"],
      DESPACHADO_MELI: ["despachado_meli"],
      RETIRO_EN_LOCAL: ["retiro_local"],
      ENTREGADOS: ["entregado"],
      CANCELADOS: ["cancelado_vuelto_stock"],
      DEVOLUCION: ["devolucion_vuelto_stock"],
    };

    if (activeTab !== "TODAS") {
      const allowedStates = tabMap[activeTab];
      if (allowedStates) {
        result = result.filter((o) => allowedStates.includes(o.logisticsStatus));
      }
    }

    return result;
  }, [orders, selectedClient, selectedAccount, searchQuery, dateFrom, dateTo, activeTab]);

  // --- Selection Logic ---

  const toggleSelect = (orderId: string) => {
    setSelectedOrderIds((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  // --- Actions ---

  const executeAction = (orderId: string, action: string) => {
    switch (action) {
      case "PASAR_A_LISTO":
        updateOrderLogisticsStatus(orderId, "listo_para_entregar");
        break;
      case "EMPAQUETAR":
        setOrderPackaged(orderId, true);
        break;
      case "IMPRIMIR_ETIQUETA":
        setOrderTagStatus(orderId, "impresas");
        break;
      case "MARCAR_ENTREGADO":
        updateOrderLogisticsStatus(orderId, "entregado");
        break;
      case "ETIQUETA":
        // For bulk, maybe just trigger download or show toast
        // toast.success(`Descargando etiqueta para orden ${orderId}`);
        // Now also marks as printed
        setOrderTagStatus(orderId, "impresas");
        break;
    }
  };

  const handleAction = async (orderOrIds: Order | string[], action: string) => {
    const isBulk = Array.isArray(orderOrIds);
    const count = isBulk ? orderOrIds.length : 1;

    if (action === "VER" && !isBulk) {
      setSelectedOrder(orderOrIds as Order);
      return;
    }

    if (action === "ETIQUETA") {
      toast.success(isBulk ? "Descargando etiquetas..." : "Descargando etiqueta...");
      sweetAlert.info("Descargando", isBulk ? "Las etiquetas se están generando..." : "La etiqueta se está generando...");
      return;
    }

    if (action === "EMPAQUETAR") {
      if (isBulk) {
        (orderOrIds as string[]).forEach((id) => executeAction(id, action));
        sweetAlert.success("Acción completada", `Se empaquetaron ${count} ordenes.`);
      } else {
        executeAction((orderOrIds as Order).id, action);
        sweetAlert.success("Producto empaquetado", "");
      }
      return;
    }

    if (action === "IMPRIMIR_ETIQUETA") {
      const confirmHtml = renderToStaticMarkup(
        <span className="flex items-center gap-2">
          <FontAwesomeIcon icon={faDownload} />
          Imprimir etiqueta
        </span>,
      );

      const result = await sweetAlert.confirm("Confirmación", "Una vez que imprimas la etiqueta debes pegarla en el paquete para pasarla a Listo para entregar.", "info", confirmHtml, "Cancelar");

      if (result.isConfirmed) {
        if (isBulk) {
          const ids = orderOrIds as string[];
          ids.forEach((id) => executeAction(id, action));
          window.open(`/print-label/${ids.join(",")}`, "_blank");
          sweetAlert.success("Acción completada", `Se imprimieron ${count} etiquetas.`);
        } else {
          const id = (orderOrIds as Order).id;
          executeAction(id, action);
          window.open(`/print-label/${id}`, "_blank");
          // Optional: sweetAlert.success("Etiqueta impresa", "");
        }
      }
      return;
    }
    if (action === "PASAR_A_LISTO") {
      const idsToUpdate = isBulk ? (orderOrIds as string[]) : [(orderOrIds as Order).id];

      // Start exit animation
      setExitingOrderIds((prev) => [...prev, ...idsToUpdate]);

      // Wait for animation to finish before removing from list
      setTimeout(() => {
        if (isBulk) {
          (orderOrIds as string[]).forEach((id) => executeAction(id, action));
          sweetAlert.success("Acción completada", `Se actualizaron ${count} ordenes.`);
        } else {
          executeAction((orderOrIds as Order).id, action);
          sweetAlert.success("Acción completada", "La orden ha sido actualizada.");
        }
        // Cleanup exiting state
        setExitingOrderIds((prev) => prev.filter((id) => !idsToUpdate.includes(id)));
      }, 500); // 500ms matches the CSS transition duration

      return;
    }

    let title = "¿Estás seguro?";
    let confirmText = "Confirmar";
    let icon: "info" | "warning" | "success" | "error" | "question" = "info";

    switch (action) {
      case "MARCAR_ENTREGADO":
        title = count > 1 ? "Marcar como Entregados" : "Marcar como Entregado";
        confirmText = "Entregar";
        break;
    }

    const result = await sweetAlert.confirm(title, `Vas a aplicar la acción a ${count} orden(es).`, icon, confirmText);

    if (result.isConfirmed) {
      if (isBulk) {
        (orderOrIds as string[]).forEach((id) => executeAction(id, action));
        setSelectedOrderIds([]); // Clear selection handling
        sweetAlert.success("Acción completada", `Se actualizaron ${count} ordenes.`);
      } else {
        executeAction((orderOrIds as Order).id, action);
        sweetAlert.success("Acción completada", "La orden ha sido actualizada.");
      }
    }
  };

  const renderActions = (order: Order, _isModal: boolean = false, _isCard: boolean = false) => {
    const buttons = [];

    if (order.logisticsStatus === "pendiente_preparacion") {
      const isPackaged = order.packaged;
      const isLabeled = order.tagStatus === "impresas";

      // 1. Empaquetado
      buttons.push(
        <Button key="pack" onClick={() => handleAction(order, "EMPAQUETAR")} variant={isPackaged ? "grey" : "blue"} size="sm" disabled={isPackaged} className={`flex items-center gap-2`}>
          <FontAwesomeIcon icon={faBoxOpen} />
          {isPackaged ? "Empaquetado" : "Empaquetar"}
        </Button>,
      );

      // 2. Imprimir Etiqueta
      buttons.push(
        <Button key="print" onClick={() => handleAction(order, "IMPRIMIR_ETIQUETA")} variant={isLabeled ? "grey" : "blue"} size="sm" disabled={!isPackaged || isLabeled} className={`flex items-center gap-2`} title={!isPackaged ? "Primero debes empaquetar" : ""}>
          <FontAwesomeIcon icon={faPrint} />
          {isLabeled ? "Impresa" : "Imprimir Etiqueta"}
        </Button>,
      );

      // 3. Listo para entregar
      // Solo disponible si está todo listo (empaquetado y etiquetado)
      buttons.push(
        <Button
          key="listo"
          onClick={() => handleAction(order, "PASAR_A_LISTO")}
          variant="blue"
          size="sm"
          disabled={!isLabeled || !isPackaged} // Strict dependency
          className={`flex items-center gap-2 ${!isLabeled || !isPackaged ? "opacity-50 cursor-not-allowed" : ""}`}
          title={!isLabeled ? "Falta imprimir etiqueta" : ""}
        >
          <FontAwesomeIcon icon={faTruck} />
          Listo para entregar
        </Button>,
      );
    }

    if (order.logisticsStatus === "retiro_local") {
      buttons.push(
        <button key="entregado" onClick={() => handleAction(order, "MARCAR_ENTREGADO")} className="text-blue-600 hover:text-blue-800 p-1.5 transition-colors" title="Marcar Entregado">
          <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
        </button>,
      );
    }

    return (
      <div className="flex gap-2 flex-nowrap items-center justify-start w-full" onClick={(e) => e.stopPropagation()}>
        {buttons}
      </div>
    );
  };

  // Filter Options
  const accountOptions = [
    { value: "Todas", label: "Todas las Cuentas" },
    { value: "Cuenta 1", label: "Cuenta 1" },
    { value: "Cuenta 2", label: "Cuenta 2" },
    { value: "Cuenta 3", label: "Cuenta 3" },
  ];

  const titleMap: Record<string, string> = {
    TODAS: "Logística: Todos los pedidos",
    PENDIENTE_PREPARACION: "En preparación",
    LISTO_PARA_ENTREGAR: "Listo para entregar",
    DESPACHADO_MELI: "Despachado M.L.",
    RETIRO_EN_LOCAL: "Retiro en local",
    ENTREGADOS: "Entregados",
    CANCELADOS: "Cancelados",
    DEVOLUCION: "Devolución",
  };

  const currentTitle = titleMap[activeTab] || activeTab.replace(/_/g, " ");

  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredOrders.length === 0 ? (
        <div className="col-span-full text-center py-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500">No se encontraron pedidos</div>
      ) : (
        filteredOrders.map((order) => (
          <Card
            key={order.id}
            header={{
              title: order.id,
              subtitle: new Date(order.date).toLocaleDateString(),
              icon: faTruck,
              badges: [
                {
                  text: order.logisticsStatus.replace(/_/g, " "),
                  variant: order.logisticsStatus === "entregado" ? "success" : order.logisticsStatus.includes("cancelado") ? "warning" : "info",
                },
              ],
            }}
            footer={{
              leftContent: <div className="w-full">{renderActions(order, false, true)}</div>,
            }}
            onClick={() => handleAction(order, "VER")}
          >
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Items:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{order.items.length > 0 ? order.items[0].title : "-"}</span>
              </div>
              {order.items.length > 0 && order.items[0].variant && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Variante:</span>
                  <span className="text-gray-900 dark:text-gray-100">{order.items[0].variant}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Estado ML:</span>
                <span className="text-gray-900 dark:text-gray-100">{order.meliStatus}</span>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 p-2 rounded">
                  <span className="text-xs text-gray-500">Etiqueta:</span>
                  <Badge>{order.tagStatus}</Badge>
                </div>
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 p-2 rounded">
                  <span className="text-xs text-gray-500">Entrega ML:</span>
                  <Badge>{order.shippingStatus === "delivered" ? "Entregado" : "No Entregado"}</Badge>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <PageLayout
      title={currentTitle}
      subtitle="Gestión de envíos y logística"
      faIcon={{ icon: faTruck }}
      headerActions={null}
      searchAndFilters={
        <SearchAndFilters
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por ID, comprador..."
          filters={[
            {
              value: selectedAccount,
              onChange: (val) => setAccount(val as MeliAccount),
              options: accountOptions,
            },
          ]}
          dateFilter={{
            startDate: dateFrom,
            endDate: dateTo,
            onStartDateChange: (val) => setDateRange(val, dateTo),
            onEndDateChange: (val) => setDateRange(dateFrom, val),
          }}
        >
          <div className="hidden md:flex items-center bg-accent-3 border border-accent-4 rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === "table" ? "bg-blue-600 text-white shadow-sm" : "text-accent-4 hover:text-accent-5 hover:bg-accent-2"}`} title="Ver como tabla">
              <FontAwesomeIcon icon={faTable} />
              <span className="hidden sm:inline">Tabla</span>
            </button>
            <button onClick={() => setViewMode("cards")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === "cards" ? "bg-blue-600 text-white shadow-sm" : "text-accent-4 hover:text-accent-5 hover:bg-accent-2"}`} title="Ver como tarjetas">
              <FontAwesomeIcon icon={faGrip} />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </SearchAndFilters>
      }
    >
      {viewMode === "table" ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Bulk Actions Toolbar */}
          {/* Bulk Actions Toolbar */}
          <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-2 flex items-center justify-between border-b border-blue-100 dark:border-blue-800 h-14">
            <div className="flex gap-2">
              <Button onClick={() => handleAction(selectedOrderIds, "PASAR_A_LISTO")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0}>
                Pasar a Listo
              </Button>
              <Button onClick={() => handleAction(selectedOrderIds, "MARCAR_ENTREGADO")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0}>
                Marcar Entregado
              </Button>
              <Button onClick={() => handleAction(selectedOrderIds, "ETIQUETA")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0}>
                Etiquetas
              </Button>
            </div>
            {selectedOrderIds.length > 0 && <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{selectedOrderIds.length} seleccionados</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  <th scope="col" className="px-6 py-3 w-4">
                    <Checkbox checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length} onChange={toggleSelectAll} />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Acciones
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Fecha ML
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Cliente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Id ML
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Publicación
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Cantidad
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No se encontraron pedidos
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={`
                        hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-500 ease-in-out
                        ${selectedOrderIds.includes(order.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                        ${exitingOrderIds.includes(order.id) ? "transform -translate-x-full opacity-0" : "transform translate-x-0 opacity-100"}
                      `}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Checkbox checked={selectedOrderIds.includes(order.id)} onChange={() => toggleSelect(order.id)} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">{renderActions(order)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{order.clientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">{order.meliOrderId}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={order.items.length > 0 ? order.items[0].title : ""}>
                          {order.items.length > 0 ? order.items[0].title : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500">{order.items.length > 0 ? order.items[0].quantity : 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(order, "VER");
                          }}
                          variant="blue"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={faEye} />
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        renderCards()
      )}

      <OrderDetailModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} renderActions={(order) => renderActions(order, true)} />
    </PageLayout>
  );
};
