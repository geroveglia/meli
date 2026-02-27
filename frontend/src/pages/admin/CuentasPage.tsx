import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { cuentasAPI, Cuenta, CuentaStatus, CreateCuentaData, UpdateCuentaData } from "../../api/cuentas";

import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { sweetAlert } from "../../utils/sweetAlert";
import { emitCuentasChanged } from "../../utils/navbarEvents";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faEdit, faTrash, faPlus, faEnvelope, faMapMarkerAlt, faPlug } from "@fortawesome/free-solid-svg-icons";
import { CuentaForm, CuentaFormData } from "../../components/cuentas/CuentaForm";
import { CuentaDetails } from "../../components/cuentas/CuentaDetails";
import { useMeliConnection } from "../../hooks/useMeliConnection";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

/* ---------- Types ---------- */



const initialFormData: CuentaFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  status: "active",
};

/* ---------- Status Badge Helper ---------- */

const getStatusBadge = (status: CuentaStatus) => {
  const config = {
    active: {
      text: "Activo",
    },
    inactive: {
      text: "Inactivo",
    },
    lead: {
      text: "Lead",
    },
  };
  return config[status];
};

/* ---------- Component ---------- */

export const CuentasPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  
  const { connect: handleConnectMeli, disconnect: handleDisconnectMeli } = useMeliConnection(() => {
    fetchCuentas({ silent: true });
    emitCuentasChanged();
  });

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    const errorMessage = params.get("error_message");
    
    if (status === "success") {
      toast.success("¡Conexión con MercadoLibre exitosa!");
      fetchCuentas();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === "error") {
      toast.error(errorMessage || "Error al conectar con MercadoLibre.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  // Data
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | CuentaStatus>("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null);
  const [formData, setFormData] = useState<CuentaFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCuenta, setViewCuenta] = useState<Cuenta | null>(null);

  const [openInfo, setOpenInfo] = useState(false);

  const canManage = hasPermission("cuentas:view");

  // For debouncing
  const requestIdRef = useRef(0);

  /* ---------- Effects ---------- */

  useEffect(() => {
    const init = async () => {
      try {
        setInitialLoading(true);
        await fetchCuentas({ silent: true });
      } finally {
        setInitialLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      fetchCuentas({ silent: true });
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus]);

  /* ---------- Fetch ---------- */

  const fetchCuentas = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setIsFetching(true);
      const currentId = ++requestIdRef.current;

      const params: { search?: string; status?: CuentaStatus } = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== "all") params.status = filterStatus;

      const response = await cuentasAPI.list(params);

      if (currentId === requestIdRef.current) {
        setCuentas(response.cuentas);
      }
    } catch (error) {
      console.error("Error fetching cuentas:", error);
      sweetAlert.error("Error", "No se pudieron cargar las cuentas");
    } finally {
      if (!silent) setIsFetching(false);
    }
  };

  /* ---------- Modal Handlers ---------- */

  const openCreate = () => {
    setEditingCuenta(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (cuenta: Cuenta) => {
    setEditingCuenta(cuenta);
    setFormData({
      name: cuenta.name,
      company: cuenta.company || "",
      email: cuenta.email,
      phone: cuenta.phone || "",
      address: cuenta.address || "",
      status: cuenta.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCuenta(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const openView = (cuenta: Cuenta) => {
    setViewCuenta(cuenta);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewCuenta(null);
  };

  /* ---------- Form Validation ---------- */

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "El nombre debe tener al menos 2 caracteres";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      errors.email = "Ingresa un email válido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ---------- Submit ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingCuenta) {
        const updateData: UpdateCuentaData = {
          name: formData.name.trim(),
          company: formData.company.trim() || null,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          status: formData.status,
        };
        await cuentasAPI.update(editingCuenta._id, updateData);
        sweetAlert.success("Cuenta actualizada", "Los cambios se han guardado correctamente");
      } else {
        const createData: CreateCuentaData = {
          name: formData.name.trim(),
          company: formData.company.trim() || undefined,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
          status: formData.status,
        };
        await cuentasAPI.create(createData);
        sweetAlert.success("Cuenta creada", "La cuenta se ha creado correctamente");
      }
      closeModal();
      fetchCuentas({ silent: true });
      emitCuentasChanged();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message = err.response?.data?.message || err.response?.data?.error || "Error al guardar la cuenta";

      if (message.includes("email") || message.includes("duplicate")) {
        setFormErrors({ email: "Ya existe una cuenta con este email" });
      } else {
        sweetAlert.error("Error", message);
      }
    }
  };

  /* ---------- Delete ---------- */

  const handleDelete = async (cuenta: Cuenta) => {
    const result = await sweetAlert.confirm("¿Eliminar cuenta?", `¿Estás seguro de que quieres eliminar a "${cuenta.name}"?`);
    if (result.isConfirmed) {
      try {
        await cuentasAPI.remove(cuenta._id);
        sweetAlert.success("Cuenta eliminada", "La cuenta ha sido eliminada correctamente");
        fetchCuentas({ silent: true });
        emitCuentasChanged();
        if (viewCuenta?._id === cuenta._id) {
          closeView();
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string; error?: string } } };
        const message = err.response?.data?.message || err.response?.data?.error || "Error al eliminar la cuenta";
        sweetAlert.error("Error", message);
      }
    }
  };

  /* ---------- Toggle Favorite ---------- */

  /* ---------- Render ---------- */

  if (initialLoading) return <LoadingSpinner message="Cargando cuentas..." />;

  return (
    <PageLayout
      title="Cuentas"
      subtitle="Gestiona tus cuentas y contactos"
      faIcon={{ icon: faBuilding }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Cuentas",
        content: (
            <p>Gestione la cartera de cuentas. Puede agregar nuevas cuentas, actualizar su información de contacto y asociarlas a proyectos.</p>
        ),
      }}
      actionCount={canManage ? 1 : 0}
      headerActions={
        <div className="flex items-center gap-3">
          {canManage && (
            <button onClick={openCreate} className="p-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm">
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3 lg:h-4 lg:w-4" />
            </button>
          )}
        </div>
      }
      searchAndFilters={
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nombre, empresa o email..."
          filters={[
            {
              value: filterStatus,
              onChange: (v) => setFilterStatus(v as "all" | CuentaStatus),
              options: [
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
                { value: "lead", label: "Leads" },
              ],
            },
          ]}
        />
      }
      viewModal={{
        isOpen: viewOpen,
        onClose: closeView,
        title: viewCuenta?.name || "Cuenta",
        subtitle: viewCuenta?.company,
        size: "md",
        actions: [
          ...(canManage
            ? [
                {
                  label: "Editar",
                  onClick: () => {
                    if (viewCuenta) openEdit(viewCuenta);
                    closeView();
                  },
                  variant: "blue" as const,
                },
              ]
            : []),
          {
            label: "Cerrar",
            onClick: closeView,
            variant: "ghost" as const,
          },
        ],
        content: viewCuenta ? <CuentaDetails cuenta={viewCuenta} onConnect={handleConnectMeli} onDisconnect={handleDisconnectMeli} /> : null,
      }}
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingCuenta ? "Editar Cuenta" : "Nueva Cuenta",
        subtitle: "Completa la información de la cuenta",
        size: "md",
        actions: [
          {
            label: editingCuenta ? "Actualizar" : "Crear",
            onClick: () => {
              const form = document.querySelector<HTMLFormElement>("#cuenta-form");
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
        content: <CuentaForm id="cuenta-form" formData={formData} setFormData={setFormData} formErrors={formErrors} onSubmit={handleSubmit} />,
      }}
    >
      {/* Grid de cuentas */}
      <div className="relative">
        {isFetching && <div className="absolute -top-6 right-0 text-xs text-accent-5">Buscando…</div>}

        {cuentas.length === 0 ? (
          <EmptyState
            icon={faBuilding}
            title="No hay cuentas"
            description={searchTerm || filterStatus !== "all" ? "No se encontraron cuentas con estos filtros" : "Comienza agregando tu primera cuenta"}
            action={
              canManage && !searchTerm && filterStatus === "all"
                ? {
                    label: "Agregar nueva cuenta",
                    onClick: openCreate,
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
            {cuentas.map((cuenta) => (
              <Card
                key={cuenta._id}
                onClick={() => openView(cuenta)}
                className="hover:scale-105 hover:shadow-lg transition-all duration-200"
                header={{
                  title: cuenta.name,
                  subtitle: cuenta.company || cuenta.email,
                  icon: faBuilding,
                  badges: [
                    {
                      text: getStatusBadge(cuenta.status).text,
                      variant: cuenta.status === "active" ? "success" : cuenta.status === "lead" ? "warning" : "default",
                    },
                  ],
                }}
                footer={
                  canManage
                    ? {
                        leftContent: (
                          <div className="flex items-center gap-2">
                             {/* Footer left content */}
                          </div>
                        ),
                        actions: [
                          {
                            icon: faEdit,
                            onClick: (e) => {
                              e.stopPropagation();
                              openEdit(cuenta);
                            },
                            variant: "default",
                            title: "Editar",
                          },
                          {
                            icon: faTrash,
                            onClick: (e) => {
                              e.stopPropagation();
                              handleDelete(cuenta);
                            },
                            variant: "default",
                            title: "Eliminar",
                          },
                        ],
                      }
                    : undefined
                }
              >
                <div className="text-sm text-accent-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3" />
                    <span className="truncate">{cuenta.email}</span>
                  </div>
                  {cuenta.address && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="h-3 w-3" />
                      <span className="truncate">{cuenta.address}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {cuenta.mercadolibre?.isConnected ? (
                        <div className="flex items-center justify-between text-green-600 bg-green-50 p-2 rounded-md">
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faPlug} className="h-3 w-3" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold">Conectado</span>
                                    <span className="text-xs truncate max-w-[120px]" title={cuenta.mercadolibre.nickname}>{cuenta.mercadolibre.nickname}</span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisconnectMeli(cuenta);
                                }} 
                                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                                title="Desconectar cuenta"
                            >
                                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleConnectMeli(cuenta);
                            }}
                            className="w-full py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-white text-xs font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faPlug} />
                            Conectar MercadoLibre
                        </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};
