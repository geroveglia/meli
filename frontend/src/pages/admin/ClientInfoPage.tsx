import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faEdit, faTrash, faArrowLeft, faEnvelope, faPhone, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { useClientContextStore, useClientActions } from "../../stores/clientContextStore";
import { useAuthStore } from "../../stores/authStore";
import { PageLayout } from "../../components/PageLayout";
import { Card } from "../../components/Card";
import { clientsAPI, Client, ClientStatus, UpdateClientData } from "../../api/clients";
import { sweetAlert } from "../../utils/sweetAlert";

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
      classes: "bg-accent-5 text-white",
    },
    inactive: {
      text: "Inactivo",
      classes: "bg-accent-3 text-accent-7",
    },
    lead: {
      text: "Lead",
      classes: "bg-accent-2 text-accent-7 border border-accent-4",
    },
  };
  return config[status] || config["active"];
};

export const ClientInfoPage = () => {
  const selectedClient = useClientContextStore((state) => state.selectedClient);
  const { setClient } = useClientActions();
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();

  const canManage = hasPermission("clients:view"); // Using same permission as ClientsPage for consistency

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Modal State
  const [viewOpen, setViewOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  // Help Modal State
  const [openInfo, setOpenInfo] = useState(false);

  /* ---------- Handlers ---------- */

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
        const updatedClient = await clientsAPI.update(editingClient._id, updateData);
        setClient(updatedClient); // Update global store

        // Update local view client if open
        if (viewClient && viewClient._id === updatedClient._id) {
          setViewClient(updatedClient);
        }

        sweetAlert.success("Cliente actualizado", "Los cambios se han guardado correctamente");
      }
      closeModal();
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
        // Redirect to clients list after deletion since the context is gone
        window.location.href = "#/clients";
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string; error?: string } } };
        const message = err.response?.data?.message || err.response?.data?.error || "Error al eliminar el cliente";
        sweetAlert.error("Error", message);
      }
    }
  };

  if (!selectedClient) {
    return (
      <PageLayout title="Información del Cliente" faIcon={{ icon: faBuilding }}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-accent-2 flex items-center justify-center mb-6 border border-accent-4">
            <FontAwesomeIcon icon={faBuilding} className="h-10 w-10 text-accent-7" />
          </div>
          <h2 className="text-xl font-semibold text-accent-1 mb-2">No hay cliente seleccionado</h2>
          <p className="text-accent-7 mb-6 max-w-md">Selecciona un cliente desde el menú superior para ver su información detallada.</p>
          <Link to="/clients" className="inline-flex items-center gap-2 px-4 py-2 bg-accent-9 hover:bg-accent-8 text-accent-1 rounded-lg transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            Ir a Clientes
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={selectedClient.name || "Cliente"}
      subtitle={selectedClient.company || undefined}
      faIcon={{ icon: faBuilding }}
      onBack={() => navigate(-1)}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Información del Cliente",
        content: (
            <p>Visualiza y gestiona la información detallada del cliente seleccionado. Puedes editar sus datos de contacto y estado.</p>
        ),
      }}
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
      <div className="grid  grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
        <Card
          onClick={() => openView(selectedClient)}
          className="hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer"
          header={{
            title: selectedClient.name,
            subtitle: selectedClient.company || selectedClient.email,
            icon: faBuilding,
            badges: [
              {
                text: getStatusBadge(selectedClient.status).text,
                variant: selectedClient.status === "active" ? "success" : selectedClient.status === "lead" ? "warning" : "default",
              },
            ],
          }}
          footer={
            canManage
              ? {
                  leftContent: <div className="flex items-center gap-2"></div>,
                  actions: [
                    {
                      icon: faEdit,
                      onClick: (e) => {
                        e.stopPropagation();
                        openEdit(selectedClient);
                      },
                      variant: "default",
                      title: "Editar",
                    },
                    {
                      icon: faTrash,
                      onClick: (e) => {
                        e.stopPropagation();
                        handleDelete(selectedClient);
                      },
                      variant: "default",
                      title: "Eliminar",
                    },
                  ],
                }
              : undefined
          }
        >
          <div className="text-sm text-accent-7 space-y-1">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3" />
              <span className="truncate">{selectedClient.email}</span>
            </div>
            {selectedClient.address && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="h-3 w-3" />
                <span className="truncate">{selectedClient.address}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};
