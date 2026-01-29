import React from "react";
import { Switch } from "../Switch";

export interface ProjectFormData {
  name: string;
  description: string;
  status: "active" | "completed" | "on_hold";
  startDate: string;
  endDate: string;
}

interface ProjectFormProps {
  id: string;
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  formErrors: Record<string, string>;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ id, formData, setFormData, formErrors, onSubmit }) => {
  return (
    <form id={id} onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Nombre del Proyecto *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-base"
          placeholder="Ej. Implementación ERP"
          required
        />
        {formErrors.name && <p className="text-danger-500 text-xs mt-1">{formErrors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Descripción
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-base min-h-[80px]"
          placeholder="Detalles sobre el alcance del proyecto..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Fecha Inicio
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Fecha Fin
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="input-base"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Activo
        </label>
        <Switch
          checked={formData.status === "active"}
          onChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "on_hold" })}
        />
      </div>
    </form>
  );
};
