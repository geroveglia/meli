
import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlug, faCheckCircle, faExclamationCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { meliService, MeliConnectionStatus } from "../../services/meliService";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export const IntegrationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MeliConnectionStatus>({ isConnected: false });
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchStatus();
    
    // Check for success/error in URL
    const urlStatus = searchParams.get("status");
    console.log("URL Status param:", urlStatus);

    if (urlStatus === "success") {
        toast.success("¡Conexión con MercadoLibre exitosa!");
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlStatus === "error") {
        toast.error("Error al conectar con MercadoLibre.");
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    console.log("Fetching MELI connection status...");
    try {
      const data = await meliService.getConnectionStatus();
      console.log("MELI Status received:", data);
      setStatus(data);
    } catch (error) {
      console.error("Error fetching MELI status:", error);
      toast.error("Error al obtener estado de la integración");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await meliService.getAuthUrl();
      window.location.href = url;
    } catch (error) {
      console.error("Error initiating MELI auth:", error);
      toast.error("Error al iniciar conexión con MercadoLibre");
      setConnecting(false);
    }
  };


  const handleDisconnect = async () => {
      if(!window.confirm("¿Estás seguro de que deseas desconectar la cuenta de MercadoLibre? Dejarás de recibir actualizaciones.")) return;

      try {
          await meliService.disconnect();
          toast.success("Cuenta desconectada correctamente");
          fetchStatus(); // Refresh status
      } catch (error) {
          console.error("Error disconnecting:", error);
          toast.error("Error al desconectar la cuenta");
      }
  };

  return (
    <PageLayout
      title="Integraciones"
      subtitle="Gestiona las conexiones con servicios externos"
      faIcon={{ icon: faPlug }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: false, // Simple info modal logic if needed
        onOpen: () => {}, 
        onClose: () => {},
        title: "Integraciones",
        content: <p>Conecta tu cuenta con MercadoLibre para sincronizar ventas y logística.</p>
      }}
    >
      {loading ? (
        <div className="flex justify-center p-12">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* MercadoLibre Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                       MeLi
                   </div>
                   <div>
                       <h3 className="text-lg font-bold text-gray-900 dark:text-white">MercadoLibre</h3>
                       <p className="text-sm text-gray-500 dark:text-gray-400">Sincroniza tus ventas, logística y mensajería.</p>
                   </div>
               </div>
               
               <div>
                   {status.isConnected ? (
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                           <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                           Conectado
                       </span>
                   ) : (
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                           <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                           Desconectado
                       </span>
                   )}
               </div>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
                {status.isConnected ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</span>
                                <p className="text-lg font-medium text-gray-900 dark:text-white mt-1">{status.nickname || "N/A"}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID Vendedor</span>
                                <p className="text-lg font-medium text-gray-900 dark:text-white mt-1">{status.sellerId || "N/A"}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                 <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                                 <span>Tu cuenta está lista para recibir notificaciones.</span>
                            </div>
                            <button
                                onClick={handleDisconnect}
                                className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
                            >
                                Desconectar cuenta
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-start gap-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            Conecta tu cuenta para habilitar la actualización automática de estados de envío y recepción de ventas en tiempo real.
                        </p>
                        <button 
                            onClick={handleConnect}
                            disabled={connecting}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                        >
                            {connecting ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                    Conectando...
                                </>
                            ) : (
                                "Conectar con MercadoLibre"
                            )}
                        </button>
                    </div>
                )}
            </div>
          </div>
          
        </div>
      )}
    </PageLayout>
  );
};
