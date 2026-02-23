
import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlug, faSpinner, faPlus } from "@fortawesome/free-solid-svg-icons";
import { meliService, MeliConnectionStatus } from "../../services/meliService";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

export const IntegrationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MeliConnectionStatus>({ isConnected: false });
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Credentials Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [credentials, setCredentials] = useState({ appId: "", clientSecret: "" });

  useEffect(() => {
    fetchStatus();
    
    const urlStatus = searchParams.get("status");
    if (urlStatus === "success") {
        toast.success("¡Conexión con MercadoLibre exitosa!");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlStatus === "error") {
        toast.error("Error al conectar con MercadoLibre.");
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      const data = await meliService.getConnectionStatus();
      setStatus(data);
      // Pre-fill credentials if available (though usually secrets shouldn't be verified this way, appId is fine)
      if (data.appId) {
          setCredentials(prev => ({ ...prev, appId: data.appId || "" }));
      }
    } catch (error) {
      console.error("Error fetching MELI status:", error);
      toast.error("Error al obtener estado de la integración");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!credentials.appId || !credentials.clientSecret) {
        toast.error("Por favor, ingrese el App ID y Client Secret");
        return;
    }

    setConnecting(true);
    try {
      // 1. Save Credentials
      await meliService.configureCredentials(credentials.appId, credentials.clientSecret);
      
      // 2. Initiate Auth
      const url = await meliService.getAuthUrl();
      window.location.href = url;
    } catch (error) {
      console.error("Error initiating MELI auth:", error);
      toast.error("Error al iniciar conexión con MercadoLibre");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
      if(!window.confirm("¿Estás seguro de que deseas desconectar la aplicación?")) return;

      try {
          await meliService.disconnect();
          toast.success("Aplicación desconectada correctamente");
          fetchStatus(); 
      } catch (error) {
          console.error("Error disconnecting:", error);
          toast.error("Error al desconectar");
      }
  };

  const openCredentialsModal = () => {
      setIsModalOpen(true);
  };

  return (
    <PageLayout
      title="Mis aplicaciones"
      subtitle="Gestiona tus aplicaciones conectadas"
      faIcon={{ icon: faPlug }} // Could use a grid icon if preferred
    >
      {loading ? (
        <div className="flex justify-center p-12">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
            <div className="flex justify-end">
                {!status.isConnected && (
                    <button
                        onClick={openCredentialsModal}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
                    >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Crear nueva aplicación
                    </button>
                )}
            </div>

            {/* Application List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aplicación no certificada
                </div>
                
                {status.isConnected ? (
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Logo Placeholder */}
                            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-xl ring-4 ring-white dark:ring-gray-800 shadow-sm">
                                <span className="transform -rotate-12">🤝</span>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Lumba Connect - Gestión</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200">ML</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Mercado Libre</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Client ID: {status.sellerId || status.appId || "N/A"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                             {/* Status Circle */}
                             <div className="relative">
                                <svg className="w-10 h-10 transform -rotate-90">
                                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-green-500" strokeDasharray="100" strokeDashoffset="0" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-green-600 dark:text-green-400">100</span>
                             </div>

                             <div className="hidden md:block text-right">
                                 <p className="text-xs font-semibold text-green-600 dark:text-green-400">Conexión Activa</p>
                                 <p className="text-[10px] text-gray-400 max-w-[150px] leading-tight mt-0.5">
                                     La aplicación está sincronizando datos correctamente.
                                 </p>
                             </div>

                             {/* Disconnect Button */}
                             <button 
                                onClick={handleDisconnect}
                                className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-md transition-colors"
                             >
                                 Desconectar
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <p>No hay aplicaciones conectadas.</p>
                        <button onClick={openCredentialsModal} className="mt-2 text-blue-600 hover:underline text-sm">Conectar nueva aplicación</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Credentials Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !connecting && setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
                  >
                    Conectar MercadoLibre
                  </Dialog.Title>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App ID</label>
                          <input 
                            type="text" 
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" 
                            placeholder="Ej: 123456789"
                            value={credentials.appId}
                            onChange={(e) => setCredentials({...credentials, appId: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Secret</label>
                          <input 
                            type="password" 
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" 
                            placeholder="Ej: xxxxxxxxxxxxxxx"
                            value={credentials.clientSecret}
                            onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                          />
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                          <p className="text-xs text-blue-800 dark:text-blue-300">
                              Asegúrate de que la <strong>Redirect URI</strong> en tu aplicación de MercadoLibre esté configurada como: <br/>
                              <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded mt-1 block w-fit">{(import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api/v1`).replace('/api/v1', '')}/api/v1/meli/callback</code>
                          </p>
                      </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsModalOpen(false)}
                      disabled={connecting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 text-blue-900 px-4 py-2 text-sm font-medium hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleConnect}
                      disabled={connecting}
                    >
                      {connecting ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                            Conectando...
                          </>
                      ) : (
                          "Conectar"
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </PageLayout>
  );
};
