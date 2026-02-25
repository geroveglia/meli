import React from "react";
import { Cliente } from "../../api/clientes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faEnvelope, faPhone, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";

export const ClienteDetails: React.FC<{ cliente: Cliente }> = ({ cliente }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-accent-1 text-accent-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faBuilding} className="h-5 w-5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-medium text-gray-900 truncate">
            {cliente.name}
          </h4>
          {cliente.company && (
            <p className="text-sm text-gray-500 truncate">{cliente.company}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Información de Contacto</h5>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-gray-400" />
              <a href={`mailto:${cliente.email}`} className="hover:text-accent-6 transition-colors">
                {cliente.email}
              </a>
            </div>
            {cliente.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FontAwesomeIcon icon={faPhone} className="h-4 w-4 text-gray-400" />
                <a href={`tel:${cliente.phone}`} className="hover:text-accent-6 transition-colors">
                  {cliente.phone}
                </a>
              </div>
            )}
            {cliente.address && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="h-4 w-4 text-gray-400" />
                <span>{cliente.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {cliente._generatedPassword && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">
            Credenciales de Acceso
          </h5>
          <p className="text-xs text-yellow-700 dark:text-yellow-500 mb-3">
            Comparte esta contraseña temporal con tu cliente. Deberá cambiarla al iniciar sesión por primera vez.
          </p>
          <div className="flex items-center gap-3 bg-white dark:bg-black/40 border border-yellow-200 dark:border-yellow-800 rounded p-2">
            <code className="text-sm font-mono flex-1 text-gray-900 dark:text-white">
              {cliente._generatedPassword}
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(cliente._generatedPassword!);
                // simple visual feedback could be added here if needed
              }}
              className="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded transition-colors"
              title="Copiar contraseña"
            >
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
