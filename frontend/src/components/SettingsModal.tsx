import React, { useState, useMemo } from "react";
import { Modal } from "./Modal";
import { Checkbox } from "./Checkbox";
import { useAuthStore } from "../stores/authStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faUsers, faHardDrive, faBuilding, faCreditCard, faBell, faClock, faCheckCircle, faExclamationTriangle, faDownload, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { sweetAlert } from "../utils/sweetAlert";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "plan" | "usage" | "billing" | "preferences";

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("plan");

  const tabs = [
    { id: "plan" as const, label: "Plan", icon: faCrown },
    { id: "usage" as const, label: "Consumo", icon: faHardDrive },
    { id: "billing" as const, label: "Facturación", icon: faCreditCard },
    { id: "preferences" as const, label: "Preferencias", icon: faBell },
  ];

  const planType = useMemo(() => {
    if (user?.tenantSlug === "superadmin") return "Enterprise";
    return "Pro";
  }, [user?.tenantSlug]);

  const usageData = useMemo(() => {
    return {
      users: { current: 12, limit: 50, percentage: 24 },
      storage: { current: 2.4, limit: 10, percentage: 24, unit: "GB" },
      clients: { current: 8, limit: 25, percentage: 32 },
      campaigns: { current: 15, limit: 50, percentage: 30 },
    };
  }, []);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-accent-9 dark:bg-accent-1";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 80) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400">Alto uso</span>;
    if (percentage >= 60) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400">Uso moderado</span>;
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-accent-3 text-accent-1 dark:bg-accent-4 dark:text-accent-10">Disponible</span>;
  };

  const handleSavePreferences = async () => {
    await sweetAlert.success("Preferencias Guardadas", "Tus preferencias se han actualizado correctamente");
  };

  const displayName = useMemo(() => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    if (user?.lastName) return user.lastName;
    return "Usuario";
  }, [user]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración" subtitle="Gestiona tu plan, consumo y preferencias" size="xl">
      <div className="space-y-6 h-[70vh] overflow-y-auto">
        <div className="border-b border-accent-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === tab.id ? "border-accent-1 text-accent-1" : "border-transparent text-accent-7 hover:text-accent-1 hover:border-accent-4"}`}>
                <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="py-4">
          {activeTab === "plan" && (
            <div className="space-y-6">
              <div className="bg-accent-3 rounded-xl p-6 border border-accent-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <FontAwesomeIcon icon={faCrown} className="h-6 w-6 text-accent-1" />
                      <h3 className="text-2xl font-bold text-accent-1">Plan {planType}</h3>
                    </div>
                    <p className="text-sm text-accent-7">Acceso completo a todas las funcionalidades</p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-accent-4 text-accent-1">
                    <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 mr-1.5" />
                    Activo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-accent-2 rounded-lg p-4 border border-accent-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faClock} className="h-4 w-4 text-accent-7" />
                    <span className="text-sm font-medium text-accent-7">Próxima Renovación</span>
                  </div>
                  <p className="text-lg font-semibold text-accent-1">15 de Noviembre, 2025</p>
                </div>

                <div className="bg-accent-2 rounded-lg p-4 border border-accent-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faBuilding} className="h-4 w-4 text-accent-7" />
                    <span className="text-sm font-medium text-accent-7">Tenant</span>
                  </div>
                  <p className="text-lg font-semibold text-accent-1 capitalize">{user?.tenantSlug || "demo-tenant"}</p>
                </div>
              </div>

              <div className="bg-accent-2 rounded-lg p-6 border border-accent-4">
                <h4 className="font-semibold text-accent-1 mb-4">Características del Plan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {["Usuarios ilimitados", "Almacenamiento de 10GB", "25 clientes activos", "Campañas ilimitadas", "Soporte prioritario 24/7", "Integraciones avanzadas", "Analytics y reportes", "API access completo"].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-accent-1 flex-shrink-0" />
                      <span className="text-sm text-accent-7">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faCrown} className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-accent-1">¿Necesitas más recursos?</h4>
                    <p className="text-sm text-accent-7 mt-1">Contáctanos para actualizar tu plan o solicitar recursos adicionales.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "usage" && (
            <div className="space-y-6">
              <div className="bg-accent-2 rounded-lg p-6 border border-accent-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-accent-1">Uso de Recursos</h4>
                  {getStatusBadge(Math.max(usageData.users.percentage, usageData.storage.percentage, usageData.clients.percentage, usageData.campaigns.percentage))}
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-accent-7" />
                        <span className="text-sm font-medium text-accent-7">Usuarios Activos</span>
                      </div>
                      <span className="text-sm font-semibold text-accent-1">
                        {usageData.users.current} / {usageData.users.limit}
                      </span>
                    </div>
                    <div className="w-full bg-accent-3 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${getProgressColor(usageData.users.percentage)}`} style={{ width: `${usageData.users.percentage}%` }}></div>
                    </div>
                    <p className="text-xs text-accent-7 mt-1">{usageData.users.percentage}% utilizado</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faHardDrive} className="h-4 w-4 text-accent-7" />
                        <span className="text-sm font-medium text-accent-7">Almacenamiento</span>
                      </div>
                      <span className="text-sm font-semibold text-accent-1">
                        {usageData.storage.current}
                        {usageData.storage.unit} / {usageData.storage.limit}
                        {usageData.storage.unit}
                      </span>
                    </div>
                    <div className="w-full bg-accent-3 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${getProgressColor(usageData.storage.percentage)}`} style={{ width: `${usageData.storage.percentage}%` }}></div>
                    </div>
                    <p className="text-xs text-accent-7 mt-1">{usageData.storage.percentage}% utilizado</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faBuilding} className="h-4 w-4 text-accent-7" />
                        <span className="text-sm font-medium text-accent-7">Clientes</span>
                      </div>
                      <span className="text-sm font-semibold text-accent-1">
                        {usageData.clients.current} / {usageData.clients.limit}
                      </span>
                    </div>
                    <div className="w-full bg-accent-3 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${getProgressColor(usageData.clients.percentage)}`} style={{ width: `${usageData.clients.percentage}%` }}></div>
                    </div>
                    <p className="text-xs text-accent-7 mt-1">{usageData.clients.percentage}% utilizado</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCrown} className="h-4 w-4 text-accent-7" />
                        <span className="text-sm font-medium text-accent-7">Campañas Activas</span>
                      </div>
                      <span className="text-sm font-semibold text-accent-1">
                        {usageData.campaigns.current} / {usageData.campaigns.limit}
                      </span>
                    </div>
                    <div className="w-full bg-accent-3 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${getProgressColor(usageData.campaigns.percentage)}`} style={{ width: `${usageData.campaigns.percentage}%` }}></div>
                    </div>
                    <p className="text-xs text-accent-7 mt-1">{usageData.campaigns.percentage}% utilizado</p>
                  </div>
                </div>
              </div>

              <div className="bg-accent-3 border border-accent-4 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-accent-1 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-accent-1">Monitoreo de Uso</h4>
                    <p className="text-sm text-accent-7 mt-1">Los límites de uso se actualizan en tiempo real. Recibirás notificaciones cuando alcances el 80% de cualquier límite.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="bg-accent-2 rounded-lg p-6 border border-accent-4">
                <h4 className="font-semibold text-accent-1 mb-4">Información de Facturación</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-accent-3 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4 text-accent-7" />
                      <span className="text-sm font-medium text-accent-7">Método de Pago</span>
                    </div>
                    <p className="text-base font-semibold text-accent-1">Visa •••• 4242</p>
                    <p className="text-xs text-accent-7 mt-1">Vence 12/2026</p>
                  </div>

                  <div className="bg-accent-3 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FontAwesomeIcon icon={faClock} className="h-4 w-4 text-accent-7" />
                      <span className="text-sm font-medium text-accent-7">Próximo Cobro</span>
                    </div>
                    <p className="text-base font-semibold text-accent-1">$99.00 USD</p>
                    <p className="text-xs text-accent-7 mt-1">15 de Noviembre, 2025</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-accent-1 mb-3">Historial de Facturas</h5>
                  <div className="border border-accent-4 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-accent-4">
                      <thead className="bg-accent-3">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-accent-7 uppercase tracking-wider">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-accent-7 uppercase tracking-wider">Descripción</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-accent-7 uppercase tracking-wider">Monto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-accent-7 uppercase tracking-wider">Estado</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-accent-7 uppercase tracking-wider">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="bg-accent-2 divide-y divide-accent-4">
                        {[
                          { date: "15 Oct 2025", desc: "Plan Pro - Mensual", amount: "$99.00", status: "Pagado" },
                          { date: "15 Sep 2025", desc: "Plan Pro - Mensual", amount: "$99.00", status: "Pagado" },
                          { date: "15 Ago 2025", desc: "Plan Pro - Mensual", amount: "$99.00", status: "Pagado" },
                        ].map((invoice, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-accent-1">{invoice.date}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-accent-7">{invoice.desc}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-accent-1">{invoice.amount}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-accent-3 text-accent-1 dark:bg-accent-4 dark:text-accent-10">{invoice.status}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <button className="text-accent-1 hover:text-accent-7 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="bg-accent-2 rounded-lg p-6 border border-accent-4">
                <h4 className="font-semibold text-accent-1 mb-4">Información General</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-2">Tenant</label>
                    <input type="text" value={user?.tenantSlug || "demo-tenant"} disabled className="w-full px-4 py-2 border border-accent-4 rounded-lg bg-accent-3 text-accent-1 cursor-not-allowed capitalize" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-2">Nombre</label>
                    <input type="text" value={displayName} disabled className="w-full px-4 py-2 border border-accent-4 rounded-lg bg-accent-3 text-accent-1 cursor-not-allowed" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-2">Email de Contacto</label>
                    <input type="email" value={user?.email || ""} disabled className="w-full px-4 py-2 border border-accent-4 rounded-lg bg-accent-3 text-accent-1 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              <div className="bg-accent-2 rounded-lg p-6 border border-accent-4">
                <h4 className="font-semibold text-accent-1 mb-4">Notificaciones</h4>

                <div className="space-y-3">
                  <Checkbox 
                    defaultChecked 
                    label="Notificaciones de Email"
                  />
                  <p className="text-xs text-accent-7 ml-8 -mt-1">Recibir actualizaciones importantes por correo</p>

                  <Checkbox 
                    defaultChecked 
                    label="Alertas de Uso"
                  />
                  <p className="text-xs text-accent-7 ml-8 -mt-1">Notificar cuando alcances límites de recursos</p>

                  <Checkbox 
                    label="Newsletter"
                  />
                  <p className="text-xs text-accent-7 ml-8 -mt-1">Recibir noticias y consejos mensuales</p>
                </div>
              </div>

              <div className="bg-accent-2 rounded-lg p-6 border border-accent-4">
                <h4 className="font-semibold text-accent-1 mb-4">Configuración Regional</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-2">
                      <FontAwesomeIcon icon={faGlobe} className="h-4 w-4 mr-2" />
                      Zona Horaria
                    </label>
                    <select className="w-full px-4 py-2 border border-accent-4 rounded-lg bg-accent-2 text-accent-1 focus:ring-2 focus:ring-accent-5">
                      <option>GMT-3 (Buenos Aires)</option>
                      <option>GMT-5 (New York)</option>
                      <option>GMT+0 (London)</option>
                      <option>GMT+1 (Madrid)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSavePreferences} className="px-6 py-2.5 bg-accent-9 text-accent-2 hover:bg-accent-8 font-medium rounded-lg transition-colors">
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
