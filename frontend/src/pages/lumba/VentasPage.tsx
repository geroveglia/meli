import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLumbaStore, Order, SalesState } from "../../stores/lumbaStore";
import { OrderDetailModal } from "../../components/lumba/OrderDetailModal";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { useSearchParams } from "react-router-dom";
import { faFile, faBan, faFileInvoiceDollar, faUsersGear, faEye, faTable, faGrip } from "@fortawesome/free-solid-svg-icons";
import { Checkbox } from "../../components/Checkbox";
import { Button } from "../../components/Button";
import { sweetAlert } from "../../utils/sweetAlert";
import { Card } from "../../components/Card";

import { useCuentaContextStore } from "../../stores/cuentaContextStore";

export const VentasPage: React.FC = () => {
  const { orders, accounts, selectedAccount, searchQuery, dateFrom, dateTo, setAccount, setSearchQuery, setDateRange, updateOrderSalesStatus, fetchOrders } = useLumbaStore();
  const { selectedCuenta } = useCuentaContextStore();

  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("status") || "TODAS";

  // Fetch orders on mount
  // Fetch orders on mount
  React.useEffect(() => {
      const init = async () => {
          await fetchAccounts();
          await fetchOrders();
      };
      init();
      
      const interval = setInterval(fetchOrders, 30000); // Poll every 30s
      return () => clearInterval(interval);
  }, []);

  // Derived state for filter options
  const filters = [
    {
      value: typeof selectedAccount === "string" ? selectedAccount : selectedAccount.id,
      onChange: (val: string) => {
          if (val === "Todas") {
              setAccount("Todas");
          } else {
              const account = accounts.find((a) => typeof a !== "string" && a.id === val);
              if (account) setAccount(account);
          }
      },
      options: [
        { value: "Todas", label: "Todas las Cuentas" },
        ...accounts
            .filter((a) => typeof a !== "string") // Exclude "Todas" if strictly typed, though accounts usually includes it? check store
            .map((a) => {
                const acc = a as import("../../stores/lumbaStore").TenantAccount;
                return { value: acc.id, label: acc.name };
            }),
      ],
    },
  ];

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [exitingOrderIds, setExitingOrderIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    const saved = localStorage.getItem("ventas_view_mode");
    return saved === "table" || saved === "cards" ? saved : "cards";
  });

  // Save preference
  React.useEffect(() => {
    localStorage.setItem("ventas_view_mode", viewMode);
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

    // 0. Filter by Client Context (Navbar Selection)
    if (selectedCuenta) {
       // Filter orders where the order's account matches the selected client
       result = result.filter((o) => {
           if (typeof o.account === 'string') return false; // "N/A" or "Cuenta Desconocida"
           return o.account.id === selectedCuenta._id;
       });
    }

    // 1. Filter by Account (Page Filter)
    if (selectedAccount !== "Todas") {
      result = result.filter((o) => {
          if (typeof o.account === 'string') return false;
          if (typeof selectedAccount === 'string') return false; // Should not happen if not "Todas"
          return o.account.id === selectedAccount.id;
      });
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

    // 4. Filter by Tab (State)
    const tabMap: Record<string, SalesState[]> = {
      PENDIENTE_FACTURACION: ["pendiente_facturacion"],
      FACTURADAS: ["facturada"],
      VENTAS_CANCELADAS: ["venta_cancelada"],
      NOTAS_DE_CREDITO: ["nota_credito"],
    };

    if (activeTab !== "TODAS") {
      const allowedStates = tabMap[activeTab];
      if (allowedStates) {
        result = result.filter((o) => allowedStates.includes(o.salesStatus));
      }
    }

    return result;
  }, [orders, selectedCuenta, selectedAccount, searchQuery, dateFrom, dateTo, activeTab]);

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
      case "FACTURAR_AUTO":
        updateOrderSalesStatus(orderId, "facturada", "auto");
        break;
      case "FACTURAR_MANUAL":
        updateOrderSalesStatus(orderId, "facturada", "manual");
        break;
      case "CANCELAR":
        updateOrderSalesStatus(orderId, "venta_cancelada");
        break;
      case "GENERAR_NC":
        updateOrderSalesStatus(orderId, "nota_credito");
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

    let title = "¿Estás seguro?";
    let confirmText = "Confirmar";
    let icon: "info" | "warning" | "success" | "error" | "question" = "info";

    switch (action) {
      case "FACTURAR_MANUAL":
        title = count > 1 ? "Facturar Pedidos" : "Facturar Pedido";
        confirmText = "Facturar";
        break;
      case "CANCELAR":
        title = count > 1 ? "Cancelar Ventas" : "Cancelar Venta";
        confirmText = "Cancelar";
        icon = "warning";
        break;
      case "GENERAR_NC":
        title = "Generar Nota de Crédito";
        confirmText = "Generar NC";
        break;
    }

    const result = await sweetAlert.confirm(title, `Vas a aplicar la acción a ${count} orden(es).`, icon, confirmText);

    if (result.isConfirmed) {
      const idsToUpdate = isBulk ? (orderOrIds as string[]) : [(orderOrIds as Order).id];
      setExitingOrderIds((prev) => [...prev, ...idsToUpdate]);

      setTimeout(() => {
        if (isBulk) {
          (orderOrIds as string[]).forEach((id) => executeAction(id, action));
          setSelectedOrderIds([]);
          sweetAlert.success("Acción completada", `Se actualizaron ${count} ordenes.`);
        } else {
          executeAction((orderOrIds as Order).id, action);
          sweetAlert.success("Acción completada", "La orden ha sido actualizada.");
        }
        setExitingOrderIds((prev) => prev.filter((id) => !idsToUpdate.includes(id)));
      }, 500);
    }
  };

  const renderActions = (order: Order, isModal: boolean = false, isCard: boolean = false) => {
    if (isModal) return null;

    const buttons = [];

    // 1. Primary Actions (Invoice, NC) - Left
    if (order.salesStatus === "pendiente_facturacion") {
      buttons.push(
        <Button key="manual" onClick={() => handleAction(order, "FACTURAR_MANUAL")} variant="blue" size="sm" className={`flex items-center gap-2`} title={!isCard ? "Facturar" : ""}>
          <FontAwesomeIcon icon={faFile} />
        </Button>,
      );
    }

    if (order.salesStatus === "facturada") {
      buttons.push(
        <Button key="nc" onClick={() => handleAction(order, "GENERAR_NC")} variant="blue" size="sm" className={`flex items-center gap-2`} title={!isCard ? "Generar NC" : ""}>
          <FontAwesomeIcon icon={faFileInvoiceDollar} />
        </Button>,
      );
    }

    // 3. Destructive/Cancel - Right (Last)
    if (order.salesStatus === "pendiente_facturacion") {
      buttons.push(
        <Button key="cancel" onClick={() => handleAction(order, "CANCELAR")} variant="danger" size="sm" className={`flex items-center gap-2`} title={!isCard ? "Cancelar" : ""}>
          <FontAwesomeIcon icon={faBan} />
        </Button>,
      );
    }

    return (
      <div className={`flex gap-2 flex-nowrap w-full items-center ${isCard ? "justify-end" : "justify-center"}`} onClick={(e) => e.stopPropagation()}>
        {buttons}
      </div>
    );
  };



  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredOrders.length === 0 ? (
        <div className="col-span-full text-center py-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500">No se encontraron pedidos</div>
      ) : (
        filteredOrders.map((order) => (
          <Card
            key={order.id}
            className={`
              hover:scale-105 hover:shadow-lg transition-all duration-500 ease-in-out
              ${exitingOrderIds.includes(order.id) ? "transform -translate-x-full opacity-0" : "transform translate-x-0 opacity-100"}
            `}
            header={{
              title: order.id,
              subtitle: new Date(order.date).toLocaleDateString(),
              icon: faUsersGear,
            }}
            footer={{
              leftContent: <div className="w-full">{renderActions(order, false, true)}</div>,
            }}
            onClick={() => handleAction(order, "VER")}
          >
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Cuenta:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{order.clientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Id ML:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{order.meliOrderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Publicación:</span>
                <span className="text-gray-900 dark:text-gray-100 truncate max-w-[150px]" title={order.items.length > 0 ? order.items[0].title : "-"}>
                  {order.items.length > 0 ? order.items[0].title : "-"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total pagado:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">${order.total.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  // --- Info Modal State ---
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const infoContent = (
    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
      <p>Acciones disponibles para gestionar la facturación de tus ventas:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Facturar:</strong> Inicia el proceso de facturación manual para la orden.
        </li>
        <li>
          <strong>NC:</strong> Genera una Nota de Crédito para la orden facturada.
        </li>
        <li>
          <strong>Cancelar:</strong> Cancela la orden de venta (Solo si no está facturada).
        </li>
        <li>
          <strong>Ver detalle:</strong> Muestra toda la información detallada de la orden.
        </li>
      </ul>
    </div>
  );

  // --- Title Mapping ---
  const tabTitles: Record<string, string> = {
    TODAS: "Ventas",
    PENDIENTE_FACTURACION: "Pendiente de facturación",
    FACTURADAS: "Facturadas",
    VENTAS_CANCELADAS: "Ventas Canceladas",
    NOTAS_DE_CREDITO: "Notas de Crédito",
  };

  const pageTitle = tabTitles[activeTab] || "Ventas";

  return (
    <PageLayout
      title={pageTitle}
      subtitle="Facturación y notas de crédito"
      showInfoIcon={true}
      infoModal={{
        isOpen: isInfoOpen,
        onOpen: () => setIsInfoOpen(true),
        onClose: () => setIsInfoOpen(false),
        title: "Ayuda Ventas",
        content: infoContent,
      }}
      searchAndFilters={
        <SearchAndFilters
          searchPlaceholder="Buscar por ID, comprador..."
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
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
              {/* Dynamic Bulk Actions */}
              {(activeTab === "PENDIENTE_FACTURACION" || activeTab === "TODAS") && (
                <>
                  <Button onClick={() => handleAction(selectedOrderIds, "FACTURAR_MANUAL")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0} className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faFile} />
                    Facturar
                  </Button>
                  <Button onClick={() => handleAction(selectedOrderIds, "CANCELAR")} variant="danger" size="sm" disabled={selectedOrderIds.length === 0} className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faBan} />
                    Cancelar
                  </Button>
                </>
              )}

              {activeTab === "FACTURADAS" && (
                <Button onClick={() => handleAction(selectedOrderIds, "GENERAR_NC")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileInvoiceDollar} />
                  Generar NC
                </Button>
              )}
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
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Acciones
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Fecha ML
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Cuenta
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Id venta RTSS
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Id ML
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider w-[30%]">
                    Publicación
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Total pagado
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
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
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">{renderActions(order)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{order.clientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">{order.meliOrderId}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-900 dark:text-white line-clamp-2" title={order.items.length > 0 ? order.items[0].title : ""}>
                          {order.items.length > 0 ? order.items[0].title : "-"}
                          {order.items.length > 1 && <span className="text-gray-400 ml-1">(+{order.items.length - 1})</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">${order.total.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(order, "VER");
                          }}
                          variant="blue"
                          size="sm"
                          className="flex items-center gap-2 mx-auto"
                          title="Ver detalle"
                        >
                          <FontAwesomeIcon icon={faEye} />
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
