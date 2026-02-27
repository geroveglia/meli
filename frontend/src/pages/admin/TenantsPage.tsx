import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../stores/authStore";
import { tenantsAPI, Tenant, SubscriptionPlan, SubscriptionStatus, CreateTenantData, UpdateTenantData } from "../../api/tenants";

import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { sweetAlert } from "../../utils/sweetAlert";
import Swal from "sweetalert2";
import { Switch } from "../../components/Switch";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faEdit,
  faTrash,
  faPlus,
  faEnvelope,
  faPhone,
  faGlobe,
  faUsers,
  faCrown,
  faShield,
} from "@fortawesome/free-solid-svg-icons";

/* ---------- Types ---------- */

interface TenantFormData {
  name: string;
  slug: string;
  domain: string;
  company: {
    legalName: string;
    taxId: string;
    industry: string;
    website: string;
    description: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
  };
}

const initialFormData: TenantFormData = {
  name: "",
  slug: "",
  domain: "",
  company: {
    legalName: "",
    taxId: "",
    industry: "",
    website: "",
    description: "",
  },
  contact: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
  },
  subscription: {
    plan: "free",
    status: "active",
  },
};

/* ---------- Helpers ---------- */

const getPlanBadge = (plan: SubscriptionPlan) => {
  const config = {
    free: { text: "Free", classes: "bg-accent-3 text-accent-8" },
    basic: { text: "Basic", classes: "bg-accent-3 text-accent-9 border border-accent-4" },
    pro: { text: "Pro", classes: "bg-accent-5 text-white" },
    enterprise: { text: "Enterprise", classes: "bg-accent-5 text-white border border-neutral-400" },
  };
  return config[plan] || config.free;
};

const getStatusBadge = (status: SubscriptionStatus) => {
  const config = {
    active: { text: "Activo", classes: "bg-accent-5 text-white" },
    suspended: { text: "Suspendido", classes: "bg-accent-4 text-accent-8" },
    cancelled: { text: "Cancelado", classes: "bg-accent-3 text-accent-6" },
  };
  return config[status] || config.active;
};

/* ---------- Component ---------- */

