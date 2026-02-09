import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { rolesAPI, Role } from "../../api/roles";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { InfoModal } from "../../components/InfoModal";
import { Checkbox } from "../../components/Checkbox";
import { sweetAlert } from "../../utils/sweetAlert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faPlus, faShieldHalved, faBuilding, faUserGear, faInfoCircle, faLock, faTrash, faUserShield, faEye, faSquareCheck, faCog } from "@fortawesome/free-solid-svg-icons";

import { useNavigate } from "react-router-dom";


// Definición de módulos con metadatos
interface PermissionModule {
  label: string;
  icon: any;
  description: string;
  permissions: string[];
}

// Mapeo de acciones a etiquetas en español
const ACTION_LABELS: Record<string, string> = {
  // Acciones
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  delete: "Eliminar",
  access: "Acceso",
  collaborator: "Colaborador",
  coordinator: "Coordinador",
  // Módulos - Admin General
  dashboard: "Dashboard",
  clients: "Clientes",
  // Módulos - Admin Usuarios  
  roles: "Roles",
  areas: "Áreas",
  positions: "Cargos",
  levels: "Niveles",
  users: "Usuarios",
  // Otros módulos
  mobile: "Mobile",
  tenants: "Tenants",
};

const AVAILABLE_PERMISSIONS: Record<string, PermissionModule> = {
  // ────────── Admin General ──────────
  adminGeneral: {
    label: "Admin General",
    icon: faCog,
    description: "Secciones del menú de administración general",
    permissions: [
      "dashboard:view",
      "clients:view",
    ],
  },
  // ────────── Admin Usuarios ──────────
  adminUsuarios: {
    label: "Admin Usuarios",
    icon: faUserGear,
    description: "Secciones del menú de administración de usuarios",
    permissions: [
      "roles:view",
      "areas:view",
      "positions:view",
      "levels:view",
      "users:view",
    ],
  },
};

const SUPERADMIN_ONLY_PERMISSIONS: Record<string, PermissionModule> = {
  tenants: {
    label: "Tenants",
    icon: faBuilding,
    description: "Ver y gestionar tenants (organizaciones) - Solo SuperAdmin. Con 'Ver' tienes acceso completo por defecto.",
    permissions: ["tenants:view"],
  },
  system: {
    label: "Sistema",
    icon: faShieldHalved,
    description: "Acceso total al sistema - Solo SuperAdmin",
    permissions: ["*"],
  },
};

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
}

