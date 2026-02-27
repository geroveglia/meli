import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../stores/authStore";
import { clientesAPI, Cliente, ClienteStatus, CreateClienteData, UpdateClienteData } from "../../api/clientes";

import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { sweetAlert } from "../../utils/sweetAlert";
import { emitCuentasChanged } from "../../utils/navbarEvents";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faEdit, faTrash, faPlus, faEnvelope, faPhone } from "@fortawesome/free-solid-svg-icons";
import { ClienteForm, ClienteFormData } from "../../components/clientes/ClienteForm";
import { ClienteDetails } from "../../components/clientes/ClienteDetails";

const initialFormData: ClienteFormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  status: "active",
  createUser: true,
  password: "",
};

const getStatusBadge = (status: ClienteStatus) => {
  const config = {
    active: { text: "Activo" },
    inactive: { text: "Inactivo" },
    lead: { text: "Lead" },
  };
  return config[status] || { text: status };
};

export const ClientesPage: React.FC = () => {
  const { hasPermission } = useAuthStore();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | ClienteStatus>("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCliente, setViewCliente] = useState<Cliente | null>(null);

  const [openInfo, setOpenInfo] = useState(false);

  const canManage = hasPermission("cuentas:view"); // We reuse this permission since tenants use it for creating clients

  const requestIdRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      try {
        setInitialLoading(true);
        await fetchClientes({ silent: true });
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      fetchClientes({ silent: true });
    }, 300);
    return () => clearTimeout(h);
  }, [searchTerm, filterStatus]);

  const fetchClientes = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setIsFetching(true);
      const currentId = ++requestIdRef.current;

      const params: { search?: string; status?: ClienteStatus } = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== "all") params.status = filterStatus;

      const response = await clientesAPI.list(params);

      if (currentId === requestIdRef.current) {
        setClientes((prev) => {
          const pwdMap = new Map(
            prev.filter(c => c._generatedPassword).map(c => [c._id, c._generatedPassword])
          );
          return response.clientes.map(c => 
            pwdMap.has(c._id) ? { ...c, _generatedPassword: pwdMap.get(c._id) } : c
          );
        });
      }
    } catch (error) {
      console.error("Error fetching clientes:", error);
      sweetAlert.error("Error", "No se pudieron cargar los clientes");
    } finally {
      if (!silent) setIsFetching(false);
    }
  };

  const openCreate = () => {
    setEditingCliente(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      name: cliente.name,
      company: cliente.company || "",
      email: cliente.email,
      phone: cliente.phone || "",
      address: cliente.address || "",
      status: cliente.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const openView = (cliente: Cliente) => {
    setViewCliente(cliente);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewCliente(null);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      let newCliente: Cliente | null = null;
      if (editingCliente) {
        const updateData: UpdateClienteData = {
          name: formData.name.trim(),
          company: formData.company.trim() || null,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          status: formData.status,
        };
        await clientesAPI.update(editingCliente._id, updateData);
        sweetAlert.success("Cliente actualizado", "Los cambios se han guardado correctamente");
      } else {
        const createData: CreateClienteData = {
          name: formData.name.trim(),
          company: formData.company.trim() || undefined,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
          status: formData.status,
          createUser: formData.createUser,
          password: formData.password || undefined,
        };
        const response = await clientesAPI.create(createData);
        newCliente = response;
        if (createData.createUser) {
            if (response._generatedPassword && !createData.password) {
                sweetAlert.success("Cliente creado", `Se creó el usuario. Contraseña temporal: ${response._generatedPassword} (También se envió por correo).`);
            } else {
                sweetAlert.success("Cliente y Usuario creados", "El usuario puede ingresar con la contraseña configurada.");
            }
        } else {
            sweetAlert.success("Cliente creado", "El cliente fue guardado correctamente.");
        }
      }
      closeModal();
      
      if (newCliente) {
        setClientes(prev => [newCliente!, ...prev]);
      }
      
      fetchClientes({ silent: true });
      emitCuentasChanged();
      
      if (newCliente && newCliente._generatedPassword) {
        // Automatically open the view modal to show the generated password.
        setTimeout(() => {
          openView(newCliente!);
        }, 500); // small delay to allow modal close animation and state to settle
      }
      
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message = err.response?.data?.message || err.response?.data?.error || "Error al guardar el cliente";

      if (message.includes("email") || message.includes("duplicate") || message.includes("existe")) {
        setFormErrors({ email: "Ya existe un cliente con este email" });
      } else {
        sweetAlert.error("Error", message);
      }
    }
  };

  const handleDelete = async (cliente: Cliente) => {
    const result = await sweetAlert.confirm("¿Eliminar cliente?", `¿Estás seguro de que quieres eliminar a "${cliente.name}"? Se le revocará el acceso.`);
    if (result.isConfirmed) {
      try {
        await clientesAPI.remove(cliente._id);
        sweetAlert.success("Cliente eliminado", "El cliente ha sido eliminado correctamente");
        fetchClientes({ silent: true });
        emitCuentasChanged();
        if (viewCliente?._id === cliente._id) {
          closeView();
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string; error?: string } } };
        const message = err.response?.data?.message || err.response?.data?.error || "Error al eliminar el cliente";
        sweetAlert.error("Error", message);
      }
    }
  };

  if (initialLoading) return <LoadingSpinner message="Cargando clientes..." />;

  return (
    <PageLayout
      title="Clientes"
      subtitle="Gestiona tus clientes y su acceso a la plataforma"
      faIcon={{ icon: faUsers }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Clientes",
        content: (
            <p>Aquí puedes agregar a tus clientes. Al crear un cliente, se generará una cuenta de acceso para ellos automáticamente y podrán ver sus integraciones con MercadoLibre.</p>
        ),
      }}
      actionCount={canManage ? 1 : 0}
      headerActions={
        <div className="flex items-center gap-3">
          {canManage && (
            <button onClick={openCreate} className="p-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm">
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
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
              onChange: (v) => setFilterStatus(v as "all" | ClienteStatus),
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
        title: viewCliente?.name || "Cliente",
        subtitle: viewCliente?.company,
        size: "md",
        actions: [
          ...(canManage ? [{ label: "Editar", onClick: () => { if (viewCliente) openEdit(viewCliente); closeView(); }, variant: "blue" as const }] : []),
          { label: "Cerrar", onClick: closeView, variant: "ghost" as const },
        ],
        content: viewCliente ? <ClienteDetails cliente={viewCliente} /> : null,
      }}
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingCliente ? "Editar Cliente" : "Nuevo Cliente",
        subtitle: "Completa la información del cliente",
        size: "md",
        actions: [
          {
            label: editingCliente ? "Actualizar" : "Crear",
            onClick: () => {
              const form = document.querySelector<HTMLFormElement>("#cliente-form");
              form?.requestSubmit();
            },
            variant: "primary",
          },
          { label: "Cancelar", onClick: closeModal, variant: "ghost" },
        ],
        content: <ClienteForm id="cliente-form" formData={formData} setFormData={setFormData} formErrors={formErrors} onSubmit={handleSubmit} />,
      }}
    >
      <div className="relative">
        {isFetching && <div className="absolute -top-6 right-0 text-xs text-accent-5">Buscando…</div>}

        {clientes.length === 0 ? (
          <EmptyState
            icon={faUsers}
            title="No hay clientes"
            description={searchTerm || filterStatus !== "all" ? "No se encontraron clientes con estos filtros" : "Comienza agregando tu primer cliente"}
            action={
              canManage && !searchTerm && filterStatus === "all"
                ? { label: "Agregar nuevo cliente", onClick: openCreate }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
            {clientes.map((cliente) => (
              <Card
                key={cliente._id}
                onClick={() => openView(cliente)}
                className="hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer"
                header={{
                  title: cliente.name,
                  subtitle: cliente.company || cliente.email,
                  icon: faUsers,
                  badges: [
                    {
                      text: getStatusBadge(cliente.status).text,
                      variant: cliente.status === "active" ? "success" : cliente.status === "lead" ? "warning" : "default",
                    },
                  ],
                }}
                footer={
                  canManage
                    ? {
                        leftContent: (<div className="flex items-center gap-2"></div>),
                        actions: [
                          { icon: faEdit, onClick: (e) => { e.stopPropagation(); openEdit(cliente); }, variant: "default", title: "Editar" },
                          { icon: faTrash, onClick: (e) => { e.stopPropagation(); handleDelete(cliente); }, variant: "default", title: "Eliminar" },
                        ],
                      }
                    : undefined
                }
              >
                <div className="text-sm text-accent-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                  {cliente.phone && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faPhone} className="h-3 w-3" />
                      <span className="truncate">{cliente.phone}</span>
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
