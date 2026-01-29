import React from "react";
import { ClientStatus } from "../../api/clients";
import { Switch } from "../Switch";

export interface ClientFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: ClientStatus;
}

interface ClientFormProps {
  id: string;
  formData: ClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClientFormData>>;
  formErrors: Record<string, string>;
  onSubmit: (e: React.FormEvent) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ id, formData, setFormData, formErrors, onSubmit }) => {
  return (
    <form id={id} onSubmit={onSubmit}>
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Nombre *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className={`input-base ${formErrors.name ? "border-danger-500 dark:border-danger-500" : ""}`}
            placeholder="Nombre del cliente"
          />
          {formErrors.name && <p className="text-danger-500 text-xs mt-1">{formErrors.name}</p>}
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Empresa</label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
            className="input-base"
            placeholder="Nombre de la empresa"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Email *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className={`input-base ${formErrors.email ? "border-danger-500 dark:border-danger-500" : ""}`}
            placeholder="email@ejemplo.com"
          />
          {formErrors.email && <p className="text-danger-500 text-xs mt-1">{formErrors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Teléfono</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            className="input-base"
            placeholder="+54 11 1234-5678"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Dirección</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            className="input-base"
            placeholder="Dirección completa"
          />
        </div>

        {/* Status */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-accent-7">Activo</label>
          <Switch
            checked={formData.status === "active"}
            onChange={(checked) => setFormData((prev) => ({ ...prev, status: checked ? "active" : "inactive" }))}
          />
        </div>
      </div>
    </form>
  );
};
