import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faEdit, faTrash, faArrowLeft, faEnvelope, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { useCuentaContextStore, useCuentaActions } from "../../stores/cuentaContextStore";
import { useAuthStore } from "../../stores/authStore";
import { PageLayout } from "../../components/PageLayout";
import { Card } from "../../components/Card";
import { cuentasAPI, Cuenta, CuentaStatus, UpdateCuentaData } from "../../api/cuentas";
import { sweetAlert } from "../../utils/sweetAlert";
import { emitCuentasChanged } from "../../utils/navbarEvents";

import { CuentaForm, CuentaFormData } from "../../components/cuentas/CuentaForm";
import { CuentaDetails } from "../../components/cuentas/CuentaDetails";

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

export const CuentaInfoPage = () => {
  const selectedCuenta = useCuentaContextStore((state) => state.selectedCuenta);
  const { setCuenta } = useCuentaActions();
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();

  const canManage = hasPermission("cuentas:view"); // Using same permission as CuentasPage for consistency

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null);
  const [formData, setFormData] = useState<CuentaFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Modal State
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCuenta, setViewCuenta] = useState<Cuenta | null>(null);

  // Help Modal State
  const [openInfo, setOpenInfo] = useState(false);

  /* ---------- Handlers ---------- */

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
        const updatedCuenta = await cuentasAPI.update(editingCuenta._id, updateData);
        setCuenta(updatedCuenta); // Update global store

        // Update local view cuenta if open
        if (viewCuenta && viewCuenta._id === updatedCuenta._id) {
          setViewCuenta(updatedCuenta);
        }

        sweetAlert.success("Cuenta actualizada", "Los cambios se han guardado correctamente");
        emitCuentasChanged();
      }
      closeModal();
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
        emitCuentasChanged();
        // Redirect to cuentas list after deletion since the context is gone
        window.location.href = "#/cuentas";
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string; error?: string } } };
        const message = err.response?.data?.message || err.response?.data?.error || "Error al eliminar la cuenta";
        sweetAlert.error("Error", message);
      }
    }
  };

  if (!selectedCuenta) {
    return (
      <PageLayout title="Información de la Cuenta" faIcon={{ icon: faBuilding }}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-accent-2 flex items-center justify-center mb-6 border border-accent-4">
            <FontAwesomeIcon icon={faBuilding} className="h-10 w-10 text-accent-7" />
          </div>
          <h2 className="text-xl font-semibold text-accent-1 mb-2">No hay cuenta seleccionada</h2>
          <p className="text-accent-7 mb-6 max-w-md">Selecciona una cuenta desde el menú superior para ver su información detallada.</p>
          <Link to="/cuentas" className="inline-flex items-center gap-2 px-4 py-2 bg-accent-9 hover:bg-accent-8 text-accent-1 rounded-lg transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            Ir a Cuentas
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={selectedCuenta.name || "Cuenta"}
      subtitle={selectedCuenta.company || undefined}
      faIcon={{ icon: faBuilding }}
      onBack={() => navigate(-1)}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Información de la Cuenta",
        content: (
            <p>Visualiza y gestiona la información detallada de la cuenta seleccionada. Puedes editar sus datos de contacto y estado.</p>
        ),
      }}
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
        content: viewCuenta ? <CuentaDetails cuenta={viewCuenta} /> : null,
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
      <div className="grid  grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
        <Card
          onClick={() => openView(selectedCuenta)}
          className="hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer"
          header={{
            title: selectedCuenta.name,
            subtitle: selectedCuenta.company || selectedCuenta.email,
            icon: faBuilding,
            badges: [
              {
                text: getStatusBadge(selectedCuenta.status).text,
                variant: selectedCuenta.status === "active" ? "success" : selectedCuenta.status === "lead" ? "warning" : "default",
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
                        openEdit(selectedCuenta);
                      },
                      variant: "default",
                      title: "Editar",
                    },
                    {
                      icon: faTrash,
                      onClick: (e) => {
                        e.stopPropagation();
                        handleDelete(selectedCuenta);
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
              <span className="truncate">{selectedCuenta.email}</span>
            </div>
            {selectedCuenta.address && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="h-3 w-3" />
                <span className="truncate">{selectedCuenta.address}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};
