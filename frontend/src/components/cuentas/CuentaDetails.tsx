import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faPhone, faMapMarkerAlt, faPlug, faTrash, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { Cuenta, CuentaStatus } from "../../api/cuentas";

interface CuentaDetailsProps {
  cuenta: Cuenta;
  onConnect?: (cuenta: Cuenta) => void;
  onDisconnect?: (cuenta: Cuenta) => void;
}

const getStatusBadge = (status: CuentaStatus) => {
  const config = {
    active: {
      text: "Activo",
      classes: "bg-accent-9 text-accent-2",
    },
    inactive: {
      text: "Inactivo",
      classes: "bg-accent-3 text-accent-7",
    },
    lead: {
      text: "Lead",
      classes: "bg-accent-2 text-accent-7 border border-accent-4",
    },
  };
  return config[status] || config["active"];
};

export const CuentaDetails: React.FC<CuentaDetailsProps> = ({ cuenta, onConnect, onDisconnect }) => {
  return (
    <div className="space-y-4">
      {/* Status & Favorite */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusBadge(cuenta.status).classes}`}>
          {getStatusBadge(cuenta.status).text}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-accent-7">
          <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-accent-6" />
          <a href={`mailto:${cuenta.email}`} className="hover:text-accent-9">
            {cuenta.email}
          </a>
        </div>

        {cuenta.phone && (
          <div className="flex items-center gap-2 text-sm text-accent-7">
            <FontAwesomeIcon icon={faPhone} className="h-4 w-4 text-accent-6" />
            <a href={`tel:${cuenta.phone}`} className="hover:text-accent-9">
              {cuenta.phone}
            </a>
          </div>
        )}

        {cuenta.address && (
          <div className="flex items-start gap-2 text-sm text-accent-7">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="h-4 w-4 text-accent-6 mt-0.5" />
            <span>{cuenta.address}</span>
          </div>
        )}
      </div>

      {/* MercadoLibre Connection */}
      <div className="pt-4 border-t border-accent-4">
        <h4 className="text-sm font-semibold text-accent-8 mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlug} className="text-accent-6" />
          MercadoLibre
        </h4>
        
        {cuenta.mercadolibre?.isConnected ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Conectado</p>
                  <p className="text-xs text-green-700 dark:text-green-300">{cuenta.mercadolibre.nickname}</p>
                  {cuenta.mercadolibre.sellerId && (
                     <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">ID: {cuenta.mercadolibre.sellerId}</p>
                  )}
                </div>
              </div>
              
              {onDisconnect && (
                <button 
                  onClick={() => onDisconnect(cuenta)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                  title="Desconectar"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
           <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Conecta esta cuenta para sincronizar ventas y logística.
              </p>
              {onConnect && (
                <button
                  onClick={() => onConnect(cuenta)}
                  className="w-full py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlug} />
                  Conectar MercadoLibre
                </button>
              )}
           </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="pt-4 border-t border-accent-4">
        <div className="grid grid-cols-2 gap-4 text-xs text-accent-7">
          <div>
            <span className="font-medium">Creado:</span>
            <br />
            {new Date(cuenta.createdAt).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Actualizado:</span>
            <br />
            {new Date(cuenta.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};
