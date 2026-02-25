import React from "react";
import { ClienteStatus } from "../../api/clientes";

export interface ClienteFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: ClienteStatus;
}

interface ClienteFormProps {
  id: string;
  formData: ClienteFormData;
  setFormData: (data: ClienteFormData) => void;
  formErrors: Record<string, string>;
  onSubmit: (e: React.FormEvent) => void;
}

export const ClienteForm: React.FC<ClienteFormProps> = ({ id, formData, setFormData, formErrors, onSubmit }) => {
  return (
    <form id={id} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Nombre</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full rounded-md border ${
              formErrors.name ? "border-red-500" : "border-gray-300"
            } px-3 py-2 text-sm focus:border-accent-6 focus:outline-none focus:ring-1 focus:ring-accent-6`}
            placeholder="Nombre del cliente"
          />
          {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
        </div>

        <div>
           <label className="block text-sm font-medium text-accent-7 mb-1">Empresa</label>
           <input
             type="text"
             value={formData.company}
             onChange={(e) => setFormData({ ...formData, company: e.target.value })}
             className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent-6 focus:outline-none focus:ring-1 focus:ring-accent-6"
             placeholder="Nombre de la empresa"
           />
        </div>

        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full rounded-md border ${
              formErrors.email ? "border-red-500" : "border-gray-300"
            } px-3 py-2 text-sm focus:border-accent-6 focus:outline-none focus:ring-1 focus:ring-accent-6`}
            placeholder="email@ejemplo.com"
          />
          {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Teléfono</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent-6 focus:outline-none focus:ring-1 focus:ring-accent-6"
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Dirección</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 focus:border-accent-6 focus:outline-none focus:ring-1 focus:ring-accent-6"
            placeholder="Dirección comercial"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-accent-7 mb-1">Estado</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ClienteStatus })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent-6 focus:outline-none focus:ring-1 focus:ring-accent-6"
          >
             <option value="active">Activo</option>
             <option value="inactive">Inactivo</option>
             <option value="lead">Lead</option>
          </select>
        </div>
      </div>
    </form>
  );
};
