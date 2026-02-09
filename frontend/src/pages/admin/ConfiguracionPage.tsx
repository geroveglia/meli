import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import axios from "../../api/axiosConfig";
import { toast } from "sonner";
import { Switch } from "@headlessui/react";
import { PageLayout } from "../../components/PageLayout";

interface BillingSettings {
  autoBilling: boolean;
  triggerStage: "order_created" | "order_paid" | "order_shipped" | "order_delivered";
}

export const ConfiguracionPage: React.FC = () => {
  const [settings, setSettings] = useState<BillingSettings>({
    autoBilling: false,
    triggerStage: "order_shipped",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/tenants/current/billing-settings");
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching billing settings:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put("/tenants/current/billing-settings", settings);
      setSettings(response.data);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving billing settings:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Facturación"
      subtitle="Administra la configuración de facturación automática"
      faIcon={{ icon: faMoneyBillWave }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Facturación",
        content: <p>Configure cuándo y cómo se deben generar las facturas automáticas para sus pedidos.</p>,
      }}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-blue-600" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-accent-3 rounded-xl shadow-sm border border-accent-4 overflow-hidden"
        >
          <div className="p-6 border-b border-accent-4">
            <h2 className="text-lg font-bold text-accent-1 flex items-center gap-2">
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-blue-500" />
              Automatización
            </h2>
            <p className="text-sm text-accent-7 mt-1">
              Configura cómo y cuándo se generan las facturas automáticamente.
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Auto Billing Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-accent-1">Facturación Automática</label>
                <p className="text-sm text-accent-7">
                  Habilitar la generación automática de facturas basada en el estado del pedido.
                </p>
              </div>
              <Switch
                checked={settings.autoBilling}
                onChange={(checked: boolean) => setSettings({ ...settings, autoBilling: checked })}
                className={`${
                  settings.autoBilling ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    settings.autoBilling ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>

            {/* Trigger Stage Dropdown - Conditional */}
            <motion.div
              initial={false}
              animate={{
                opacity: settings.autoBilling ? 1 : 0.5,
                height: "auto",
                pointerEvents: settings.autoBilling ? "auto" : "none",
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-accent-1 mb-1">
                    Momento de ejecución
                  </label>
                  <p className="text-sm text-accent-7">
                    Elige en qué etapa del proceso se debe generar la factura.
                  </p>
                </div>
                <select
                  value={settings.triggerStage}
                  onChange={(e) =>
                    setSettings({ ...settings, triggerStage: e.target.value as BillingSettings["triggerStage"] })
                  }
                  disabled={!settings.autoBilling}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm p-2.5"
                >
                  <option value="order_created">Al ingresar pedido (Order Created)</option>
                  <option value="order_paid">Al confirmarse pago (Order Paid)</option>
                  <option value="order_shipped">Al despachar (Order Shipped)</option>
                  <option value="order_delivered">Al entregar (Order Delivered)</option>
                </select>
              </div>
            </motion.div>
          </div>

          <div className="px-6 py-4 bg-accent-3 border-t border-accent-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2 -ml-1 h-4 w-4" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </button>
          </div>
        </motion.div>
      )}
    </PageLayout>
  );
};
