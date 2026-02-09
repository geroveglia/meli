import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../stores/authStore";
import { usersAPI, User } from "../../api/users";
import { rolesAPI, Role } from "../../api/roles";
import { positionsAPI, Position } from "../../api/positions";
import { levelsAPI, Level } from "../../api/levels";
import { areasAPI, Area } from "../../api/areas";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { Checkbox } from "../../components/Checkbox";
import { Badge } from "../../components/Badge";
import { sweetAlert } from "../../utils/sweetAlert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faUserShield, faUserTie, faUserGraduate, faEdit, faTrash, faKey, faPlus, faShieldHalved, faEye, faEyeSlash, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

import { useNavigate } from "react-router-dom";
import { UserFormData } from "../../components/users/UserForm";





type ModalMode = "edit" | "password";

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  // data
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // solo primer render
  const [isFetching, setIsFetching] = useState(false); // búsquedas/filtrado

  // búsqueda/filters (server-side)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive] = useState<"all" | "active" | "inactive">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // modal create/edit/password
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("edit");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // form create/edit
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    isActive: true,
    roleId: "",
    positionId: undefined,
    levelId: undefined,
    areaId: undefined,
  });

  // password modal fields (cuando modalMode === "password")
  const [passwordUserId, setPasswordUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // info modal (ⓘ)
  const [openInfo, setOpenInfo] = useState(false);



  // view modal (solo lectura)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  const canManage = hasPermission("users:manage");

  // Para descartar respuestas viejas
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Carga inicial
    const init = async () => {
      try {
        setInitialLoading(true);
        await Promise.all([fetchUsers({ silent: true }), fetchRoles(), fetchPositions(), fetchLevels(), fetchAreas()]);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce para refrescar la lista cuando cambian searchTerm / filterActive / fechas
  useEffect(() => {
    const h = setTimeout(() => {
      fetchUsers({ silent: true });
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterActive, startDate, endDate]);

  const fetchUsers = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setIsFetching(true);
      const currentId = ++requestIdRef.current;

      const params: any = {};
      if (searchTerm) params.email = searchTerm;
      if (filterActive !== "all") params.isActive = filterActive === "active";
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await usersAPI.list(params);

      // Solo aplico si esta respuesta es la más reciente
      if (currentId === requestIdRef.current) {
        // Mostrar TODOS los usuarios de la base de datos
        setUsers(response.users);
        console.log("📋 Usuarios cargados:", response.users.length);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      sweetAlert.error("Error", "No se pudieron cargar los usuarios");
    } finally {
      if (!silent) setIsFetching(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await rolesAPI.list({ limit: 100 });
      // Mostrar TODOS los roles disponibles
      setRoles(response.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await positionsAPI.list({ limit: 100 });
      setPositions(response.positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  const fetchLevels = async (positionId?: string) => {
    try {
      if (positionId) {
        const levelsForPosition = await levelsAPI.listForPosition(positionId);
        setLevels(levelsForPosition);
      } else {
        const response = await levelsAPI.list({ limit: 100 });
        const generalLevels = response.levels.filter((l) => l.type === "general");
        setLevels(generalLevels);
      }
    } catch (error) {
      console.error("Error fetching levels:", error);
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await areasAPI.list({ limit: 100 });
      setAreas(response.areas);
    } catch (error) {
      console.error("Error fetching areas:", error);
    }
  };

  // Abrir modales
  const openCreate = () => {
    setEditingUser(null);
    setModalMode("edit");

    // Pre-seleccionar el rol por defecto (isDefault: true)
    const defaultRole = roles.find((role) => role.isDefault);
    // const defaultRoles = defaultRole ? [defaultRole._id] : [];

    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      isActive: true,
      roleId: defaultRole?._id || "",
      positionId: undefined,
      levelId: undefined,
      areaId: undefined,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  useEffect(() => {
    if (showModal && modalMode === "edit") {
      if (formData.positionId) {
        fetchLevels(formData.positionId);
      } else {
        fetchLevels();
      }
    }
  }, [formData.positionId, showModal, modalMode]);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setModalMode("edit");

    // Extraer positionId correctamente (puede ser string u objeto)
    const positionId = typeof user.positionId === "string" ? user.positionId : typeof user.positionId === "object" && user.positionId?._id ? user.positionId._id : undefined;

    // Extraer levelId correctamente (puede ser string u objeto)
    // Extraer levelId correctamente (puede ser string u objeto)
    const levelId = typeof user.levelId === "string" ? user.levelId : typeof user.levelId === "object" && user.levelId?._id ? user.levelId._id : undefined;

    // Extraer areaId correctamente
    const areaId = typeof user.areaId === "string" ? user.areaId : typeof user.areaId === "object" && user.areaId?._id ? user.areaId._id : undefined;

    setFormData({
      email: user.email,
      password: "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      isActive: user.isActive,
      roleId: user.roles[0]?._id || "",
      positionId,
      levelId,
      areaId,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const openPassword = (userId: string) => {
    setModalMode("password");
    setPasswordUserId(userId);
    setNewPassword("");
    setNewPassword("");
    setShowModal(true);
  };

  const closeModal = () => {
    setPasswordUserId("");
    setNewPassword("");
    setShowModal(false);
  };

  const openView = (user: User) => {
    setViewUser(user);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewUser(null);
  };

  // Submit create/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = { 
        ...formData,
        roles: formData.roleId ? [formData.roleId] : [] // Convert back to array for API
      };

      // Enviar null explícitamente cuando se selecciona "Sin cargo" o "Sin nivel"
      // Esto permite que el backend elimine el campo de la DB
      if (!submitData.positionId || submitData.positionId === "") {
        submitData.positionId = null;
        // Si no hay cargo, no puede haber nivel
        submitData.levelId = null;
      } else if (!submitData.levelId || submitData.levelId === "") {
        submitData.levelId = null;
      }

      // Validación adicional: no permitir levelId sin positionId
      if (submitData.levelId && !submitData.positionId) {
        submitData.levelId = null;
      }

      if (editingUser) {
        // no enviar password vacío al editar
        delete submitData.password;
        await usersAPI.update(editingUser._id, submitData);
        sweetAlert.success("Usuario actualizado", "Los cambios se han guardado correctamente");
      } else {
        await usersAPI.create(submitData);
        sweetAlert.success("Usuario creado", "El usuario se ha creado correctamente");
      }
      closeModal();
      fetchUsers({ silent: true });
    } catch (error: any) {
      const message = error.response?.data?.error || "Error al guardar el usuario";
      sweetAlert.error("Error", message);
    }
  };

  // Submit password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersAPI.updatePassword(passwordUserId, newPassword);
      sweetAlert.success("Contraseña actualizada", "La contraseña se ha actualizado correctamente");
      closeModal();
    } catch (error: any) {
      const message = error.response?.data?.error || "Error al actualizar la contraseña";
      sweetAlert.error("Error", message);
    }
  };

  const handleDelete = async (user: User) => {
    const result = await sweetAlert.confirm("¿Eliminar usuario?", `¿Estás seguro de que quieres eliminar al usuario "${user.email}"?`);
    if (result.isConfirmed) {
      try {
        await usersAPI.remove(user._id);
        sweetAlert.success("Usuario eliminado", "El usuario ha sido eliminado correctamente");
        fetchUsers({ silent: true });
      } catch (error: any) {
        const message = error.response?.data?.error || "Error al eliminar el usuario";
        sweetAlert.error("Error", message);
      }
    }
  };

  if (initialLoading) return <LoadingSpinner message="Cargando usuarios..." />;

  return (
    <PageLayout
      title="Usuarios"
      subtitle="Gestiona usuarios y sus roles"
      faIcon={{ icon: faUser }}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Usuarios",
        content: (
            <p>Gestione los usuarios del sistema. Aquí puede registrar nuevos usuarios, desactivar cuentas existentes, asignar roles y resetear contraseñas.</p>
        ),
      }}
      shouldShowInfo={true}
      headerActions={
        <div className="flex items-center gap-3">
          {canManage && (
            <button onClick={openCreate} className="p-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm border border-transparent shadow-sm">
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3 lg:h-4 lg:w-4" />
            </button>
          )}
          <button onClick={() => navigate("/admin/roles")} className="px-4 py-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faUserShield} className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:block">Roles</span>
          </button>
          <button onClick={() => navigate("/admin/positions")} className="px-4 py-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faUserTie} className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:block">Cargos</span>
          </button>
          <button onClick={() => navigate("/admin/levels")} className="px-4 py-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faUserGraduate} className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:block">Niveles</span>
          </button>
          <button onClick={() => navigate("/admin/areas")} className="px-4 py-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:block">Areas</span>
          </button>
        </div>
      }
      // Igual que RolesPage: SearchAndFilters directo (sin botón Buscar)
      searchAndFilters={
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por email..."
          /*           filters={[
            {
              value: filterActive,
              onChange: (v) => setFilterActive(v as "all" | "active" | "inactive"),
              options: [
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
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
      // Ver (solo lectura)
      viewModal={{
        isOpen: viewOpen,
        onClose: closeView,
        title: viewUser ? (viewUser.firstName || viewUser.lastName ? `${viewUser.firstName || ""} ${viewUser.lastName || ""}`.trim() : viewUser.email.split("@")[0]) : "Usuario",
        subtitle: viewUser?.email,
        size: "md",
        actions: [
          ...(canManage
            ? [
                {
                  label: "Editar",
                  onClick: () => {
                    if (viewUser) openEdit(viewUser);
                    closeView();
                  },
                  variant: "blue",
                } as const,
              ]
            : []),
          ...(canManage
            ? [
                {
                  label: "Cambiar contraseña",
                  onClick: () => {
                    if (viewUser) openPassword(viewUser._id);
                    closeView();
                  },
                  variant: "ghost",
                } as const,
              ]
            : []),
          {
            label: "Cancelar",
            onClick: closeView,
            variant: "ghost",
          },
        ],
        content: viewUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-accent-5 text-white`}>{viewUser.isActive ? "Activo" : "Inactivo"}</span>
              {viewUser.primaryRole && <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-accent-5 text-white uppercase">{viewUser.primaryRole}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-accent-1 mb-1">Nombre</h4>
                <p className="text-sm text-accent-1">{viewUser.firstName || "—"}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-accent-1 mb-1">Apellido</h4>
                <p className="text-sm text-accent-1">{viewUser.lastName || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-accent-1 mb-1">Cargo</h4>
                <p className="text-sm text-accent-1">{typeof viewUser.positionId === "object" && viewUser.positionId?.name ? viewUser.positionId.name : "Sin cargo"}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-accent-1 mb-1">Area</h4>
                <p className="text-sm text-accent-1">{typeof viewUser.areaId === "object" && viewUser.areaId?.name ? viewUser.areaId.name : "Sin area"}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-accent-1 mb-1">Nivel</h4>
                <p className="text-sm text-accent-1">{typeof viewUser.levelId === "object" && viewUser.levelId?.name ? viewUser.levelId.name : "Sin nivel"}</p>
              </div>
            </div>

            {viewUser.clientIds && viewUser.clientIds.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-accent-1 dark:text-neutral-100 mb-2">Clientes asignados</h4>
                <div className="flex flex-wrap gap-1">
                  {viewUser.clientIds.map((client) => (
                    <span key={client._id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-2 border border-accent-4 text-accent-8">
                      {client.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-accent-1 mb-2">Roles ({viewUser.roles.filter((r) => r.name.toLowerCase() !== "superadmin").length})</h4>
              {viewUser.roles.filter((r) => r.name.toLowerCase() !== "superadmin").length === 0 ? (
                <p className="text-sm text-accent-6">Sin roles</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {viewUser.roles
                    .filter((role) => role.name.toLowerCase() !== "superadmin")
                    .map((role) => (
                      <span key={role._id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-5 text-white">
                        {role.name}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-accent-1 mb-1">Último ingreso</h4>
              <p className="text-sm text-accent-1">{viewUser.lastLoginAt ? new Date(viewUser.lastLoginAt).toLocaleString() : "Nunca"}</p>
            </div>
          </div>
        ) : null,
      }}
      // Crear/Editar o Cambiar contraseña
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: modalMode === "password" ? "Cambiar Contraseña" : editingUser ? "Editar Usuario" : "Nuevo Usuario",
        subtitle: modalMode === "password" ? undefined : "Define datos básicos y roles",
        size: modalMode === "password" ? "sm" : "lg",
        actions:
          modalMode === "password"
            ? [
                {
                  label: "Actualizar",
                  onClick: () => {
                    const form = document.querySelector<HTMLFormElement>("#password-form");
                    form?.requestSubmit();
                  },
                  variant: "primary",
                },
                {
                  label: "Cancelar",
                  onClick: closeModal,
                  variant: "ghost",
                },
              ]
            : [
                {
                  label: editingUser ? "Actualizar" : "Crear",
                  onClick: () => {
                    const form = document.querySelector<HTMLFormElement>("#user-form");
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
        content:
          modalMode === "password" ? (
            <form id="password-form" onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-accent-7 mb-2">Nueva Contraseña *</label>
                  <div className="relative">
                    <input type={showNewPassword ? "text" : "password"} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-base pr-10" placeholder="••••••••" minLength={6} />
                    <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} className="h-4 w-4 text-accent-4 hover:text-accent-6" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form id="user-form" onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-accent-7 mb-2">Email *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="input-base" placeholder="usuario@ejemplo.com" />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-2">Contraseña *</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={formData.password} onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))} className="input-base pr-10" placeholder="••••••••" minLength={6} />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4 text-accent-4 hover:text-accent-6" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-2">Nombre</label>
                    <input type="text" value={formData.firstName} onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))} className="input-base" placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-2">Apellido</label>
                    <input type="text" value={formData.lastName} onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))} className="input-base" placeholder="Apellido" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* AREA (antes de cargo) */}
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

                {/*                 <div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))} className="rounded border-gray-300 text-accent-9 focus:ring-accent-5" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuario activo</span>
                  </label>
                </div> */}

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
          ),
      }}
    >
      {/* Grid de usuarios */}
      <div className="relative">
        {/* Indicador sutil de búsqueda en curso (no bloquea) */}
        {isFetching && <div className="absolute -top-6 right-0 text-xs text-gray-500 dark:text-gray-400">Buscando…</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
          {users.map((user) => (
            <Card
              key={user._id}
              onClick={() => openView(user)}
              className="hover:scale-105 hover:shadow-lg transition-all duration-200"
              header={{
                title: user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.email.split("@")[0],
                subtitle: user.email,
                icon: faUser,
                /*                 badges: [
                  {
                    text: user.isActive ? "Activo" : "Inactivo",
                    variant: user.isActive ? "success" : "blue",
                  },
                ], */
              }}
              footer={
                canManage
                  ? {
                      leftContent: <span className="text-xs text-neutral-500 dark:text-neutral-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Nunca"}</span>,
                      actions: [
                        {
                          icon: faEdit,
                          onClick: (e) => {
                            e.stopPropagation();
                            openEdit(user);
                          },
                          title: "Editar",
                          variant: "default",
                        },
                        {
                          icon: faKey,
                          onClick: (e) => {
                            e.stopPropagation();
                            openPassword(user._id);
                          },
                          title: "Cambiar contraseña",
                          variant: "default",
                        },
                        {
                          icon: faTrash,
                          onClick: (e) => {
                            e.stopPropagation();
                            handleDelete(user);
                          },
                          title: "Eliminar",
                          variant: "default",
                        },
                      ],
                    }
                  : undefined
              }
              >
              <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2">
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    <FontAwesomeIcon icon={faUserShield} className="h-3 w-3" />
                    <span>Rol/es</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                      {user.roles.filter((r) => r.name !== "superadmin").length > 0 ? (
                        user.roles
                          .filter((r) => r.name !== "superadmin")
                          .map((role) => (
                              <Badge key={role._id}>
                                  {role.name}
                              </Badge>
                          ))
                      ) : (
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Sin roles</span>
                      )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
                    <span>Área</span>
                  </div>
                  {typeof user.areaId === "object" && user.areaId?.name ? (
                      <Badge>
                           {user.areaId.name}
                      </Badge>
                  ) : (
                    <span className="text-sm text-neutral-400 dark:text-neutral-600 italic">No asignada</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    <FontAwesomeIcon icon={faUserTie} className="h-3 w-3" />
                    <span>Cargo</span>
                  </div>
                  {typeof user.positionId === "object" && user.positionId?.name ? (
                     <Badge>
                          {user.positionId.name}
                     </Badge>
                  ) : (
                    <span className="text-sm text-neutral-400 dark:text-neutral-600 italic">No asignado</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    <FontAwesomeIcon icon={faUserGraduate} className="h-3 w-3" />
                    <span>Nivel</span>
                  </div>
                  {typeof user.levelId === "object" && user.levelId?.name ? (
                      <Badge>
                          {user.levelId.name}
                      </Badge>
                  ) : (
                    <span className="text-sm text-neutral-400 dark:text-neutral-600 italic">No asignado</span>
                  )}
                </div>
              </div>
              {/* Clientes asignados (si los hay) */}
              {user.clientIds && user.clientIds.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Clientes</label>
                  <div className="flex flex-wrap gap-1">
                    {user.clientIds.map((client) => (
                      <span key={client._id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-3 text-accent-9">
                        {client.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
          {canManage && (
            <Card
              variant="create"
              onClick={openCreate}
              header={{
                title: "Nuevo Usuario",
                subtitle: "Crear un nuevo usuario del sistema",
                icon: faUser,
              }}
            />
          )}
        </div>
      </div>

      {/* Empty state */}
      {users.length === 0 && !isFetching && (
        <EmptyState
          icon={faShieldHalved}
          title={startDate || endDate ? "No hay usuarios en este rango de fechas" : "No hay usuarios"}
          description={startDate || endDate ? `No se encontraron usuarios ${startDate && endDate ? `desde ${new Date(startDate).toLocaleDateString()} hasta ${new Date(endDate).toLocaleDateString()}` : startDate ? `desde ${new Date(startDate).toLocaleDateString()}` : `hasta ${new Date(endDate).toLocaleDateString()}`}` : "Crea tu primer usuario para comenzar."}
          action={
            canManage
              ? {
                  label: "Nuevo Usuario",
                  onClick: openCreate,
                  icon: faPlus,
                }
              : undefined
          }
        />
      )}
    </PageLayout>
  );
};
