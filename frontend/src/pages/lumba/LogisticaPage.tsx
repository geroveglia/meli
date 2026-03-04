import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { useLumbaStore, Order, LogisticsState } from "../../stores/lumbaStore";
import { OrderDetailModal } from "../../components/lumba/OrderDetailModal";
import { toast } from "sonner";
import { sweetAlert } from "../../utils/sweetAlert";
import { Card } from "../../components/Card";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faCheck, faEye, faTable, faGrip, faTruck, faPrint, faBoxOpen, faDownload, faHome } from "@fortawesome/free-solid-svg-icons";

import { Checkbox } from "../../components/Checkbox";
import { Button } from "../../components/Button";

import { useCuentaContextStore } from "../../stores/cuentaContextStore";

export const LogisticaPage: React.FC = () => {
  const {
    orders,
    accounts, // Import accounts for dynamic lookup
    selectedAccount,
    setAccount,
    searchQuery,
    setSearchQuery,
    dateFrom,
    dateTo,
    setDateRange,
    updateOrderLogisticsStatus,
    setOrderPackaged,
    setOrderTagStatus,
    fetchAccounts,
    fetchOrders
  } = useLumbaStore();
  const { selectedCuenta } = useCuentaContextStore();

  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("status") || "TODAS";
  const showShippingCutoff = ["TODAS", "PENDIENTE_PREPARACION", "LISTO_PARA_ENTREGAR"].includes(activeTab);

  // Fetch orders on mount
  React.useEffect(() => {
      const init = async () => {
          await fetchAccounts();
          await fetchOrders();
      };
      init();
      
      const interval = setInterval(fetchOrders, 30000); 
      return () => clearInterval(interval);
  }, []);

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

  // Ensure selectedAccount is consistent with selectedCuenta (Global Context)
  React.useEffect(() => {
      if (selectedCuenta && selectedAccount !== "Todas") {
          // If we are in a specific client context, but the selected filter is for a different account
          if (selectedAccount.id !== selectedCuenta._id) {
               setAccount("Todas");
          }
      }
  }, [selectedCuenta, selectedAccount, setAccount]);

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

    // 1. Filter by Account
    if (selectedAccount !== "Todas") {
      result = result.filter((o) => {
          if (typeof selectedAccount === 'string') return false; // Should not happen if not "Todas"
          
          if (selectedAccount.type === 'tenant') {
              // Tenant Filter: Match Tenant ID
              return o.tenantId === selectedAccount.id;
          } else {
              // Account (Client) Filter: Match Client ID (Account ID)
              if (typeof o.account === 'string') return false;
              return o.account.id === selectedAccount.id;
          }
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

    // 4. Filter by Tab (State) - Derived from URL
    const tabMap: Record<string, LogisticsState[]> = {
      PENDIENTE_PREPARACION: ["pendiente_preparacion"],
      LISTO_PARA_ENTREGAR: ["listo_para_entregar"],
      DESPACHADO_MELI: ["despachado_meli"],
      RETIRO_EN_LOCAL: ["retiro_local"],
      ENTREGADOS: ["entregado"],
      CANCELADOS: ["cancelado_vuelto_stock"],
      DEVOLUCION: ["devolucion_vuelto_stock"],
      DESEMPAQUETAR: ["cancelado_vuelto_stock", "devolucion_vuelto_stock"],
    };

    if (activeTab !== "TODAS") {
      const allowedStates = tabMap[activeTab];
      if (allowedStates) {
        result = result.filter((o) => allowedStates.includes(o.logisticsStatus));
        // Specific filtering for the new tabs
        if (activeTab === "DESEMPAQUETAR") {
          result = result.filter((o) => o.packaged);
        } else if (activeTab === "CANCELADOS" || activeTab === "DEVOLUCION") {
          result = result.filter((o) => !o.packaged);
        }
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
        // Now also marks as printed
        setOrderTagStatus(orderId, "impresas");
        break;
      case "CANCELAR":
        const orderToCancel = orders.find(o => o.id === orderId);
        if (orderToCancel?.logisticsStatus === "entregado") {
          updateOrderLogisticsStatus(orderId, "devolucion_vuelto_stock");
        } else {
          updateOrderLogisticsStatus(orderId, "cancelado_vuelto_stock");
        }
        break;
      case "DESEMPAQUETAR":
        setOrderPackaged(orderId, false);
        break;
      case "RETIRO_EN_LOCAL":
        updateOrderLogisticsStatus(orderId, "retiro_local");
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

    if (action === "IMPRIMIR_DETALLE") {
        const printContent = document.getElementById('printable-order-detail');
        if (!printContent) return;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

        const order = !isBulk ? (orderOrIds as Order) : null;
        const title = order ? `Detalle del Pedido #${order.meliOrderId}` : 'Detalle del Pedido';

        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(`
                <html>
                    <head>
                        <title>${title}</title>
                        ${styles}
                        <style>
                            @media print {
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body class="bg-white dark:bg-gray-800 p-8">
                        ${printContent.innerHTML}
                    </body>
                </html>
            `);
            iframeDoc.close();

            iframe.contentWindow?.focus();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 500);
        }
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


    if (action === "DESEMPAQUETAR") {
      const idsToUpdate = isBulk ? (orderOrIds as string[]) : [(orderOrIds as Order).id];
      setExitingOrderIds((prev) => [...prev, ...idsToUpdate]);

      setTimeout(() => {
        if (isBulk) {
          (orderOrIds as string[]).forEach((id) => executeAction(id, action));
          sweetAlert.success("Acción completada", `Se desempaquetaron ${count} ordenes.`);
        } else {
          executeAction((orderOrIds as Order).id, action);
          sweetAlert.success("Producto desempaquetado", "El producto ha vuelto al stock físico.");
        }
        setExitingOrderIds((prev) => prev.filter((id) => !idsToUpdate.includes(id)));
      }, 500);
      return;
    }

    if (action === "VER") {
      const order = orderOrIds as Order;
      setSelectedOrder(order);
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
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8081/api/v1"; 

        if (isBulk) {
          const ids = orderOrIds as string[];
          
          const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

          if (isLocalhost) {
             // Use Frontend Fictitious Label
             const url = `/print-label/${ids.join(',')}`;
             window.open(url, "_blank");
             
             // Mark as printed
             ids.forEach(id => executeAction(id, action));
             sweetAlert.success("Acción completada", `Se están generando ${count} etiquetas (Ficticias).`);
          } else {
             // Existing Backend Logic
             ids.forEach((id) => executeAction(id, action));
             ids.forEach(id => {
                  window.open(`${apiUrl}/orders/${id}/label?token=${localStorage.getItem('token')}`, "_blank");
             });
             sweetAlert.success("Acción completada", `Se están generando ${count} etiquetas.`);
          }
        } else {
          const order = orderOrIds as Order;
          const id = order.id;

          const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

          if (isLocalhost) {
             // Use Frontend Fictitious Label
             window.open(`/print-label/${id}`, "_blank");
             executeAction(id, action);
             sweetAlert.success("Acción completada", "La etiqueta ficticia se está generando.");
          } else {
             // Existing Backend Logic
             executeAction(id, action);
             window.open(`${apiUrl}/orders/${id}/label?token=${localStorage.getItem('token')}`, "_blank");
             sweetAlert.success("Acción completada", "La etiqueta se está generando.");
          }
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

    if (action === "RETIRO_EN_LOCAL") {
      const idsToUpdate = isBulk ? (orderOrIds as string[]) : [(orderOrIds as Order).id];
      setExitingOrderIds((prev) => [...prev, ...idsToUpdate]);

      setTimeout(() => {
        if (isBulk) {
          (orderOrIds as string[]).forEach((id) => executeAction(id, action));
          sweetAlert.success("Acción completada", `Se actualizaron ${count} ordenes.`);
        } else {
          executeAction((orderOrIds as Order).id, action);
          sweetAlert.success("Acción completada", "La orden ha sido movida a retiro en local.");
        }
        setExitingOrderIds((prev) => prev.filter((id) => !idsToUpdate.includes(id)));
      }, 500);
      return;
    }

    if (action === "CANCELAR") {
      let title = "¿Cancelar Orden?";
      let text = "La orden pasará a la sección 'Cancelados' y se devolverá a stock.";
      let confirmText = "Sí, Cancelar";

      if (!isBulk) {
        const order = orderOrIds as Order;
        if (order.logisticsStatus === "entregado") {
          title = "¿Generar Devolución?";
          text = "La orden pasará a la sección 'Devolución' y se devolverá a stock.";
          confirmText = "Sí, Devolver";
        }
      } else {
        // For bulk, check if any are delivered to adjust message potentially, 
        // or just keep generic. Let's make it generic-safe.
        text = "Las ordenes se moverán a 'Cancelados' o 'Devolución' según su estado.";
      }

      const result = await sweetAlert.confirm(
        title,
        text,
        "warning",
        confirmText
      );

      if (result.isConfirmed) {
        const idsToUpdate = isBulk ? (orderOrIds as string[]) : [(orderOrIds as Order).id];
        setExitingOrderIds((prev) => [...prev, ...idsToUpdate]);

        setTimeout(() => {
          if (isBulk) {
            (orderOrIds as string[]).forEach((id) => executeAction(id, action));
            setSelectedOrderIds([]); // Clear selection
            sweetAlert.success("Acción completada", `Se procesaron ${count} ordenes.`);
          } else {
            const order = orderOrIds as Order;
            executeAction(order.id, action);
            const successMsg = order.logisticsStatus === "entregado" ? "La orden ha sido movida a devoluciones." : "La orden ha sido movida a cancelados.";
            sweetAlert.success("Operación exitosa", successMsg);
          }
          setExitingOrderIds((prev) => prev.filter((id) => !idsToUpdate.includes(id)));
        }, 500);
      }
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
      const idsToUpdate = isBulk ? (orderOrIds as string[]) : [(orderOrIds as Order).id];
      setExitingOrderIds((prev) => [...prev, ...idsToUpdate]);

      setTimeout(() => {
        if (isBulk) {
          (orderOrIds as string[]).forEach((id) => executeAction(id, action));
          setSelectedOrderIds([]); // Clear selection handling
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
    const buttons = [];

    // Modal View: Only "Reimprimir Etiqueta" if applicable
    if (isModal) {
      // Allow reprinting in preparation, ready, and dispatched states
      if (
        order.logisticsStatus === "pendiente_preparacion" ||
        order.logisticsStatus === "listo_para_entregar" ||
        order.logisticsStatus === "despachado_meli"
      ) {
        // Show reprint button
        buttons.push(
          <Button key="reprint" onClick={() => handleAction(order, "IMPRIMIR_DETALLE")} variant="blue" size="sm" className="flex items-center gap-2" title={!isCard ? "Imprimir Detalle" : ""}>
            <FontAwesomeIcon icon={faPrint} />
          </Button>,
        );
      }
      return (
        <div className="flex gap-2 flex-nowrap items-center justify-end w-full" onClick={(e) => e.stopPropagation()}>
          {buttons}
        </div>
      );
    }

    // Normal View (Table/Card)
    if (order.logisticsStatus === "pendiente_preparacion") {
      const isPackaged = order.packaged;
      const isLabeled = order.tagStatus === "impresas";

      // 1. Empaquetado
      buttons.push(
        <Button key="pack" onClick={() => handleAction(order, "EMPAQUETAR")} variant={isPackaged ? "grey" : "blue"} size="sm" disabled={isPackaged} className={`flex items-center gap-2`} title={isPackaged ? "Empaquetado" : "Empaquetar"}>
          <FontAwesomeIcon icon={isPackaged ? faCheck : faBox} />
        </Button>,
      );

      // 2. Imprimir Etiqueta -> Handled below with Local Pickup check

      const isLocalPickup = order.tags?.includes("no_shipping");

      // 2. Imprimir Etiqueta OR Retiro Local
      if (!isLocalPickup) {
        buttons.push(
            <Button key="print" onClick={() => handleAction(order, "IMPRIMIR_ETIQUETA")} variant="blue" size="sm" className={`flex items-center gap-2`} title="Imprimir Etiqueta">
            <FontAwesomeIcon icon={faPrint} />
            </Button>,
        );
      } else {
         // Local Pickup Button
         buttons.push(
            <Button key="local" onClick={() => handleAction(order, "RETIRO_EN_LOCAL")} variant="blue" size="sm" disabled={!isPackaged} className={`flex items-center gap-2`} title={!isPackaged ? "Primero debes empaquetar" : "Mover a Retiro en Local"}>
            <FontAwesomeIcon icon={faHome} />
            </Button>,
        );
      }

      // 3. Listo para entregar (Only if not local pickup)
      if (!isLocalPickup) {
          buttons.push(
            <Button
            key="listo"
            onClick={() => handleAction(order, "PASAR_A_LISTO")}
            variant="blue"
            size="sm"
            disabled={!isLabeled || !isPackaged} // Strict dependency
            className={`flex items-center gap-2 ${!isLabeled || !isPackaged ? "opacity-50 cursor-not-allowed" : ""}`}
            title={!isLabeled ? "Falta imprimir etiqueta" : "Listo para entregar"}
            >
            <FontAwesomeIcon icon={faTruck} />
            </Button>,
        );
      }

      // 4. Cancelar - REMOVED per user request

    } else if (
      order.logisticsStatus === "listo_para_entregar" ||
      order.logisticsStatus === "despachado_meli" ||
      order.logisticsStatus === "retiro_local" ||
      order.logisticsStatus === "entregado"
    ) {
       // Allow cancel for these statuses as well
       // REMOVED MANUAL CANCEL BUTTON per user request
    }

    if ((order.logisticsStatus === "cancelado_vuelto_stock" || order.logisticsStatus === "devolucion_vuelto_stock") && order.packaged) {
      buttons.push(
        <Button
          key="unpack"
          onClick={() => handleAction(order, "DESEMPAQUETAR")}
          variant="blue"
          size="sm"
          className="flex items-center gap-2"
          title="Desempaquetar y devolver a stock físico"
        >
          <FontAwesomeIcon icon={faBoxOpen} />
        </Button>
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
      <div className={`flex gap-2 flex-nowrap w-full items-center ${isCard ? "justify-end" : "justify-start"}`} onClick={(e) => e.stopPropagation()}>
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
              title: order.meliOrderId,
              subtitle: new Date(order.date).toLocaleDateString(),
              icon: faTruck,
              badges: [
                // Show 'Antes de...' if applicable
                ...(showShippingCutoff &&
                (order.logisticsStatus === "pendiente_preparacion" || order.logisticsStatus === "listo_para_entregar") &&
                order.shippingCutoff !== "-"
                  ? [
                      {
                        text: `Antes de: ${order.shippingCutoff}`,
                        variant: "danger" as const,
                      },
                    ]
                  : []),
                // Show 'Estado' for Desempaquetar
                ...(activeTab === "DESEMPAQUETAR"
                  ? [
                      {
                        text: order.logisticsStatus.includes("cancelado") ? "Cancelación" : "Devolución",
                        variant: (order.logisticsStatus.includes("cancelado") ? "warning" : "yellow") as any, // fallback or similar
                      },
                    ]
                  : []),
              ],
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
                <span className="text-gray-500 dark:text-gray-400">Publicación:</span>
                <span className="text-gray-900 dark:text-gray-100 truncate max-w-[150px]" title={order.items.length > 0 ? order.items[0].title : "-"}>
                  {order.items.length > 0 ? order.items[0].title : "-"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Cantidad:</span>
                <span className="text-gray-900 dark:text-gray-100">{order.items.length > 0 ? order.items[0].quantity : 0}</span>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  // --- Info Modal State ---
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const tabInfoContent: Record<string, React.ReactNode> = {
    TODAS: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>Visión general de todos los pedidos. Utiliza los filtros superiores para buscar por:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>ID de pedido o nombre de comprador.</li>
          <li>Rango de fechas.</li>
          <li>Cuenta o Tenant específico.</li>
        </ul>
      </div>
    ),
    PENDIENTE_PREPARACION: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Pedidos nuevos pendientes de preparación.</strong></p>
        <p>Flujo de trabajo sugerido:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Verifica que tienes el stock físico.</li>
          <li>Presiona <strong>Empaquetar</strong> para bloquear el stock.</li>
          <li>Presiona <strong>Imprimir Etiqueta</strong> y pégala en el paquete.</li>
          <li>Presiona <strong>Listo para entregar</strong> para finalizar la preparación.</li>
        </ol>
      </div>
    ),
    LISTO_PARA_ENTREGAR: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Pedidos listos para despacho.</strong></p>
        <p>Estos paquetes ya tienen su etiqueta pegada y están esperando ser:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Despachados en una sucursal de correo.</li>
          <li>Retirados por la colecta de MercadoLibre.</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">El estado cambiará automáticamente a "Despachado" cuando el correo escanee la etiqueta.</p>
      </div>
    ),
    DESPACHADO_MELI: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Pedidos en tránsito.</strong></p>
        <p>Estos pedidos ya fueron entregados al correo y están camino al comprador.</p>
        <p>No requieren ninguna acción manual.</p>
      </div>
    ),
    RETIRO_EN_LOCAL: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Retiro en sucursal.</strong></p>
        <p>El comprador pasará a buscar el producto por el local.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Verifica la identidad del comprador al entregar.</li>
          <li>Presiona <strong>Marcar Entregado</strong> una vez que el producto haya sido retirado.</li>
        </ul>
      </div>
    ),
    ENTREGADOS: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Historial de entregas finalizadas.</strong></p>
        <p>Aquí puedes consultar pedidos pasados que ya fueron recibidos por el comprador.</p>
      </div>
    ),
    CANCELADOS: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Pedidos cancelados.</strong></p>
        <p>La venta fue cancelada por el comprador o por falta de stock antes de ser despachada.</p>
        <p className="text-yellow-600 dark:text-yellow-500 font-medium">Nota: Si el pedido ya estaba empaquetado, aparecerá en la pestaña "Desempaquetar".</p>
      </div>
    ),
    DEVOLUCION: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Devoluciones iniciadas.</strong></p>
        <p>El comprador ha iniciado un reclamo o devolución después de recibir el producto.</p>
        <p>Debes estar atento a la recepción del producto devuelto.</p>
      </div>
    ),
    DESEMPAQUETAR: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Recuperación de Stock Físico.</strong></p>
        <p>Aquí aparecen los pedidos que fueron <strong>Cancelados</strong> o son <strong>Devoluciones</strong>, pero que físicamente el sistema considera "Empaquetados".</p>
        <p><strong>Acción requerida:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Busca el paquete físico.</li>
          <li>Quita el producto de la caja/bolsa.</li>
          <li>Presiona <strong>Desempaquetar</strong> para devolver el producto al stock disponible.</li>
        </ul>
      </div>
    ),
  };

  const currentInfoContent = tabInfoContent[activeTab] || tabInfoContent["TODAS"];

  // --- Title Mapping ---
  const tabTitles: Record<string, string> = {
    TODAS: "Logística",
    PENDIENTE_PREPARACION: "En preparación",
    LISTO_PARA_ENTREGAR: "Listo para entregar",
    DESPACHADO_MELI: "Despachado ML",
    RETIRO_EN_LOCAL: "Retiro en Local",
    ENTREGADOS: "Entregados",
    CANCELADOS: "Cancelados",
    DEVOLUCION: "Devoluciones",
    DESEMPAQUETAR: "Desempaquetar",
  };

  const pageTitle = tabTitles[activeTab] || "Logística";

  return (
    <PageLayout
      title={pageTitle}
      subtitle="Gestión de envíos y etiquetas"
      faIcon={{ icon: faTruck }}
      headerActions={null}
      showInfoIcon={true}
      infoModal={{
        isOpen: isInfoOpen,
        onOpen: () => setIsInfoOpen(true),
        onClose: () => setIsInfoOpen(false),
        title: `Información: ${pageTitle}`,
        content: currentInfoContent,
      }}
      searchAndFilters={
        <SearchAndFilters
          searchPlaceholder="Buscar por ID, comprador..."
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
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
              {(activeTab === "PENDIENTE_PREPARACION" || activeTab === "TODAS") && (
                <>
                  <Button onClick={() => handleAction(selectedOrderIds, "EMPAQUETAR")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0} className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faBoxOpen} />
                    Empaquetar
                  </Button>
                  <Button onClick={() => handleAction(selectedOrderIds, "PASAR_A_LISTO")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0} className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faTruck} />
                    Listo para entregar
                  </Button>
                </>
              )}

              {activeTab === "RETIRO_EN_LOCAL" && (
                <Button onClick={() => handleAction(selectedOrderIds, "MARCAR_ENTREGADO")} variant="blue" size="sm" disabled={selectedOrderIds.length === 0} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} />
                  Marcar Entregado
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Acciones
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Fecha ML
                  </th>
                  {showShippingCutoff && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                      Antes de...
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Cuenta
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Pack ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                    Cantidad
                  </th>
                  {activeTab === "DESEMPAQUETAR" && (
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap">
                      Estado
                    </th>
                  )}
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
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">{renderActions(order)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                      {showShippingCutoff && (
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-red-600 dark:text-red-400">
                          {(order.logisticsStatus === "pendiente_preparacion" || order.logisticsStatus === "listo_para_entregar") && order.shippingCutoff !== "-" ? order.shippingCutoff : ""}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {(() => {
                            // Dynamic Lookup to handle race conditions
                            const accountMatch = accounts.find(a => 
                                (typeof a !== 'string') && (
                                    (order.clientId && a.id === order.clientId) || 
                                    (order.sellerId && a.sellerId == order.sellerId) // Loose equality for number/string safely
                                )
                            );
                            
                            if (accountMatch && typeof accountMatch !== 'string') return accountMatch.name;
                            if (typeof order.account !== 'string') return order.account.name; // Fallback to store mapped
                            if (order.sellerId) return `ID: ${order.sellerId}`;
                            return "Cuenta Desconocida";
                        })()}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {typeof order.account === 'string' ? order.account : order.account.name}
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                          {order.packId || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-500">{order.items.length > 0 ? order.items[0].quantity : 0}</td>
                      {activeTab === "DESEMPAQUETAR" && (
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                          {order.logisticsStatus.includes("cancelado") ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Cancelación</span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Devolución</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(order, "VER");
                          }}
                          variant="blue"
                          size="sm"
                          className="flex items-center gap-2"
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
