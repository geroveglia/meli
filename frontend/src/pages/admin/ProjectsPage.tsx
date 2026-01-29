import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useClientContextStore } from "../../stores/clientContextStore";
import { projectsAPI, Project, CreateProjectData, UpdateProjectData } from "../../api/projects";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";

import { sweetAlert } from "../../utils/sweetAlert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faPlus,
  faEdit,
  faTrash,
  faCalendar,
  faCheckCircle,
  faPauseCircle,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { ProjectForm, ProjectFormData } from "../../components/projects/ProjectForm";
import { ProjectDetails } from "../../components/projects/ProjectDetails";

/* ---------- Types ---------- */



const initialFormData: ProjectFormData = {
  name: "",
  description: "",
  status: "active",
  startDate: "",
  endDate: "",
};

/* ---------- Status Helper ---------- */

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return { text: "Activo", classes: "bg-accent-9 text-accent-2", icon: faCheckCircle };
    case "completed":
      return { text: "Completado", classes: "bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300", icon: faCheckCircle };
    case "on_hold":
      return { text: "En Espera", classes: "bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300", icon: faPauseCircle };
    default:
      return { text: status, classes: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400", icon: faClock };
  }
};

/* ---------- Component ---------- */

export const ProjectsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const selectedClient = useClientContextStore((state) => state.selectedClient);
  const navigate = useNavigate();

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered Projects
  const filteredProjects = projects.filter((project) => {
    const matchesStatus = filterStatus === "all" || project.status === filterStatus;
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [openInfo, setOpenInfo] = useState(false);

  const canManage = hasPermission("clients:view"); // Assuming same permission for now

  /* ---------- Effects ---------- */

  useEffect(() => {
    if (selectedClient) {
      fetchProjects();
    } else {
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient]); 

  /* ---------- Fetch ---------- */

  const fetchProjects = async () => {
    if (!selectedClient) return;
    try {
      const params: any = { clientId: selectedClient._id };

      const data = await projectsAPI.list(params);
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      sweetAlert.error("Error", "No se pudieron cargar los proyectos");
    } finally {
      setInitialLoading(false);
    }
  };

  /* ---------- Modal Handlers ---------- */

  const openCreate = () => {
    setEditingProject(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      startDate: project.startDate ? project.startDate.split("T")[0] : "",
      endDate: project.endDate ? project.endDate.split("T")[0] : "",
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openView = (project: Project) => {
    setViewingProject(project);
  };

  const closeView = () => {
    setViewingProject(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  /* ---------- Submit ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    if (!formData.name.trim()) {
      setFormErrors({ name: "El nombre es obligatorio" });
      return;
    }

    try {
      if (editingProject) {
        const updateData: UpdateProjectData = {
          name: formData.name,
          description: formData.description,
          status: formData.status,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        };
        await projectsAPI.update(editingProject._id, updateData);
        sweetAlert.success("Proyecto actualizado", "Cambios guardados correctamente");
      } else {
        const createData: CreateProjectData = {
          clientId: selectedClient._id,
          name: formData.name,
          description: formData.description,
          status: formData.status,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        };
        await projectsAPI.create(createData);
        sweetAlert.success("Proyecto creado", "El proyecto se ha creado correctamente");
      }
      closeModal();
      fetchProjects();
    } catch (error: any) {
      const msg = error.response?.data?.error || "Error al guardar el proyecto";
      sweetAlert.error("Error", msg);
    }
  };

  /* ---------- Delete ---------- */

  const handleDelete = async (project: Project) => {
    const result = await sweetAlert.confirm(
      "¿Eliminar proyecto?",
      `¿Estás seguro de eliminar el proyecto "${project.name}"?`
    );

    if (result.isConfirmed) {
      try {
        await projectsAPI.remove(project._id);
        sweetAlert.success("Eliminado", "Proyecto eliminado correctamente");
        fetchProjects();
      } catch (error) {
        sweetAlert.error("Error", "No se pudo eliminar el proyecto");
      }
    }
  };

  /* ---------- Render ---------- */

  if (!selectedClient) {
    return (
      <PageLayout title="Proyectos" faIcon={{ icon: faBriefcase }}>
        <EmptyState
          icon={faBriefcase}
          title="Ningún cliente seleccionado"
          description="Selecciona un cliente para ver sus proyectos."
        />
      </PageLayout>
    );
  }

  if (initialLoading) return <LoadingSpinner message="Cargando proyectos..." />;

  return (
    <PageLayout
      title="Proyectos"
      subtitle={`Gestión de proyectos para ${selectedClient.name}`}
      faIcon={{ icon: faBriefcase }}
      onBack={() => navigate(-1)}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Proyectos",
        content: (
            <p>Gestiona los proyectos asociados al cliente seleccionado. Puedes crear nuevos proyectos, editar su estado y fechas, o eliminarlos.</p>
        ),
      }}
      actionCount={canManage ? 1 : 0}
      headerActions={
        canManage && (
          <button
            onClick={openCreate}
            className="p-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3 lg:h-4 lg:w-4" />
          </button>
        )
      }
      searchAndFilters={
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar proyectos..."
          filters={[
            {
              value: filterStatus,
              onChange: (v) => setFilterStatus(v),
              options: [
                { value: "all", label: "Todos los estados" },
                { value: "active", label: "Activos" },
                { value: "completed", label: "Completados" },
                { value: "on_hold", label: "En Espera" },
              ],
            },
          ]}
        />
      }
      viewModal={{
        isOpen: !!viewingProject,
        onClose: closeView,
        title: viewingProject?.name || "Proyecto",
        subtitle: viewingProject?.description,
        size: "md",
        actions: [
          ...(canManage
            ? [
                {
                  label: "Editar",
                  onClick: () => {
                    if (viewingProject) {
                      openEdit(viewingProject);
                      closeView();
                    }
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
        content: viewingProject ? <ProjectDetails project={viewingProject} client={selectedClient as any} /> : null,
      }}
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingProject ? "Editar Proyecto" : "Nuevo Proyecto",
        subtitle: editingProject ? "Modifica los detalles del proyecto" : "Crea un nuevo proyecto para este cliente",
        size: "md",
        actions: [
          {
            label: editingProject ? "Actualizar" : "Crear",
            onClick: () => document.querySelector<HTMLFormElement>("#project-form")?.requestSubmit(),
            variant: "primary",
          },
          {
            label: "Cancelar",
            onClick: closeModal,
            variant: "ghost",
          },
        ],
        content: (
          <ProjectForm
            id="project-form"
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            onSubmit={handleSubmit}
          />
        ),
      }}
    >
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={faBriefcase}
          title="No hay proyectos"
          description="Este cliente aún no tiene proyectos asignados (o no coinciden con la búsqueda)."
          action={
            canManage
              ? {
                  label: "Crear primer proyecto",
                  onClick: openCreate,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const badge = getStatusBadge(project.status);
            return (
              <Card
                key={project._id}
                onClick={() => openView(project)}
                className="hover:shadow-md transition-shadow"
                header={{
                  title: project.name,
                  subtitle: project.description || "Sin descripción",
                  icon: faBriefcase,
                  badges: [
                    {
                      text: badge.text,
                      variant: project.status === "active" ? "blue" : project.status === "on_hold" ? "warning" : "blue",
                    },
                  ],
                }}
                footer={
                  canManage
                    ? {
                        actions: [
                          {
                            icon: faEdit,
                            onClick: () => openEdit(project),
                            variant: "default",
                            title: "Editar",
                          },
                          {
                            icon: faTrash,
                            onClick: () => handleDelete(project),
                            variant: "default",
                            title: "Eliminar",
                          },
                        ],
                      }
                    : undefined
                }
              >
                <div className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {project.startDate && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendar} className="text-accent-1" />
                      <span>Inicio: {new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {project.endDate && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendar} className="text-accent-1" />
                      <span>Fin: {new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}


    </PageLayout>
  );
};
