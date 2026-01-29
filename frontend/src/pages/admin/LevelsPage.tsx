import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { levelsAPI, Level, LevelFormData as APILevelFormData } from "../../api/levels";
import { positionsAPI, Position } from "../../api/positions";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { sweetAlert } from "../../utils/sweetAlert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserTie, faUserGraduate, faEdit, faTrash, faPlus, faShieldHalved, faGlobe, faUserGear } from "@fortawesome/free-solid-svg-icons";
import { getHelp, hasHelp } from "../../data/help/helpContent";
import { useNavigate } from "react-router-dom";

const HELP_KEY = "levels" as const;

interface LevelFormData {
  name: string;
  description: string;
  type: "general" | "position-specific";
  positionId: string;
}

export const LevelsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [levels, setLevels] = useState<Level[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [formData, setFormData] = useState<LevelFormData>({
    name: "",
    description: "",
    type: "general",
    positionId: "",
  });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLevel, setViewLevel] = useState<Level | null>(null);

  const [openInfo, setOpenInfo] = useState(false);
  const helpEntry = getHelp(HELP_KEY);

  const canManage = hasPermission("levels:view");

  useEffect(() => {
    fetchLevels();
    fetchPositions();
  }, []);

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const response = await levelsAPI.list({});
      setLevels(response.levels);
    } catch (error) {
      console.error("Error fetching levels:", error);
      sweetAlert.error("Error", "No se pudieron cargar los niveles");
    } finally {
      setLoading(false);
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

  const openCreate = () => {
    setEditingLevel(null);
    setFormData({
      name: "",
      description: "",
      type: "general",
      positionId: "",
    });
    setShowModal(true);
  };

  const openEdit = (level: Level) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      description: level.description || "",
      type: level.type,
      positionId: typeof level.positionId === "object" && level.positionId ? level.positionId._id : (level.positionId as string) || "",
    });
    setShowModal(true);
  };

  const openView = (level: Level) => {
    setViewLevel(level);
    setViewOpen(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLevel(null);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewLevel(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.type === "position-specific" && !formData.positionId) {
      sweetAlert.error("Error", "Debes seleccionar un cargo para niveles específicos");
      return;
    }

    try {
      if (editingLevel) {
        const updateData: Partial<APILevelFormData> = {
          name: formData.name,
          description: formData.description,
        };
        await levelsAPI.update(editingLevel._id, updateData);
        sweetAlert.success("Nivel actualizado", "Los cambios se han guardado correctamente");
      } else {
        const createData: APILevelFormData = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          positionId: formData.type === "position-specific" ? formData.positionId : undefined,
        };
        await levelsAPI.create(createData);
        sweetAlert.success("Nivel creado", "El nivel se ha creado correctamente");
      }
      closeModal();
      fetchLevels();
    } catch (error: any) {
      const message = error.response?.data?.error || "Error al guardar el nivel";
      sweetAlert.error("Error", message);
    }
  };

  const handleDelete = async (level: Level) => {
    const result = await sweetAlert.confirm("¿Eliminar nivel?", `¿Estás seguro de que quieres eliminar el nivel "${level.name}"?`);
    if (result.isConfirmed) {
      try {
        await levelsAPI.remove(level._id);
        sweetAlert.success("Nivel eliminado", "El nivel ha sido eliminado correctamente");
        fetchLevels();
      } catch (error: any) {
        const message = error.response?.data?.error || "Error al eliminar el nivel";
        sweetAlert.error("Error", message);
      }
    }
  };

  const filteredLevels = levels.filter((l) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q.length === 0 || l.name.toLowerCase().includes(q) || (l.description || "").toLowerCase().includes(q);

    let matchesDate = true;
    if (startDate || endDate) {
      const createdAt = l.createdAt ? new Date(l.createdAt).getTime() : 0;
      if (startDate) {
        const start = new Date(startDate).getTime();
        matchesDate = matchesDate && createdAt >= start;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        matchesDate = matchesDate && createdAt <= end;
      }
    }

    return matchesSearch && matchesDate;
  });

  if (loading) return <LoadingSpinner message="Cargando niveles..." />;

  return (
    <PageLayout
      title="Niveles"
      subtitle="Gestiona los niveles de experiencia de la organización"
      faIcon={{ icon: faUserGraduate }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Niveles",
        content: (
            <p>Defina niveles de experiencia (ej. Junior, Senior, Staff). Los niveles pueden ser generales para toda la empresa o específicos para ciertos cargos.</p>
        ),
      }}
      onBack={() => navigate("/admin/users")}
      headerActions={
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/users")} className="hidden" aria-hidden="true"></button>
          <button onClick={() => navigate("/admin/positions")} className="px-4 py-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faUserTie} className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:block">Cargos</span>
          </button>
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
          searchPlaceholder="Buscar niveles..."
          dateFilter={{
            startDate,
            endDate,
            onStartDateChange: setStartDate,
            onEndDateChange: setEndDate,
          }}
        />
      }
      viewModal={{
        isOpen: viewOpen,
        onClose: closeView,
        title: viewLevel ? viewLevel.name : "Nivel",
        subtitle: viewLevel?.description,
        size: "md",
        actions: [
          ...(canManage
            ? [
                {
                  label: "Editar nivel",
                  onClick: () => {
                    if (viewLevel) openEdit(viewLevel);
                    closeView();
                  },
                  variant: "secondary",
                } as const,
              ]
            : []),
          {
            label: "Cancelar",
            onClick: closeView,
            variant: "ghost",
          },
        ],
        content: viewLevel ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-accent-9 mb-2">Tipo</h4>
              <p className="text-sm text-accent-7">
                {viewLevel.type === "general" ? (
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faGlobe} className="text-accent-9" />
                    General (disponible para todos los cargos)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faUserTie} className="text-accent-9" />
                    Específico de cargo: {typeof viewLevel.positionId === "object" && viewLevel.positionId ? viewLevel.positionId.name : "—"}
                  </span>
                )}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-accent-9 mb-2">Descripción</h4>
              <p className="text-sm text-accent-7">{viewLevel.description || "—"}</p>
            </div>
          </div>
        ) : null,
      }}
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingLevel ? "Editar Nivel" : "Nuevo Nivel",
        subtitle: "Define nombre y descripción",
        size: "md",
        actions: [
          {
            label: editingLevel ? "Actualizar" : "Crear",
            onClick: () => {
              const form = document.querySelector<HTMLFormElement>("#level-form");
              form?.requestSubmit();
            },
            variant: "primary", // This is passed to Modal which internally uses buttons. We might need to check Modal implementation too, but for now we follow the structure.
                                // Wait, the Modal component probably renders these actions. Let's check if Modal needs update or if it accepts a custom component.
                                // The current Modal implementation likely renders a button with the variant string.
          },
          {
            label: "Cancelar",
            onClick: closeModal,
            variant: "ghost",
          },
        ],
        content: (
          <form id="level-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
              {!editingLevel && (
                <div>
                  <label className="block text-sm font-medium text-accent-7 mb-2">Tipo de Nivel *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="general"
                        checked={formData.type === "general"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            type: e.target.value as "general" | "position-specific",
                            positionId: "",
                          }))
                        }
                        className="w-4 h-4 text-accent-9 focus:ring-accent-5 border-accent-4"
                      />
                      <span className="text-sm text-accent-7 flex items-center gap-2">
                        <FontAwesomeIcon icon={faGlobe} className="text-accent-9" />
                        General
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="position-specific"
                        checked={formData.type === "position-specific"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            type: e.target.value as "general" | "position-specific",
                          }))
                        }
                        className="w-4 h-4 text-accent-9 focus:ring-accent-5 border-accent-4"
                      />
                      <span className="text-sm text-accent-7 flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserTie} className="text-accent-9" />
                        Específico de Cargo
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-accent-5 mt-1">{formData.type === "general" ? "Este nivel estará disponible para todos los cargos" : "Este nivel solo estará disponible para el cargo seleccionado"}</p>
                </div>
              )}

              {editingLevel && (
                <div className="bg-accent-2 border border-accent-4 rounded-lg p-3 mb-6">
                  <p className="text-sm text-accent-7">
                    <strong className="text-accent-9">Nota:</strong> El tipo y cargo de un nivel no pueden modificarse una vez creado.
                  </p>
                </div>
              )}

              {!editingLevel && formData.type === "position-specific" && (
                <div>
                  <label className="block text-sm font-medium text-accent-7 mb-2">Cargo *</label>
                  <select
                    required
                    value={formData.positionId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        positionId: e.target.value,
                      }))
                    }
                    className="input-base"
                  >
                    <option value="">Seleccionar cargo...</option>
                    {positions.map((position) => (
                      <option key={position._id} value={position._id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-accent-7 mb-2">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="input-base"
                  placeholder="Nombre del nivel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-7 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="input-base resize-none"
                  placeholder="Descripción del nivel"
                />
              </div>
            </div>
          </form>
        ),
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
        {filteredLevels.map((level) => (
          <Card
            key={level._id}
            onClick={() => openView(level)}
            className="hover:scale-105 hover:shadow-lg transition-all duration-200"
            header={{
              title: (
                <div className="flex items-center gap-2">
                  <span>{level.name}</span>
                  {/* Eliminado el badge del cargo en el header */}
                  {level.type === "general" && <span className="text-xs bg-accent-9 text-accent-2 px-2 py-0.5 rounded-full">General</span>}
                </div>
              ),
              subtitle: level.description,
              icon: level.type === "general" ? faGlobe : faUserGraduate,
            }}
            footer={
              canManage
                ? {
                    leftContent: <span className="text-xs text-accent-5">{level.createdAt ? new Date(level.createdAt).toLocaleDateString() : ""}</span>,
                    actions: [
                      {
                        icon: faEdit,
                        onClick: (e) => {
                          e.stopPropagation();
                          openEdit(level);
                        },
                        title: "Editar",
                        variant: "default",
                      },
                      {
                        icon: faTrash,
                        onClick: (e) => {
                          e.stopPropagation();
                          handleDelete(level);
                        },
                        title: "Eliminar",
                        variant: "default",
                      },
                    ],
                  }
                : undefined
            }
          >
            {/* 🚀 NUEVO BLOQUE INTERNO — Igual a Usuarios */}
            {level.type === "position-specific" && (
              <div className="mb-3">
                <label className="text-xs font-medium text-accent-5 mb-2 flex gap-1 items-center">
                  <FontAwesomeIcon icon={faUserTie} className="h-2 w-2 lg:h-3 lg:w-3 text-accent-4" />
                  Cargo
                </label>

                {typeof level.positionId === "object" && level.positionId?.name ? (
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-9 text-accent-2">{level.positionId.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-accent-5">Sin cargo asignado</span>
                )}
              </div>
            )}
          </Card>
        ))}
        {canManage && (
          <Card
            variant="create"
            onClick={openCreate}
            header={{
              title: "Nuevo Nivel",
              subtitle: "Crear un nuevo nivel de experiencia",
              icon: faUserGraduate,
            }}
          />
        )}
      </div>

      {filteredLevels.length === 0 && (
        <EmptyState
          icon={faShieldHalved}
          title={startDate || endDate ? "No hay niveles en este rango de fechas" : "No hay niveles"}
          description={startDate || endDate ? `No se encontraron niveles ${startDate && endDate ? `desde ${new Date(startDate).toLocaleDateString()} hasta ${new Date(endDate).toLocaleDateString()}` : startDate ? `desde ${new Date(startDate).toLocaleDateString()}` : `hasta ${new Date(endDate).toLocaleDateString()}`}` : "Crea tu primer nivel para comenzar."}
          action={
            canManage
              ? {
                  label: "Nuevo Nivel",
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
