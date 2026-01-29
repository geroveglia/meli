import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../stores/authStore";
import { clientsAPI, Client, ClientStatus, CreateClientData, UpdateClientData } from "../../api/clients";

import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { sweetAlert } from "../../utils/sweetAlert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faEdit, faTrash, faPlus, faEnvelope, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { ClientForm, ClientFormData } from "../../components/clients/ClientForm";
import { ClientDetails } from "../../components/clients/ClientDetails";

/* ---------- Types ---------- */



const initialFormData: ClientFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  status: "active",
};

/* ---------- Status Badge Helper ---------- */

const getStatusBadge = (status: ClientStatus) => {
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

export const ClientsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | ClientStatus>("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  const [openInfo, setOpenInfo] = useState(false);

  const canManage = hasPermission("clients:view");

  // For debouncing
  const requestIdRef = useRef(0);

  /* ---------- Effects ---------- */

  useEffect(() => {
    const init = async () => {
      try {
        setInitialLoading(true);
        await fetchClients({ silent: true });
      } finally {
        setInitialLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      fetchClients({ silent: true });
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus]);

  /* ---------- Fetch ---------- */

  const fetchClients = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setIsFetching(true);
      const currentId = ++requestIdRef.current;

      const params: { search?: string; status?: ClientStatus } = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== "all") params.status = filterStatus;

      const response = await clientsAPI.list(params);

      if (currentId === requestIdRef.current) {
        setClients(response.clients);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      sweetAlert.error("Error", "No se pudieron cargar los clientes");
    } finally {
      if (!silent) setIsFetching(false);
    }
  };

  /* ---------- Modal Handlers ---------- */

  const openCreate = () => {
    setEditingClient(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company || "",
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
      status: client.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const openView = (client: Client) => {
    setViewClient(client);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewClient(null);
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
      if (editingClient) {
        const updateData: UpdateClientData = {
          name: formData.name.trim(),
          company: formData.company.trim() || null,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          status: formData.status,
        };
        await clientsAPI.update(editingClient._id, updateData);
        sweetAlert.success("Cliente actualizado", "Los cambios se han guardado correctamente");
      } else {
        const createData: CreateClientData = {
          name: formData.name.trim(),
          company: formData.company.trim() || undefined,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
          status: formData.status,
        };
        await clientsAPI.create(createData);
        sweetAlert.success("Cliente creado", "El cliente se ha creado correctamente");
      }
      closeModal();
      fetchClients({ silent: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message = err.response?.data?.message || err.response?.data?.error || "Error al guardar el cliente";

      if (message.includes("email") || message.includes("duplicate")) {
        setFormErrors({ email: "Ya existe un cliente con este email" });
      } else {
        sweetAlert.error("Error", message);
      }
    }
  };

  /* ---------- Delete ---------- */

  const handleDelete = async (client: Client) => {
    const result = await sweetAlert.confirm("¿Eliminar cliente?", `¿Estás seguro de que quieres eliminar a "${client.name}"?`);
    if (result.isConfirmed) {
      try {
        await clientsAPI.remove(client._id);
        sweetAlert.success("Cliente eliminado", "El cliente ha sido eliminado correctamente");
        fetchClients({ silent: true });
        if (viewClient?._id === client._id) {
          closeView();
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string; error?: string } } };
        const message = err.response?.data?.message || err.response?.data?.error || "Error al eliminar el cliente";
        sweetAlert.error("Error", message);
      }
    }
  };

  /* ---------- Toggle Favorite ---------- */

  /* ---------- Render ---------- */

  if (initialLoading) return <LoadingSpinner message="Cargando clientes..." />;

  return (
    <PageLayout
      title="Clientes"
      subtitle="Gestiona tus clientes y contactos"
      faIcon={{ icon: faBuilding }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Clientes",
        content: (
            <p>Gestione la cartera de clientes. Puede agregar nuevos clientes, actualizar su información de contacto y asociarlos a proyectos.</p>
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
              onChange: (v) => setFilterStatus(v as "all" | ClientStatus),
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
        title: viewClient?.name || "Cliente",
        subtitle: viewClient?.company,
        size: "md",
        actions: [
          ...(canManage
            ? [
                {
                  label: "Editar",
                  onClick: () => {
                    if (viewClient) openEdit(viewClient);
                    closeView();
                  },
                  variant: "secondary" as const,
                },
              ]
            : []),
          {
            label: "Cerrar",
            onClick: closeView,
            variant: "ghost" as const,
          },
        ],
        content: viewClient ? <ClientDetails client={viewClient} /> : null,
      }}
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingClient ? "Editar Cliente" : "Nuevo Cliente",
        subtitle: "Completa la información del cliente",
        size: "md",
        actions: [
          {
            label: editingClient ? "Actualizar" : "Crear",
            onClick: () => {
              const form = document.querySelector<HTMLFormElement>("#client-form");
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
        content: <ClientForm id="client-form" formData={formData} setFormData={setFormData} formErrors={formErrors} onSubmit={handleSubmit} />,
      }}
    >
      {/* Grid de clients */}
      <div className="relative">
        {isFetching && <div className="absolute -top-6 right-0 text-xs text-accent-5">Buscando…</div>}

        {clients.length === 0 ? (
          <EmptyState
            icon={faBuilding}
            title="No hay clientes"
            description={searchTerm || filterStatus !== "all" ? "No se encontraron clientes con estos filtros" : "Comienza agregando tu primer cliente"}
            action={
              canManage && !searchTerm && filterStatus === "all"
                ? {
                    label: "Agregar nuevo cliente",
                    onClick: openCreate,
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
            {clients.map((client) => (
              <Card
                key={client._id}
                onClick={() => openView(client)}
                className="hover:scale-105 hover:shadow-lg transition-all duration-200"
                header={{
                  title: client.name,
                  subtitle: client.company || client.email,
                  icon: faBuilding,
                  badges: [
                    {
                      text: getStatusBadge(client.status).text,
                      variant: client.status === "active" ? "success" : client.status === "lead" ? "warning" : "default",
                    },
                  ],
                }}
                footer={
                  canManage
                    ? {
                        leftContent: (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">{/* Removed favorite button */}</div>
                          </div>
                        ),
                        actions: [
                          {
                            icon: faEdit,
                            onClick: (e) => {
                              e.stopPropagation();
                              openEdit(client);
                            },
                            variant: "default",
                            title: "Editar",
                          },
                          {
                            icon: faTrash,
                            onClick: (e) => {
                              e.stopPropagation();
                              handleDelete(client);
                            },
                            variant: "default",
                            title: "Eliminar",
                          },
                        ],
                      }
                    : undefined
                }
              >
                <div className="text-sm text-accent-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.address && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="h-3 w-3" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};
