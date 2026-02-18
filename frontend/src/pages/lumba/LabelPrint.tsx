import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useLumbaStore } from "../../stores/lumbaStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faScissors, faHandshake } from "@fortawesome/free-solid-svg-icons";

export const LabelPrint: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders, fetchOrders, fetchAccounts } = useLumbaStore();
  const [loading, setLoading] = React.useState(true);

  const orderIds = orderId ? orderId.split(",") : [];

  useEffect(() => {
    const loadData = async () => {
      // Check if we have the orders
      const hasAllOrders = orderIds.every((id) => orders.find((o) => o.id === id));
      
      if (!hasAllOrders) {
        await fetchAccounts();
        await fetchOrders();
      }
      setLoading(false);
    };
    loadData();
  }, [orderId]); // Depend on orderId to reload if it changes

  const selectedOrders = orders.filter((o) => orderIds.includes(o.id));

  useEffect(() => {
    if (!loading && selectedOrders.length > 0) {
        // Auto-print when loaded
        const timer = setTimeout(() => {
        window.print();
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [loading, selectedOrders]);

  if (loading) {
      return <div className="p-10 text-center">Cargando etiqueta...</div>;
  }

  if (selectedOrders.length === 0) {
    return <div className="p-10 text-center">No se encontraron ordenes para imprimir.</div>;
  }

  return (
    <div className="bg-white min-h-screen p-4 flex flex-col items-center print:p-0 print:block">
      {selectedOrders.map((order, index) => (
        <div key={order.id} className={`w-[400px] border-2 border-dashed border-gray-400 p-0 mb-8 print:border-none print:w-full print:mb-0 print:break-after-page relative bg-white text-black font-sans ${index < selectedOrders.length - 1 ? "break-after-page" : ""}`}>
          {/* Header Section */}
          <div className="border-b-2 border-black p-4 flex gap-4">
            <div className="flex flex-col items-center justify-center">
              <span className="text-6xl font-bold leading-none">1</span>
              <span className="text-xs uppercase font-bold">Cantidad</span>
            </div>
            <div className="flex-1 text-sm font-semibold">
              {order.items.map((item) => (
                <div key={item.id}>{item.title}</div>
              ))}
            </div>
          </div>

          {/* Tracking Info */}
          <div className="p-2 border-b border-dashed border-black flex justify-between text-sm font-bold">
            <span>Venta: {order.meliOrderId}</span>
            <span>Tracking: MELI0000{order.id.replace(/\D/g, "")}</span>
          </div>

          {/* Scissors / Cut Line */}
          <div className="flex items-center gap-2 py-2 px-1 text-gray-500">
            <FontAwesomeIcon icon={faScissors} className="transform rotate-180" />
            <div className="border-t border-dashed border-gray-400 flex-1 h-px"></div>
            <span className="text-[10px] italic">Recorta esta parte de la etiqueta para que tu paquete viaje seguro.</span>
          </div>

          {/* Sender Info */}
          <div className="p-4 flex gap-4">
            <div className="w-12 h-12 rounded-full border border-yellow-400 flex items-center justify-center bg-yellow-100 text-yellow-600">
              {/* Placeholder Logo */}
              <FontAwesomeIcon icon={faHandshake} size="lg" />
            </div>
            <div className="text-xs">
              <div className="font-bold">Remitente #227484236</div>
              <div>Av. 27 de Febrero 6350</div>
              <div>Villa Soldati Capital Federal 1437</div>
              <div className="font-bold mt-1">Venta: {order.meliOrderId}</div>
            </div>
          </div>

          {/* Route Codes Small */}
          <div className="flex border-t-4 border-black border-b-2">
            <div className="border-r-2 border-black px-4 py-1 text-xl font-bold font-mono">XCF1</div>
            <div className="bg-black text-white px-6 py-1 text-xl font-bold font-mono flex-1 text-center">SBU2</div>
            <div className="bg-black text-white px-2 py-1 text-[10px] font-bold flex items-center">ENTREGAR A PUNTO DE ENVIO</div>
          </div>

          {/* Barcode Mock */}
          <div className="py-4 flex flex-col items-center justify-center">
            {/* Simple CSS Barcode Effect */}
            <div className="h-24 w-[90%] flex justify-between items-stretch overflow-hidden select-none" aria-hidden="true">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-black inline-block"
                  style={{
                    width: Math.random() > 0.5 ? "4px" : "2px",
                    marginLeft: Math.random() > 0.5 ? "2px" : "1px",
                  }}
                ></div>
              ))}
            </div>
            <div className="text-xs font-mono mt-1 tracking-widest font-bold">40575223750</div>
          </div>

          {/* Sorting Codes */}
          <div className="flex border-t-2 border-black">
            <div className="w-1/2 border-r-2 border-black">
              <div className="text-center text-xs border-b border-black">XCF1 | 02:00</div>
              <div className="bg-black text-white text-center font-bold text-xl py-1">SBU2</div>
            </div>
            <div className="w-1/2">
              <div className="text-center text-xs border-b border-black">SBU2</div>
              <div className="bg-black text-white text-center font-bold text-xl py-1">B1</div>
            </div>
          </div>

          {/* Big Codes */}
          <div className="flex justify-between items-end p-6 pb-10">
            <div className="text-6xl font-bold text-gray-800">SBU2</div>
            <div className="text-6xl font-bold text-gray-800">B1</div>
          </div>

          {/* Footer Info */}
          <div className="text-center font-bold text-lg pb-4">CP: 1714 VIE 14/05/2021</div>

          <div className="border-t-2 border-black p-4 flex justify-between items-end">
            <div className="text-sm">
              <div className="font-bold uppercase">{order.buyerName}</div>
              <div className="text-xs text-gray-600">Domicilio: {order.buyerAddress}</div>
              <div className="font-bold mt-1">CP: 1714</div>
            </div>
            {/* QR Code Mock */}
            <div className="w-16 h-16 bg-white border-2 border-black p-1 flex flex-wrap content-start">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 ${Math.random() > 0.5 ? "bg-black" : "bg-white"}`}></div>
              ))}
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @media print {
            @page { margin: 0; size: auto; }
            body { background: white; }
            .break-after-page { page-break-after: always; }
        }
      `}</style>
    </div>
  );
};