export const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuthStore();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda + filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus] = useState<"all" | "default" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal de acción (crear/editar)
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    permissions: [],
    isDefault: false,
  });

  // Modal informativo (ⓘ)
  const [openInfo, setOpenInfo] = useState(false);
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false);

  // Modal de solo lectura (ver detalle)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRole, setViewRole] = useState<Role | null>(null);

  const canManage = hasPermission("roles:view");
  const isSuperAdmin = user?.primaryRole === "superadmin";

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await rolesAPI.list({});
      setRoles(response.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      sweetAlert.error("Error", "No se pudieron cargar los roles");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Expande permisos con comodines (*) en permisos específicos.
   * Por ejemplo: "users:*" se expande a ["users:view", "users:create", "users:update", "users:delete"]
   */
  const expandWildcardPermissions = (permissions: string[]): string[] => {
    const expanded: string[] = [];
    const allModules = { ...AVAILABLE_PERMISSIONS, ...SUPERADMIN_ONLY_PERMISSIONS };

    permissions.forEach((perm) => {
      if (perm === "*") {
        // Permiso superadmin - agregar todos los permisos disponibles
        Object.values(allModules).forEach((mod) => {
          expanded.push(...mod.permissions);
        });
      } else if (perm.endsWith(":*")) {
        // Comodín de módulo específico (ej: "users:*")
        const [module] = perm.split(":");
        const moduleData = allModules[module];
        if (moduleData) {
          expanded.push(...moduleData.permissions);
        } else {
          // Si el módulo no existe en nuestra definición, mantener el permiso original
          expanded.push(perm);
        }
      } else {
        // Permiso específico - agregar tal cual
        expanded.push(perm);
      }
    });

    // Eliminar duplicados y ordenar
    return [...new Set(expanded)].sort();
  };

  const openCreate = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: [],
      isDefault: false,
    });
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);

    // Expandir permisos con comodines
    const expandedPermissions = expandWildcardPermissions(role.permissions);

    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: expandedPermissions,
      isDefault: role.isDefault,
    });
    setShowModal(true);
  };

  const openView = (role: Role) => {
    setViewRole(role);
    setViewOpen(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si se marca como predeterminado, verificar si ya existe otro rol predeterminado
    if (formData.isDefault) {
      const currentDefaultRole = roles.find((r) => r.isDefault && r._id !== editingRole?._id);
      if (currentDefaultRole) {
        const result = await sweetAlert.confirm("Cambiar rol predeterminado", `El rol "${currentDefaultRole.name}" es actualmente el predeterminado. Si continúas, "${formData.name}" será el nuevo rol predeterminado y "${currentDefaultRole.name}" dejará de serlo. ¿Deseas continuar?`);
        if (!result.isConfirmed) {
          return;
        }
      }
    }

    try {
      if (editingRole) {
        await rolesAPI.update(editingRole._id, formData);
        sweetAlert.success("Rol actualizado", "Los cambios se han guardado correctamente");
      } else {
        await rolesAPI.create(formData);
        sweetAlert.success("Rol creado", "El rol se ha creado correctamente");
      }
      closeModal();
      fetchRoles();
    } catch (error: any) {
      const message = error.response?.data?.error || "Error al guardar el rol";
      sweetAlert.error("Error", message);
    }
  };

  const handleDelete = async (role: Role) => {
    const result = await sweetAlert.confirm("¿Eliminar rol?", `¿Estás seguro de que quieres eliminar el rol "${role.name}"?`);
    if (result.isConfirmed) {
      try {
        await rolesAPI.remove(role._id);
        sweetAlert.success("Rol eliminado", "El rol ha sido eliminado correctamente");
        fetchRoles();
      } catch (error: any) {
        const message = error.response?.data?.error || "Error al eliminar el rol";
        sweetAlert.error("Error", message);
      }
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => {
      const currentPermissions = [...prev.permissions];
      const isCurrentlySelected = currentPermissions.includes(permission);

      if (isCurrentlySelected) {
        return {
          ...prev,
          permissions: currentPermissions.filter((p) => p !== permission),
        };
      } else {
        return {
          ...prev,
          permissions: [...currentPermissions, permission],
        };
      }
    });
  };

  const filteredRoles = roles.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q.length === 0 || r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" ? true : filterStatus === "default" ? r.isDefault : !r.isDefault;

    // Filtro de fechas (createdAt)
    let matchesDate = true;
    if (startDate || endDate) {
      const createdAt = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (startDate) {
        const start = new Date(startDate).getTime();
        matchesDate = matchesDate && createdAt >= start;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        matchesDate = matchesDate && createdAt <= end;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  if (loading) return <LoadingSpinner message="Cargando roles..." />;

  return (
    <PageLayout
      title="Roles"
      subtitle="Gestiona roles y permisos del sistema"
      faIcon={{ icon: faUserShield }}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Roles",
        content: (
            <p>En esta sección puede administrar los roles de usuario y sus permisos asociados. Puede crear nuevos roles, editar los existentes y asignar permisos específicos para controlar el acceso a diferentes funciones del sistema.</p>
        ),
      }}
      shouldShowInfo={true}
      onBack={() => navigate("/admin/users")}
      headerActions={
        <div className="flex items-center gap-3">
          {canManage && (
            <button onClick={openCreate} className="p-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm shadow-sm">
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3 lg:h-4 lg:w-4" />
            </button>
          )}
        </div>
      }
      searchAndFilters={
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar roles..."
          /*  filters={[
            {
              value: filterStatus,
              onChange: (v) => setFilterStatus(v as "all" | "default" | "custom"),
              options: [
                { value: "all", label: "Todos" },
                { value: "default", label: "Por defecto" },
                { value: "custom", label: "Personalizado" },
              ],
            },
          ]} */
          dateFilter={{
            startDate,
            endDate,
            onStartDateChange: setStartDate,
            onEndDateChange: setEndDate,
          }}
        />
      }
      // Modal VER (solo lectura)
      viewModal={{
        isOpen: viewOpen,
        onClose: closeView,
        title: viewRole ? viewRole.name : "Rol",
        subtitle: viewRole?.description,
        size: "md",
        actions: [
          ...(canManage && viewRole?.name.toLowerCase() !== "superadmin"
            ? [
                {
                  label: "Editar rol",
                  onClick: () => {
                    if (viewRole) openEdit(viewRole);
                    closeView();
                  },
                  variant: "blue",
                } as const,
              ]
            : []),
          {
            label: "Cancelar",
            onClick: closeView,
            variant: "ghost",
          },
        ],
        content: viewRole ? (
          <div className="space-y-4">
            {/* Badge siempre presente */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-accent-5 text-white`}>{viewRole.isDefault ? "Por defecto" : "Personalizado"}</span>
              {viewRole.permissions.some((p) => p.startsWith("tenants:")) && <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-accent-5 text-white">SuperAdmin</span>}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-accent-9 mb-2">Descripción</h4>
              <p className="text-sm text-accent-7">{viewRole.description || "—"}</p>
            </div>

            <div>
              {viewRole.name.toLowerCase() === "superadmin" ? (
                <p className="text-sm text-accent-7 font-medium">Acceso total al sistema</p>
              ) : viewRole.permissions.length === 0 ? (
                <p className="text-sm text-accent-6">Sin permisos</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries({ ...AVAILABLE_PERMISSIONS, ...SUPERADMIN_ONLY_PERMISSIONS }).map(([moduleKey, moduleData]) => {
                    const modulePermissions = moduleData.permissions.filter((p) => viewRole.permissions.includes(p));
                    if (modulePermissions.length === 0) return null;

                    const isSuperAdminModule = !!SUPERADMIN_ONLY_PERMISSIONS[moduleKey];
                    const isAdminModule = false;

                    return (
                      <div key={moduleKey} className={`border rounded-lg p-3 ${isSuperAdminModule ? "border-accent-4 bg-accent-2" : isAdminModule ? "border-accent-4 bg-accent-2" : "border-accent-4 bg-accent-2"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSuperAdminModule ? "bg-accent-3" : isAdminModule ? "bg-accent-3" : "bg-accent-3"}`}>
                            <FontAwesomeIcon icon={moduleData.icon} className={`h-4 w-4 ${isSuperAdminModule ? "text-accent-9" : isAdminModule ? "text-accent-9" : "text-accent-9"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-semibold text-accent-9 text-sm">{moduleData.label}</h5>
                              {isSuperAdminModule && <span className="text-xs px-2 py-0.5 rounded-full bg-accent-5 text-white font-medium">SuperAdmin</span>}
                              {isAdminModule && <span className="text-xs px-2 py-0.5 rounded-full bg-accent-5 text-white font-medium">Admin/SuperAdmin</span>}
                            </div>
                            <p className="text-xs text-accent-6 mb-2">{moduleData.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null,
      }}
      // Modal CREAR/EDITAR
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingRole ? "Editar Rol" : "Nuevo Rol",
        subtitle: "Define nombre, descripción y permisos",
        size: "lg",
        actions: [
          {
            label: editingRole ? "Actualizar" : "Crear",
            onClick: () => {
              const form = document.querySelector<HTMLFormElement>("#role-form");
              form?.requestSubmit();
            },
            variant: "primary",
          },
          {
            label: "Cancelar",
            onClick: closeModal,
            variant: "ghost",
          },
        ],
        content: (
          <form id="role-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-accent-7 mb-2">Nombre *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="input-base" placeholder="Nombre del rol" />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-7 mb-2">Descripción</label>
                <textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="input-base resize-none" placeholder="Descripción del rol" />
              </div>

              <div>
                <Checkbox
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isDefault: (e.target as HTMLInputElement).checked,
                    }))
                  }
                  label="Rol por defecto"
                />
                <p className="text-xs text-accent-6 mt-1 ml-8">Se asigna automáticamente a nuevos usuarios. Solo puede haber un rol predeterminado por tenant.</p>
              </div>

              <div>
                <div className="flex items-center mb-4 gap-2">
                  <label className="block text-lg font-semibold text-accent-9">Permisos</label>
                  <button type="button" onClick={() => setShowPermissionsInfo(true)} className="text-accent-7 hover:text-accent-9 transition-colors" title="Información sobre permisos">
                    <FontAwesomeIcon icon={faInfoCircle} className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {/* Permisos Generales */}
                  {Object.entries(AVAILABLE_PERMISSIONS).map(([module, moduleData]) => {
                    return (
                      <div key={module} className="border border-accent-4 rounded-lg p-4 hover:border-accent-5 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-accent-3 flex items-center justify-center flex-shrink-0">
                            <FontAwesomeIcon icon={moduleData.icon} className="h-4 w-4 text-accent-9" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-accent-9">{moduleData.label}</h4>
                            <p className="text-xs text-accent-6 mt-0.5">{moduleData.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 pl-[36px] mt-3">
                          {moduleData.permissions.map((permission) => {
                            const [moduleName, action] = permission.split(":");
                            // Para permisos :view, mostrar el nombre del módulo; para otros, mostrar la acción
                            const label = action === "view" 
                              ? (ACTION_LABELS[moduleName] || moduleName)
                              : (ACTION_LABELS[action] || action);

                            return (
                              <Checkbox 
                                checked={formData.permissions.includes(permission)} 
                                onChange={() => togglePermission(permission)} 
                                label={label}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Permisos de SuperAdmin */}
                  {isSuperAdmin &&
                    editingRole?.name.toLowerCase() !== "superadmin" &&
                    Object.entries(SUPERADMIN_ONLY_PERMISSIONS).map(([module, moduleData]) => {
                      return (
                        <div key={module} className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-950/30">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent-3 flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon icon={moduleData.icon} className="h-5 w-5 text-accent-9" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-accent-9">{moduleData.label}</h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-5 text-white font-medium">SuperAdmin</span>
                              </div>
                              <p className="text-xs text-accent-6 mt-0.5">{moduleData.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 pl-[52px] mt-3">
                            {moduleData.permissions.map((permission) => {
                              const [moduleName, action] = permission.split(":");
                              // Para permisos :view, mostrar el nombre del módulo; para otros, mostrar la acción
                              const label = action === "view" 
                                ? (ACTION_LABELS[moduleName] || moduleName)
                                : (ACTION_LABELS[action] || action);

                              return (
                                  <Checkbox 
                                    checked={formData.permissions.includes(permission)} 
                                    onChange={() => togglePermission(permission)} 
                                    label={label}
                                  />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </form>
        ),
      }}
    >
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
        {filteredRoles.map((role) => {
          const isSuperAdminRole = role.name.toLowerCase() === "superadmin";

          return (
            <Card
              key={role._id}
              onClick={() => openView(role)}
              className="hover:scale-105 hover:shadow-lg transition-all duration-200"
              header={{
                title: role.name,
                subtitle: role.description,
                icon: faUserShield,
                // Badge SIEMPRE visible en las cards
                badges: [
                  ...(role.isDefault
                    ? [
                        {
                          text: "Por defecto",
                          variant: "success" as const,
                        },
                      ]
                    : []),
                  ...(role.permissions.some((p) => p.startsWith("tenants:"))
                    ? [
                        {
                          text: "SuperAdmin",
                          variant: "warning" as const,
                        },
                      ]
                    : []),
                ],
              }}
              footer={{
                leftContent: isSuperAdminRole ? <span className="text-xs text-accent-5">Acceso total al sistema</span> : <span className="text-xs text-accent-5">{role.permissions.length} permisos</span>,
                actions: isSuperAdminRole
                  ? [
                      {
                        icon: faLock,
                        onClick: (e) => {
                          e.stopPropagation();
                        },
                        title: "Rol protegido",
                        variant: "default",
                        disabled: true,
                      },
                    ]
                  : [
                      {
                        icon: faEdit,
                        onClick: (e) => {
                          e.stopPropagation();
                          openEdit(role);
                        },
                        title: "Editar",
                        variant: "default" as const,
                      },
                      ...(hasPermission("roles:delete")
                        ? [
                            {
                              icon: faTrash,
                              onClick: (e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDelete(role);
                              },
                              title: "Eliminar",
                              variant: "default" as const,
                            },
                          ]
                        : []),
                    ],
              }}
            ></Card>
          );
        })}
        {canManage && (
          <Card
            variant="create"
            onClick={openCreate}
            header={{
              title: "Nuevo Rol",
              subtitle: "Crear un nuevo rol con permisos personalizados",
              icon: faUserShield,
            }}
          />
        )}
      </div>

      {filteredRoles.length === 0 && (
        <EmptyState
          icon={faShieldHalved}
          title={startDate || endDate ? "No hay roles en este rango de fechas" : "No hay roles"}
          description={startDate || endDate ? `No se encontraron roles ${startDate && endDate ? `desde ${new Date(startDate).toLocaleDateString()} hasta ${new Date(endDate).toLocaleDateString()}` : startDate ? `desde ${new Date(startDate).toLocaleDateString()}` : `hasta ${new Date(endDate).toLocaleDateString()}`}` : "Crea tu primer rol para comenzar a gestionar permisos."}
          action={
            hasPermission("roles:view")
              ? {
                  label: "Nuevo Rol",
                  onClick: openCreate,
                  icon: faPlus,
                }
              : undefined
          }
        />
      )}

      {/* Modal de información sobre permisos */}
      <InfoModal
        isOpen={showPermissionsInfo}
        onClose={() => setShowPermissionsInfo(false)}
        title="¿Cómo funcionan los permisos?"
        size="lg"
        zIndex={60}
        actions={[
          {
            label: "Entendido",
            onClick: () => setShowPermissionsInfo(false),
            variant: "primary",
          },
        ]}
      >
        <div className="space-y-5 text-sm">
          {/* Sistema simplificado - destacado primero */}
          <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/40 dark:to-cyan-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-9 text-accent-2 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faEye} className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-base mb-1">Sistema simplificado de permisos</h4>
                <p className="text-emerald-800 dark:text-emerald-200 text-sm">Los permisos ahora son simples y basados en visibilidad</p>
              </div>
            </div>
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <p className="text-emerald-900 dark:text-emerald-100 flex-1">
                  Con el permiso <strong>"Ver"</strong> de un módulo, tienes <strong>acceso completo por defecto</strong> (ver, crear, editar, eliminar)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <p className="text-emerald-900 dark:text-emerald-100 flex-1">
                  Si un módulo no aparece en el navbar, es porque no tienes permiso de <strong>"Ver"</strong> para ese módulo
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <p className="text-emerald-900 dark:text-emerald-100 flex-1">
                  Los roles <strong>superadmin y admin</strong> siempre tienen acceso total al sistema
                </p>
              </div>
            </div>
          </div>

          {/* Ejemplo práctico */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FontAwesomeIcon icon={faInfoCircle} className="h-5 w-5 text-black dark:text-white" />
              <h4 className="font-bold text-black dark:text-white text-base">Ejemplo práctico</h4>
            </div>
            <div className="space-y-3 text-black dark:text-white">
              <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
                <p className="text-sm mb-2 font-semibold">Rol "User" (Usuario estándar)</p>
                <p className="text-xs text-gray-800 dark:text-gray-200 mb-2">
                  <strong>Permisos asignados:</strong> Dashboard (Ver), Clientes (Ver), Calendario (Ver), Creative Suite (Ver)
                </p>
                <p className="text-xs text-gray-800 dark:text-gray-200">→ Verá en el navbar: Dashboard, Clientes, Calendario, Creative Suite</p>
                <p className="text-xs text-gray-800 dark:text-gray-200">→ Verá el selector de clientes y podrá trabajar con ellos</p>
                <p className="text-xs text-gray-800 dark:text-gray-200">
                  → Podrá <strong>ver, crear, editar y eliminar</strong> dentro de cada módulo autorizado
                </p>
              </div>

              <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
                <p className="text-sm mb-2 font-semibold">Rol "Admin" (Administrador)</p>
                <p className="text-xs text-gray-800 dark:text-gray-200 mb-2">
                  <strong>Permisos asignados:</strong> Dashboard, Clientes, Calendario, Creative Suite
                </p>
                <p className="text-xs text-gray-800 dark:text-gray-200">→ Tiene acceso completo a todos los módulos generales</p>
                <p className="text-xs text-gray-800 dark:text-gray-200">→ Control completo sobre la configuración del sistema</p>
              </div>

              <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
                <p className="text-sm mb-2 font-semibold">Rol personalizado "Solo Dashboard"</p>
                <p className="text-xs text-gray-800 dark:text-gray-200 mb-2">
                  <strong>Permisos asignados:</strong> Solo Dashboard (Ver)
                </p>
                <p className="text-xs text-gray-800 dark:text-gray-200">→ Este usuario solo verá el Dashboard en el navbar</p>
                <p className="text-xs text-gray-800 dark:text-gray-200">→ NO verá selector de clientes, calendario, ni otros módulos</p>
              </div>

              <div className="bg-neutral-50/60 dark:bg-neutral-900/20 rounded-lg p-3">
                <p className="text-sm mb-2 font-semibold">Roles Admin y SuperAdmin</p>
                <p className="text-xs text-gray-800 dark:text-gray-200">
                  → Tienen <strong>acceso completo automático</strong> a todo el sistema, independientemente de los permisos asignados
                </p>
              </div>
            </div>
          </div>

          {/* Módulos disponibles */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faSquareCheck} className="h-4 w-4 text-accent-9" />
              Módulos disponibles
            </h4>

            {/* Permisos generales */}
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Permisos Generales</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(AVAILABLE_PERMISSIONS).map(([key, moduleData]) => (
                  <div key={key} className="flex items-start gap-2 p-2.5 bg-accent-2 border border-accent-4 rounded-lg hover:border-accent-5 transition-colors">
                    <FontAwesomeIcon icon={moduleData.icon} className="h-4 w-4 text-accent-9 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-accent-9 text-xs">{moduleData.label}</div>
                      <div className="text-accent-6 text-xs mt-0.5">{moduleData.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permisos de SuperAdmin */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Permisos de SuperAdmin</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(SUPERADMIN_ONLY_PERMISSIONS).map(([key, moduleData]) => (
                  <div key={key} className="flex items-start gap-2 p-2.5 bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <FontAwesomeIcon icon={moduleData.icon} className="h-4 w-4 text-black dark:text-white mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white text-xs">{moduleData.label}</div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{moduleData.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rol por defecto */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2">Rol por defecto</h4>
            <p className="text-gray-700 dark:text-gray-300 text-xs">El rol marcado como "por defecto" se asigna automáticamente a nuevos usuarios cuando se registran. Solo puede haber un rol por defecto por organización.</p>
          </div>
        </div>
      </InfoModal>
    </PageLayout>
  );
};
