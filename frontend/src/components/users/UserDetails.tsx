import React from "react";
import { User } from "../../api/users";

interface UserDetailsProps {
  user: User;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${user.isActive ? "bg-accent-9 text-accent-2" : "bg-accent-3 text-accent-8"}`}>
          {user.isActive ? "Activo" : "Inactivo"}
        </span>
        {user.primaryRole && <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-accent-3 text-accent-8 uppercase">{user.primaryRole}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-accent-9 mb-1">Nombre</h4>
          <p className="text-sm text-accent-7">{user.firstName || "—"}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-accent-9 mb-1">Apellido</h4>
          <p className="text-sm text-accent-7">{user.lastName || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-accent-9 mb-1">Cargo</h4>
          <p className="text-sm text-accent-7">{typeof user.positionId === "object" && user.positionId?.name ? user.positionId.name : "Sin cargo"}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-accent-9 mb-1">Area</h4>
          <p className="text-sm text-accent-7">{typeof user.areaId === "object" && user.areaId?.name ? user.areaId.name : "Sin area"}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-accent-9 mb-1">Nivel</h4>
          <p className="text-sm text-accent-7">{typeof user.levelId === "object" && user.levelId?.name ? user.levelId.name : "Sin nivel"}</p>
        </div>
      </div>

      {user.clientIds && user.clientIds.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-2">Clientes asignados</h4>
          <div className="flex flex-wrap gap-1">
            {user.clientIds.map((client) => (
              <span key={client._id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-2 border border-accent-4 text-accent-8">
                {client.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-accent-9 mb-2">Roles ({user.roles.filter((r) => r.name.toLowerCase() !== "superadmin").length})</h4>
        {user.roles.filter((r) => r.name.toLowerCase() !== "superadmin").length === 0 ? (
          <p className="text-sm text-accent-6">Sin roles</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.roles
              .filter((role) => role.name.toLowerCase() !== "superadmin")
              .map((role) => (
                <span key={role._id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-9 text-accent-2">
                  {role.name}
                </span>
              ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-accent-9 mb-1">Último ingreso</h4>
        <p className="text-sm text-accent-7">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Nunca"}</p>
      </div>
    </div>
  );
};
