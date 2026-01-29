import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { Switch } from "../Switch";
import { User } from "../../api/users";
import { Role } from "../../api/roles";
import { Position } from "../../api/positions";
import { Level } from "../../api/levels";
import { Area } from "../../api/areas";
import { Checkbox } from "../Checkbox";
import { useNavigate } from "react-router-dom";

export interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleId: string;
  positionId?: string;
  levelId?: string;
  areaId?: string;
}

interface UserFormProps {
  id: string;
  mode: "edit" | "password";
  editingUser: User | null;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  handlePasswordSubmit: (e: React.FormEvent) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  roles: Role[];
  positions: Position[];
  levels: Level[];
  areas: Area[];
  fetchLevels: (positionId?: string) => void;
}

export const UserForm: React.FC<UserFormProps> = ({
  id,
  mode,
  editingUser,
  formData,
  setFormData,
  handleSubmit,
  handlePasswordSubmit,
  newPassword,
  setNewPassword,
  roles,
  positions,
  levels,
  areas,
  fetchLevels,
}) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (mode === "edit") {
        if (formData.positionId) {
            fetchLevels(formData.positionId);
        } else {
            fetchLevels(); // Fetch general levels
        }
    }
  }, [formData.positionId, mode]);


  if (mode === "password") {
    return (
      <form id={id} onSubmit={handlePasswordSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-2">Nueva Contraseña *</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-base pr-10"
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} className="h-4 w-4 text-accent-4 hover:text-accent-6" />
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form id={id} onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-accent-7 mb-2">Email *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className="input-base"
            placeholder="usuario@ejemplo.com"
          />
        </div>

        {!editingUser && (
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-2">Contraseña *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className="input-base pr-10"
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4 text-accent-4 hover:text-accent-6" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-2">Nombre</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              className="input-base"
              placeholder="Nombre"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-2">Apellido</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              className="input-base"
              placeholder="Apellido"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* AREA */}
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-2">Area</label>

            {areas.length === 0 ? (
              <p className="text-xs text-accent-6 mt-1">
                No has creado ninguna area aún.{" "}
                <button type="button" onClick={() => navigate("/admin/areas")} className="text-accent-9 hover:underline font-medium">
                  Crear area →
                </button>
              </p>
            ) : (
              <select
                value={formData.areaId || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    areaId: e.target.value || undefined,
                  }))
                }
                className="input-base"
              >
                <option value="">Sin area</option>
                {areas.map((area) => (
                  <option key={area._id} value={area._id}>
                    {area.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* CARGO */}
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-2">Cargo</label>

            {positions.length === 0 ? (
              <p className="text-xs text-accent-6 mt-1">
                No has creado ningún cargo aún.{" "}
                <button type="button" onClick={() => navigate("/admin/positions")} className="text-accent-9 hover:underline font-medium">
                  Crear cargo →
                </button>
              </p>
            ) : (
              <>
                <select
                  value={formData.positionId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      positionId: e.target.value || undefined,
                      levelId: undefined, // resetea nivel cuando cambia cargo
                    }))
                  }
                  className="input-base"
                >
                  <option value="">Sin cargo</option>
                  {positions.map((position) => (
                    <option key={position._id} value={position._id}>
                      {position.name}
                    </option>
                  ))}
                </select>

                {!formData.positionId && <p className="text-xs text-accent-5 mt-1">Selecciona un cargo para poder asignar un nivel</p>}
              </>
            )}
          </div>

          {/* NIVEL – SOLO SI HAY CARGO */}
          {formData.positionId && (
            <div>
              <label className="block text-sm font-medium text-accent-7 dark:text-gray-300 mb-2">Nivel</label>

              {levels.length === 0 ? (
                <p className="text-xs text-accent-6 dark:text-gray-400 mt-1">
                  No hay niveles disponibles para este cargo.{" "}
                  <button type="button" onClick={() => navigate("/admin/levels")} className="text-accent-9 hover:underline font-medium">
                    Crear nivel →
                  </button>
                </p>
              ) : (
                <>
                  <select
                    value={formData.levelId || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        levelId: e.target.value || undefined,
                      }))
                    }
                    className="input-base"
                  >
                    <option value="">Sin nivel</option>

                    {/* Generales */}
                    {levels.filter((l) => l.type === "general").length > 0 && (
                      <optgroup label="Niveles Generales">
                        {levels
                          .filter((l) => l.type === "general")
                          .map((level) => (
                            <option key={level._id} value={level._id}>
                              {level.name}
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Específicos */}
                    {levels.filter((l) => l.type === "position-specific").length > 0 && (
                      <optgroup label="Niveles Específicos del Cargo">
                        {levels
                          .filter((l) => l.type === "position-specific")
                          .map((level) => (
                            <option key={level._id} value={level._id}>
                              {level.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>

                  {!formData.levelId && <p className="text-xs text-accent-5 mt-1">Selecciona un nivel para completar el perfil</p>}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-b border-accent-4 pb-4">
          <div>
            <label className="block text-sm font-medium text-accent-7">Estado de Usuario</label>
            <p className="text-xs text-accent-5">Define si el usuario puede acceder al sistema</p>
          </div>
          <Switch
            checked={formData.isActive}
            onChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-accent-7 mb-2">Rol</label>
          <div className="space-y-2 border border-accent-4 rounded-lg p-3">
            {roles
              .filter((role) => role.name.toLowerCase() !== "superadmin")
              .map((role) => (
                <div key={role._id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.roleId === role._id}
                    onChange={() => setFormData((prev) => ({ ...prev, roleId: role._id }))}
                    label={role.name}
                  />
                  {role.description && <p className="text-xs text-accent-5 ml-8 -mt-1">{role.description}</p>}
                </div>
              ))}
          </div>
        </div>
      </div>
    </form>
  );
};
