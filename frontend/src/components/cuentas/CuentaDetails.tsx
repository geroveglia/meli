import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faPhone, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { Cuenta, CuentaStatus } from "../../api/cuentas";

interface CuentaDetailsProps {
  cuenta: Cuenta;
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

export const CuentaDetails: React.FC<CuentaDetailsProps> = ({ cuenta }) => {
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