export const TenantsPage: React.FC = () => {
  const { user } = useAuthStore();

  // Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | SubscriptionPlan>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | SubscriptionStatus>("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<TenantFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

  const [openInfo, setOpenInfo] = useState(false);

  // Verificar acceso de superadmin
  const isSuperAdmin = user?.primaryRole?.toLowerCase() === "superadmin";
  const canManage = isSuperAdmin;

  // For debouncing
  const requestIdRef = useRef(0);

  /* ---------- Effects ---------- */

  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const init = async () => {
      try {
        setInitialLoading(true);
        await fetchTenants({ silent: true });
      } finally {
        setInitialLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const h = setTimeout(() => {
      fetchTenants({ silent: true });
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterPlan, filterStatus]);

  /* ---------- Fetch ---------- */

  const fetchTenants = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setIsFetching(true);
      const currentId = ++requestIdRef.current;

      const params: { search?: string; plan?: SubscriptionPlan; status?: SubscriptionStatus } = {};
      if (searchTerm) params.search = searchTerm;
      if (filterPlan !== "all") params.plan = filterPlan;
      if (filterStatus !== "all") params.status = filterStatus;

      const response = await tenantsAPI.list(params);

      if (currentId === requestIdRef.current) {
        setTenants(response.tenants);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
      sweetAlert.error("Error", "No se pudieron cargar los tenants");
    } finally {
      if (!silent) setIsFetching(false);
    }
  };

  /* ---------- Modal Handlers ---------- */

  const openCreate = () => {
    setEditingTenant(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (tenant: Tenant) => {
    if (tenant.isSystem) {
      sweetAlert.error("Error", "No se puede editar un tenant del sistema");
      return;
    }
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || "",
      company: {
        legalName: tenant.company.legalName || "",
        taxId: tenant.company.taxId || "",
        industry: tenant.company.industry || "",
        website: tenant.company.website || "",
        description: tenant.company.description || "",
      },
      contact: {
        firstName: tenant.contact.firstName || "",
        lastName: tenant.contact.lastName || "",
        email: tenant.contact.email || "",
        phone: tenant.contact.phone || "",
        position: tenant.contact.position || "",
      },
      subscription: {
        plan: tenant.subscription.plan,
        status: tenant.subscription.status,
      },
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTenant(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const openView = (tenant: Tenant) => {
    setViewTenant(tenant);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewTenant(null);
  };

  /* ---------- Form Validation ---------- */

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "El nombre debe tener al menos 2 caracteres";
    }

    if (!formData.slug.trim() || formData.slug.trim().length < 2) {
      errors.slug = "El slug debe tener al menos 2 caracteres";
    } else if (!/^[a-z0-9-_]+$/.test(formData.slug)) {
      errors.slug = "El slug solo puede contener letras minúsculas, números, guiones y guiones bajos";
    }

    if (!formData.company.legalName.trim() || formData.company.legalName.trim().length < 2) {
      errors["company.legalName"] = "La razón social debe tener al menos 2 caracteres";
    }

    if (!formData.contact.firstName.trim() || formData.contact.firstName.trim().length < 2) {
      errors["contact.firstName"] = "El nombre debe tener al menos 2 caracteres";
    }

    if (!formData.contact.lastName.trim() || formData.contact.lastName.trim().length < 2) {
      errors["contact.lastName"] = "El apellido debe tener al menos 2 caracteres";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.contact.email.trim() || !emailRegex.test(formData.contact.email)) {
      errors["contact.email"] = "Ingresa un email válido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ---------- Submit ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingTenant) {
        const updateData: UpdateTenantData = {
          name: formData.name.trim(),
          slug: formData.slug.trim().toLowerCase(),
          domain: formData.domain.trim() || undefined,
          company: {
            legalName: formData.company.legalName.trim(),
            taxId: formData.company.taxId.trim() || undefined,
            industry: formData.company.industry.trim() || undefined,
            website: formData.company.website.trim() || undefined,
            description: formData.company.description.trim() || undefined,
          },
          contact: {
            firstName: formData.contact.firstName.trim(),
            lastName: formData.contact.lastName.trim(),
            email: formData.contact.email.trim().toLowerCase(),
            phone: formData.contact.phone.trim() || undefined,
            position: formData.contact.position.trim() || undefined,
          },
          subscription: formData.subscription,
        };
        await tenantsAPI.update(editingTenant._id, updateData);
        sweetAlert.success("Tenant actualizado", "Los cambios se han guardado correctamente");
      } else {
        const createData: CreateTenantData = {
          name: formData.name.trim(),
          slug: formData.slug.trim().toLowerCase(),
          domain: formData.domain.trim() || undefined,
          company: {
            legalName: formData.company.legalName.trim(),
            taxId: formData.company.taxId.trim() || undefined,
            industry: formData.company.industry.trim() || undefined,
            website: formData.company.website.trim() || undefined,
            description: formData.company.description.trim() || undefined,
          },
          contact: {
            firstName: formData.contact.firstName.trim(),
            lastName: formData.contact.lastName.trim(),
            email: formData.contact.email.trim().toLowerCase(),
            phone: formData.contact.phone.trim() || undefined,
            position: formData.contact.position.trim() || undefined,
          },
          subscription: formData.subscription,
        };
        const result = await tenantsAPI.create(createData);
        if (result._generatedPassword) {
          Swal.fire({
            title: "Tenant Creado Exitosamente",
            html: `
              <div style="text-align: left; background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 10px; border: 1px solid #e9ecef;">
                <p style="margin: 0 0 8px;"><strong>Email Admin:</strong> ${createData.contact.email}</p>
                <p style="margin: 0; font-size: 1.1em;"><strong>Contraseña Temporal:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; color: #d63384;">${result._generatedPassword}</code></p>
              </div>
              <p style="margin-top: 16px; font-size: 0.9em; color: #6c757d;">
                Asegúrate de copiar esta contraseña antes de cerrar este mensaje.
              </p>
            `,
            icon: "success",
            confirmButtonText: "Entendido",
            background: "var(--accent-2)",
            color: "var(--accent-1)",
            confirmButtonColor: "#2563eb",
          });
        } else {
          sweetAlert.success("Tenant creado", "El tenant se ha creado correctamente");
        }
      }
      closeModal();
      fetchTenants({ silent: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      const message = err.response?.data?.message || err.response?.data?.error || "Error al guardar el tenant";
      
      if (message.includes("slug")) {
        setFormErrors({ slug: "Ya existe un tenant con este slug" });
      } else if (message.includes("email")) {
        setFormErrors({ "contact.email": "Ya existe un tenant con este email de contacto" });
      } else {
        sweetAlert.error("Error", message);
      }
    }
  };

  /* ---------- Delete ---------- */

  const handleDelete = async (tenant: Tenant) => {
    if (tenant.isSystem) {
      sweetAlert.error("Error", "No se puede eliminar un tenant del sistema");
      return;
    }

    const result = await sweetAlert.confirm(
      "¿Eliminar tenant?",
      `¿Estás seguro de que quieres eliminar "${tenant.name}"? Esta acción no se puede deshacer.`
    );
    if (result.isConfirmed) {
      try {
        await tenantsAPI.remove(tenant._id);
        sweetAlert.success("Tenant eliminado", "El tenant ha sido eliminado correctamente");
        fetchTenants({ silent: true });
        if (viewTenant?._id === tenant._id) {
          closeView();
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string; error?: string } } };
        const message = err.response?.data?.message || err.response?.data?.error || "Error al eliminar el tenant";
        sweetAlert.error("Error", message);
      }
    }
  };

  /* ---------- Toggle Status ---------- */

  const handleToggleStatus = async (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tenant.isSystem) {
      sweetAlert.error("Error", "No se puede modificar el estado de un tenant del sistema");
      return;
    }
    try {
      await tenantsAPI.toggleStatus(tenant._id, !tenant.isActive);
      fetchTenants({ silent: true });
    } catch (error) {
      console.error("Error toggling status:", error);
      sweetAlert.error("Error", "No se pudo cambiar el estado del tenant");
    }
  };

  /* ---------- Render ---------- */

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FontAwesomeIcon icon={faShield} className="h-16 w-16 text-accent-5 mb-4" />
          <h2 className="text-2xl font-bold text-accent-9 mb-2">Acceso Denegado</h2>
          <p className="text-accent-6">Solo los superadministradores pueden acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (initialLoading) return <LoadingSpinner message="Cargando tenants..." />;

  return (
    <PageLayout
      title="Tenants"
      subtitle="Gestiona las organizaciones de la plataforma"
      faIcon={{ icon: faBuilding }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Tenants",
        content: (
            <p>Administre los inquilinos (Tenants) del sistema. Cada tenant representa una organización independiente con sus propios datos y configuraciones.</p>
        ),
      }}
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
          searchPlaceholder="Buscar por nombre, slug o email..."
          filters={[
            {
              value: filterPlan,
              onChange: (v) => setFilterPlan(v as "all" | SubscriptionPlan),
              options: [
                { value: "all", label: "Todos los planes" },
                { value: "free", label: "Free" },
                { value: "basic", label: "Basic" },
                { value: "pro", label: "Pro" },
                { value: "enterprise", label: "Enterprise" },
              ],
            },
            {
              value: filterStatus,
              onChange: (v) => setFilterStatus(v as "all" | SubscriptionStatus),
              options: [
                { value: "all", label: "Todos los estados" },
                { value: "active", label: "Activos" },
                { value: "suspended", label: "Suspendidos" },
                { value: "cancelled", label: "Cancelados" },
              ],
            },
          ]}
        />
      }
      viewModal={{
        isOpen: viewOpen,
        onClose: closeView,
        title: viewTenant?.name || "Tenant",
        subtitle: viewTenant?.slug,
        size: "lg",
        actions: [
          ...(!viewTenant?.isSystem
            ? [
                {
                  label: "Editar",
                  onClick: () => {
                    if (viewTenant) openEdit(viewTenant);
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
        content: viewTenant ? (
          <div className="space-y-6">
            {/* Status & Plan Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusBadge(viewTenant.subscription.status).classes}`}>
                {getStatusBadge(viewTenant.subscription.status).text}
              </span>
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPlanBadge(viewTenant.subscription.plan).classes}`}>
                <FontAwesomeIcon icon={faCrown} className="h-3 w-3 mr-1" />
                {getPlanBadge(viewTenant.subscription.plan).text}
              </span>
              {viewTenant.isSystem && (
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-accent-5 text-white">
                  <FontAwesomeIcon icon={faShield} className="h-3 w-3 mr-1" />
                  Sistema
                </span>
              )}
              {!viewTenant.isActive && (
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-accent-3 text-accent-7">
                  Inactivo
                </span>
              )}
            </div>

            {/* Empresa */}
            <div>
              <h4 className="text-sm font-semibold text-accent-9 mb-2">Empresa</h4>
              <div className="bg-accent-2 rounded-lg p-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-accent-6">Razón Social:</span>
                  <span className="ml-2 text-accent-9">{viewTenant.company.legalName}</span>
                </div>
                {viewTenant.company.taxId && (
                  <div className="text-sm">
                    <span className="font-medium text-accent-6">CUIT/Tax ID:</span>
                    <span className="ml-2 text-accent-9">{viewTenant.company.taxId}</span>
                  </div>
                )}
                {viewTenant.company.industry && (
                  <div className="text-sm">
                    <span className="font-medium text-accent-6">Industria:</span>
                    <span className="ml-2 text-accent-9">{viewTenant.company.industry}</span>
                  </div>
                )}
                {viewTenant.company.website && (
                  <div className="text-sm flex items-center gap-2">
                    <FontAwesomeIcon icon={faGlobe} className="h-3 w-3 text-accent-4" />
                    <a href={viewTenant.company.website} target="_blank" rel="noopener noreferrer" className="text-black dark:text-white hover:underline">
                      {viewTenant.company.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Contacto */}
            <div>
              <h4 className="text-sm font-semibold text-accent-9 mb-2">Contacto Principal</h4>
              <div className="bg-accent-2 rounded-lg p-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-accent-9">
                    {viewTenant.contact.firstName} {viewTenant.contact.lastName}
                  </span>
                  {viewTenant.contact.position && (
                    <span className="ml-2 text-accent-5">({viewTenant.contact.position})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-accent-7">
                  <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3 text-accent-4" />
                  <a href={`mailto:${viewTenant.contact.email}`} className="hover:text-black dark:hover:text-white">
                    {viewTenant.contact.email}
                  </a>
                </div>
                {viewTenant.contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-accent-7">
                    <FontAwesomeIcon icon={faPhone} className="h-3 w-3 text-accent-4" />
                    <a href={`tel:${viewTenant.contact.phone}`} className="hover:text-black dark:hover:text-white">
                      {viewTenant.contact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Uso */}
            <div>
              <h4 className="text-sm font-semibold text-accent-9 mb-2">Uso</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-accent-2 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-black dark:text-white">
                    {viewTenant.userCount ?? viewTenant.usage?.users?.current ?? 0}
                  </div>
                  <div className="text-xs text-accent-5">Usuarios</div>
                </div>
                <div className="bg-accent-2 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-black dark:text-white">
                    {viewTenant.usage?.clients?.current ?? 0}
                  </div>
                  <div className="text-xs text-accent-5">Clientes</div>
                </div>
                <div className="bg-accent-2 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-black dark:text-white">
                    {viewTenant.usage?.campaigns?.current ?? 0}
                  </div>
                  <div className="text-xs text-accent-5">Campañas</div>
                </div>
                <div className="bg-accent-2 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-black dark:text-white">
                    {viewTenant.usage?.storage?.usedMB ?? 0} MB
                  </div>
                  <div className="text-xs text-accent-5">Almacenamiento</div>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-accent-3">
              <div className="grid grid-cols-2 gap-4 text-xs text-accent-5">
                <div>
                  <span className="font-medium">Creado:</span>
                  <br />
                  {new Date(viewTenant.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Actualizado:</span>
                  <br />
                  {new Date(viewTenant.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ) : null,
      }}
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingTenant ? "Editar Tenant" : "Nuevo Tenant",
        subtitle: "Completa la información del tenant",
        size: "lg",
        actions: [
          {
            label: editingTenant ? "Actualizar" : "Crear",
            onClick: () => {
              const form = document.querySelector<HTMLFormElement>("#tenant-form");
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
          <form id="tenant-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Información Básica */}
              <div>
                <h4 className="text-sm font-semibold text-accent-9 mb-3">Información Básica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const autoSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, "") + (newName ? "_tenant" : "");
                        setFormData((prev) => ({ 
                          ...prev, 
                          name: newName,
                          slug: editingTenant ? prev.slug : autoSlug
                        }));
                      }}
                      className={`input-base ${formErrors.name ? "border-red-500 dark:border-red-500" : ""}`}
                      placeholder="Nombre del tenant"
                    />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      readOnly
                      className={`input-base bg-accent-1 text-accent-6 cursor-not-allowed ${formErrors.slug ? "border-red-500 dark:border-red-500" : ""}`}
                      placeholder="slug-auto-generado_tenant"
                    />
                    {formErrors.slug && <p className="text-red-500 text-xs mt-1">{formErrors.slug}</p>}
                  </div>
                </div>
              </div>

              {/* Empresa */}
              <div>
                <h4 className="text-sm font-semibold text-accent-9 mb-3">Empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company.legalName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, company: { ...prev.company, legalName: e.target.value } }))}
                      className={`input-base ${formErrors["company.legalName"] ? "border-red-500 dark:border-red-500" : ""}`}
                      placeholder="Razón social de la empresa"
                    />
                    {formErrors["company.legalName"] && <p className="text-red-500 text-xs mt-1">{formErrors["company.legalName"]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      CUIT / Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.company.taxId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, company: { ...prev.company, taxId: e.target.value } }))}
                      className="input-base"
                      placeholder="20-12345678-9"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Industria
                    </label>
                    <input
                      type="text"
                      value={formData.company.industry}
                      onChange={(e) => setFormData((prev) => ({ ...prev, company: { ...prev.company, industry: e.target.value } }))}
                      className="input-base"
                      placeholder="Tecnología, Retail, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.company.website}
                      onChange={(e) => setFormData((prev) => ({ ...prev, company: { ...prev.company, website: e.target.value } }))}
                      className="input-base"
                      placeholder="https://ejemplo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <h4 className="text-sm font-semibold text-accent-9 mb-3">Contacto Principal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contact.firstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact: { ...prev.contact, firstName: e.target.value } }))}
                      className={`input-base ${formErrors["contact.firstName"] ? "border-red-500 dark:border-red-500" : ""}`}
                      placeholder="Nombre"
                    />
                    {formErrors["contact.firstName"] && <p className="text-red-500 text-xs mt-1">{formErrors["contact.firstName"]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contact.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact: { ...prev.contact, lastName: e.target.value } }))}
                      className={`input-base ${formErrors["contact.lastName"] ? "border-red-500 dark:border-red-500" : ""}`}
                      placeholder="Apellido"
                    />
                    {formErrors["contact.lastName"] && <p className="text-red-500 text-xs mt-1">{formErrors["contact.lastName"]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent-7 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.contact.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                      className={`input-base ${formErrors["contact.email"] ? "border-red-500 dark:border-red-500" : ""}`}
                      placeholder="email@ejemplo.com"
                    />
                    {formErrors["contact.email"] && <p className="text-red-500 text-xs mt-1">{formErrors["contact.email"]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.contact.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
                      className="input-base"
                      placeholder="+54 11 1234-5678"
                    />
                  </div>

                </div>
              </div>
            </div>
          </form>
        ),
      }}
    >
      {/* Grid de tenants */}
      <div className="relative">
        {isFetching && (
          <div className="absolute -top-6 right-0 text-xs text-gray-500 dark:text-gray-400">
            Buscando…
          </div>
        )}

        {tenants.length === 0 ? (
          <EmptyState
            icon={faBuilding}
            title="No hay tenants"
            description={
              searchTerm || filterPlan !== "all" || filterStatus !== "all"
                ? "No se encontraron tenants con estos filtros"
                : "Comienza agregando tu primer tenant"
            }
            action={
              !searchTerm && filterPlan === "all" && filterStatus === "all"
                ? {
                    label: "Agregar nuevo tenant",
                    onClick: openCreate,
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
            {tenants.map((tenant) => (
              <Card
                key={tenant._id}
                onClick={() => openView(tenant)}
                className="hover:scale-105 hover:shadow-lg transition-all duration-200"
                header={{
                  title: tenant.name,
                  subtitle: tenant.slug,
                  icon: faBuilding,
                  badges: [
                    {
                      text: getPlanBadge(tenant.subscription.plan).text,
                      className: getPlanBadge(tenant.subscription.plan).classes,
                    },
                    ...(tenant.isSystem ? [{ text: "Sistema", variant: "default" as const }] : []),
                    ...(!tenant.isActive ? [{ text: "Inactivo", variant: "default" as const }] : []),
                  ],
                }}
                footer={
                  !tenant.isSystem
                    ? {
                        leftContent: (
                          <div className="flex items-center gap-2">
                              <Switch
                                checked={tenant.isActive}
                                onChange={() => handleToggleStatus(tenant, { stopPropagation: () => {} } as any)}
                                disabled={tenant.isSystem}
                              />
                            <span className="text-xs text-accent-5 dark:text-accent-4 flex items-center gap-1">
                              <FontAwesomeIcon icon={faUsers} className="h-3 w-3" />
                              {tenant.userCount ?? 0}
                            </span>
                          </div>
                        ),
                        actions: [
                          {
                            icon: faEdit,
                            onClick: (e) => {
                              e.stopPropagation();
                              openEdit(tenant);
                            },
                            variant: "default",
                            title: "Editar",
                          },
                          {
                            icon: faTrash,
                            onClick: (e) => {
                              e.stopPropagation();
                              handleDelete(tenant);
                            },
                            variant: "default",
                            title: "Eliminar",
                          },
                        ],
                      }
                    : {
                        leftContent: (
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faShield} className="h-4 w-4 text-accent-4" />
                            <span className="text-xs text-accent-5 font-medium">Protegido</span>
                          </div>
                        ),
                      }
                }
              >
                <div className="text-sm text-accent-7 space-y-1">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3" />
                    <span className="truncate">{tenant.contact.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCrown} className="h-3 w-3" />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(tenant.subscription.status).classes}`}>
                      {getStatusBadge(tenant.subscription.status).text}
                    </span>
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
