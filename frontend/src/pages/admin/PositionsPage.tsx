import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { positionsAPI, Position } from "../../api/positions";
import { PageLayout } from "../../components/PageLayout";
import { SearchAndFilters } from "../../components/SearchAndFilters";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { Card } from "../../components/Card";
import { sweetAlert } from "../../utils/sweetAlert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserTie, faUserGraduate, faEdit, faTrash, faPlus, faShieldHalved, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

interface PositionFormData {
  name: string;
  description: string;
}

export const PositionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState<PositionFormData>({
    name: "",
    description: "",
  });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewPosition, setViewPosition] = useState<Position | null>(null);

  const [openInfo, setOpenInfo] = useState(false);

  const canManage = hasPermission("positions:view");

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await positionsAPI.list({});
      setPositions(response.positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      sweetAlert.error("Error", "No se pudieron cargar los cargos");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPosition(null);
    setFormData({
      name: "",
      description: "",
    });
    setShowModal(true);
  };

  const openEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || "",
    });
    setShowModal(true);
  };

  const openView = async (position: Position) => {
    try {
      const fullPosition = await positionsAPI.getById(position._id);
      setViewPosition(fullPosition);
      setViewOpen(true);
    } catch (error) {
      console.error("Error fetching position details:", error);
      setViewPosition(position);
      setViewOpen(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPosition(null);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewPosition(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPosition) {
        await positionsAPI.update(editingPosition._id, formData);
        sweetAlert.success("Cargo actualizado", "Los cambios se han guardado correctamente");
      } else {
        await positionsAPI.create(formData);
        sweetAlert.success("Cargo creado", "El cargo se ha creado correctamente");
      }
      closeModal();
      fetchPositions();
    } catch (error: any) {
      const message = error.response?.data?.error || "Error al guardar el cargo";
      sweetAlert.error("Error", message);
    }
  };

  const handleDelete = async (position: Position) => {
    const result = await sweetAlert.confirm("¿Eliminar cargo?", `¿Estás seguro de que quieres eliminar el cargo "${position.name}"?`);
    if (result.isConfirmed) {
      try {
        await positionsAPI.remove(position._id);
        sweetAlert.success("Cargo eliminado", "El cargo ha sido eliminado correctamente");
        fetchPositions();
      } catch (error: any) {
        const message = error.response?.data?.error || "Error al eliminar el cargo";
        sweetAlert.error("Error", message);
      }
    }
  };

  const filteredPositions = positions.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q.length === 0 || p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);

    let matchesDate = true;
    if (startDate || endDate) {
      const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : 0;
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

  if (loading) return <LoadingSpinner message="Cargando cargos..." />;

  return (
    <PageLayout
      title="Cargos"
      subtitle="Gestiona los cargos de la organización"
      faIcon={{ icon: faUserTie }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Cargos",
        content: (
            <p>Gestione los cargos o puestos de trabajo (ej. Desarrollador, Gerente). Los cargos se asignan a los usuarios y pueden tener niveles asociados.</p>
        ),
      }}
      onBack={() => navigate("/admin/users")}
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
          searchPlaceholder="Buscar cargos..."
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
        title: viewPosition ? viewPosition.name : "Cargo",
        subtitle: viewPosition?.description,
        size: "md",
        actions: [
          ...(canManage
            ? [
                {
                  label: "Editar cargo",
                  onClick: () => {
                    if (viewPosition) openEdit(viewPosition);
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
        content: viewPosition ? (
          <div className="space-y-6">
            {/* Descripción */}
            <div>
              <h4 className="text-sm font-semibold text-accent-9 mb-2">Descripción</h4>
              <p className="text-sm text-accent-7">{viewPosition.description || "—"}</p>
            </div>

            {/* Niveles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-accent-9 flex items-center gap-2">
                  <FontAwesomeIcon icon={faUserGraduate} className="text-accent-9" />
                  Niveles Disponibles
                </h4>

                <button onClick={() => navigate("/admin/levels")} className="text-xs text-accent-9 hover:underline">
                  Administrar niveles
                </button>
              </div>

              {/* Agrupar niveles */}
              {(() => {
                const específicos = (viewPosition.levels || []).filter((lvl) => lvl.type !== "general");
                const generales = (viewPosition.levels || []).filter((lvl) => lvl.type === "general");

                return (
                  <div className="space-y-6">
                    {/* Específicos */}
                    <div className="border border-accent-4 rounded-lg p-4 bg-accent-2">
                      <div className="flex items-center gap-2 mb-3">
                        <FontAwesomeIcon icon={faUserTie} className="text-accent-9" />
                        <h5 className="text-sm font-semibold text-accent-9">Específicos</h5>
                      </div>

                      {específicos.length > 0 ? (
                        <div className="space-y-2">
                          {específicos.map((level) => (
                            <div key={level._id} className="flex items-start gap-3 border-b border-accent-3/50 last:border-0 pb-2 last:pb-0 pt-1 first:pt-0">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-accent-9">{level.name}</p>
                                </div>
                                {level.description && <p className="text-xs text-accent-6">{level.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-accent-5 italic">No hay niveles específicos para este cargo.</p>
                      )}
                    </div>

                    {/* Generales */}
                    <div className="border border-accent-4 rounded-lg p-4 bg-accent-2">
                      <div className="flex items-center gap-2 mb-3">
                        <FontAwesomeIcon icon={faGlobe} className="text-accent-9" />
                        <h5 className="text-sm font-semibold text-accent-9">Generales</h5>
                      </div>

                      {generales.length > 0 ? (
                        <div className="space-y-2">
                          {generales.map((level) => (
                            <div key={level._id} className="flex items-start gap-3 border-b border-accent-3/50 last:border-0 pb-2 last:pb-0 pt-1 first:pt-0">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-accent-9">{level.name}</p>
                                </div>
                                {level.description && <p className="text-xs text-accent-6">{level.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-accent-5 italic">No hay niveles generales para este cargo.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null,
      }}
      modal={{
        isOpen: showModal,
        onClose: closeModal,
        title: editingPosition ? "Editar Cargo" : "Nuevo Cargo",
        subtitle: "Define nombre y descripción",
        size: "md",
        actions: [
          {
            label: editingPosition ? "Actualizar" : "Crear",
            onClick: () => {
              const form = document.querySelector<HTMLFormElement>("#position-form");
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
          <form id="position-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-accent-7 mb-2">Nombre *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="input-base" placeholder="Nombre del cargo" />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-7 mb-2">Descripción</label>
                <textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="input-base resize-none" placeholder="Descripción del cargo" />
              </div>
            </div>
          </form>
        ),
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mx-0.5 lg:mx-0">
        {filteredPositions.map((position) => {
          const specificLevels = position.levels ? position.levels.filter((level) => level.type !== "general") : [];

          return (
            <Card
              key={position._id}
              onClick={() => openView(position)}
              className="hover:scale-105 hover:shadow-lg transition-all duration-200"
              header={{
                title: position.name,
                subtitle: position.description,
                icon: faUserTie,
              }}
              footer={
                canManage
                  ? {
                      leftContent: <span className="text-xs text-accent-5">{position.createdAt ? new Date(position.createdAt).toLocaleDateString() : ""}</span>,
                      actions: [
                        {
                          icon: faEdit,
                          onClick: (e) => {
                            e.stopPropagation();
                            openEdit(position);
                          },
                          title: "Editar",
                          variant: "default",
                        },
                        {
                          icon: faTrash,
                          onClick: (e) => {
                            e.stopPropagation();
                            handleDelete(position);
                          },
                          title: "Eliminar",
                          variant: "default",
                        },
                      ],
                    }
                  : undefined
              }
            >
              {specificLevels.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm text-accent-5 tracking-wide mb-1">
                    <FontAwesomeIcon icon={faUserGraduate} className="text-accent-9 mb-2" />
                    <span>Niveles específicos</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {specificLevels.map((level) => (
                      <span key={level._id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-3 text-accent-8 text-xs">
                        <FontAwesomeIcon icon={faUserGraduate} className="h-3 w-3 text-blue-200" />
                        <span className="font-medium">{level.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {canManage && (
          <Card
            variant="create"
            onClick={openCreate}
            header={{
              title: "Nuevo Cargo",
              subtitle: "Crear un nuevo cargo para la organización",
              icon: faUserTie,
            }}
          />
        )}
      </div>

      {filteredPositions.length === 0 && (
        <EmptyState
          icon={faShieldHalved}
          title={startDate || endDate ? "No hay cargos en este rango de fechas" : "No hay cargos"}
          description={startDate || endDate ? `No se encontraron cargos ${startDate && endDate ? `desde ${new Date(startDate).toLocaleDateString()} hasta ${new Date(endDate).toLocaleDateString()}` : startDate ? `desde ${new Date(startDate).toLocaleDateString()}` : `hasta ${new Date(endDate).toLocaleDateString()}`}` : "Crea tu primer cargo para comenzar."}
          action={
            canManage
              ? {
                  label: "Nuevo Cargo",
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
