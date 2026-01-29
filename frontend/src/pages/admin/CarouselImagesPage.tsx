import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { carouselService, CarouselImage } from "../../services/carouselImages";
import { ImageUploader } from "../../components/ImageUploader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages, faPlus, faTrash, faEdit, faTimes, faSort, faCheck } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Card } from "../../components/Card";
import { Checkbox } from "../../components/Checkbox";
import { Reorder } from "framer-motion";


export const CarouselImagesPage: React.FC = () => {
  useEffect(() => {
     console.log("CarouselImagesPage mounted");
  }, []);

  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<CarouselImage | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formOrder, setFormOrder] = useState<number>(0);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const data = await carouselService.getAll();
      setImages(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar las imágenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleOpenModal = (image?: CarouselImage) => {
    if (image) {
      setEditingImage(image);
      setFormTitle(image.title || "");
      setFormOrder(image.order);
      setSelectedFile(null);
    } else {
      setEditingImage(null);
      setFormTitle("");
      setFormOrder(images.length > 0 ? Math.max(...images.map((i) => i.order)) + 1 : 0);
      setSelectedFile(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingImage(null);
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar orden duplicado si NO estamos reordenando (en reordenamiento el orden es implícito)
    const isDuplicateOrder = images.some(
      (img) => img.order === formOrder && (editingImage ? img._id !== editingImage._id : true)
    );

    if (isDuplicateOrder) {
      toast.error(`El orden ${formOrder} ya está en uso. Por favor elige otro.`);
      return;
    }

    try {
      if (editingImage) {
        await carouselService.update(editingImage._id, {
          title: formTitle,
          order: formOrder,
        }, selectedFile || undefined);
        toast.success("Imagen actualizada correctamente");
      } else {
        if (!selectedFile) {
          toast.error("Debes seleccionar una imagen");
          return;
        }
        await carouselService.upload(selectedFile, formTitle, formOrder);
        toast.success("Imagen subida correctamente");
      }
      handleCloseModal();
      fetchImages();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la imagen");
    }
  };

  const handleDelete = async (image: CarouselImage) => {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "No podrás revertir esto",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await carouselService.delete(image._id);
        toast.success("Imagen eliminada");
        fetchImages();
      } catch (error) {
        console.error(error);
        toast.error("Error al eliminar la imagen");
      }
    }
  };

  const handleToggleActive = async (image: CarouselImage) => {
    try {
      await carouselService.update(image._id, { isActive: !image.isActive });
      const updatedImages = images.map((img) =>
        img._id === image._id ? { ...img, isActive: !img.isActive } : img
      );
      setImages(updatedImages);
      toast.success(`Imagen ${!image.isActive ? "activada" : "desactivada"}`);
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar estado");
    }
  };

  const handleSaveOrder = async () => {
    try {
      setLoading(true);
      // Update all images with new order
      await Promise.all(
        images.map((img, index) => 
          carouselService.update(img._id, { order: index + 1 })
        )
      );
      toast.success("Orden actualizado correctamente");
      setIsReordering(false);
      fetchImages(); // Refetch to confirm
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el orden");
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Carrusel de Imágenes"
      subtitle="Gestiona las imágenes que se muestran en el carrusel principal"
      faIcon={{ icon: faImages }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Carrusel de Imágenes",
        content: (
            <p>Gestione las imágenes del carrusel principal. Puede subir nuevas imágenes, ordenarlas y cambiar su visibilidad.</p>
        ),
      }}
      headerActions={
        <div className="flex gap-2">
            {!isReordering && (
                <>
                     <button
                        onClick={() => setIsReordering(true)}
                        className="p-2 rounded-lg bg-accent-2 text-accent-7 border border-accent-4 hover:bg-accent-3 transition-colors flex items-center justify-center"
                        title="Reordenar"
                    >
                        <FontAwesomeIcon icon={faSort} />
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="p-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center justify-center"
                        title="Nueva Imagen"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </>
            )}
            {isReordering && (
                <button
                    onClick={handleSaveOrder}
                    className="px-4 py-2 rounded-lg bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors flex items-center gap-2 font-bold text-sm"
                    title="Guardar Orden"
                >
                    <FontAwesomeIcon icon={faCheck} /> Guardar Orden
                </button>
            )}
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-5"></div>
        </div>
      ) : (
        <>
            {isReordering ? (
                <Reorder.Group 
                    axis="y" 
                    values={images} 
                    onReorder={setImages} 
                    className="flex flex-col gap-3 max-w-2xl mx-auto"
                >
                    {images.map((image) => (
                        <Reorder.Item 
                            key={image._id} 
                            value={image}
                            className="bg-accent-2 border border-accent-4 rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                        >
                            <div className="h-12 w-20 bg-accent-3 rounded-lg overflow-hidden flex-shrink-0 relative pointer-events-none">
                                <img
                                    src={`${(import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1").replace("/api/v1", "")}${image.imageUrl}`}
                                    alt={image.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-accent-1">
                                    {image.title || "Sin título"}
                                </p>
                                <p className="text-xs text-accent-6">
                                    Orden actual: <span className="font-mono text-accent-1">{image.order}</span>
                                </p>
                            </div>

                            <button className="text-accent-4 hover:text-accent-6 px-2 cursor-grab active:cursor-grabbing">
                                <FontAwesomeIcon icon={faSort} />
                            </button>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {images.map((image) => (
                    <Card
                    key={image._id}
                    className="h-full"
                    header={{
                        title: image.title || "Sin título",
                        subtitle: `Orden: ${image.order}`,
                        icon: faImages,
                        badges: [
                        {
                            text: image.isActive ? "Visible" : "Oculto",
                            variant: image.isActive ? "success" : "default",
                        },
                        ],
                    }}
                    footer={{
                        leftContent: (
                            <Checkbox 
                                checked={image.isActive}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleActive(image);
                                }}
                                label={image.isActive ? "Visible" : "Oculto"}
                            />
                        ),
                        actions: [
                        {
                            icon: faEdit,
                            title: "Editar",
                            onClick: () => handleOpenModal(image),
                        },
                        {
                            icon: faTrash,
                            title: "Eliminar",
                            onClick: () => handleDelete(image),
                            // variant: "danger" -> Removed to match edit button (default)
                        },
                        ],
                    }}
                    >
                    <div className="aspect-video w-full relative bg-accent-2 rounded-lg overflow-hidden border border-accent-3">
                        <img
                        src={`${(import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1").replace("/api/v1", "")}${image.imageUrl}`}
                        alt={image.title || "Carousel Image"}
                        className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-xs text-accent-6 text-right mt-1">
                        Subido: {new Date(image.createdAt).toLocaleDateString()}
                    </div>
                    </Card>
                ))}
            </div>
            )}
            
            {images.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center text-accent-6 bg-accent-2 rounded-xl border-2 border-dashed border-accent-4">
                <FontAwesomeIcon icon={faImages} className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay imágenes en el carrusel</p>
                <p className="text-sm mt-1">Sube una nueva imagen para comenzar</p>
                </div>
            )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-accent-2 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-accent-4">
              <h3 className="text-lg font-bold text-accent-1">
                {editingImage ? "Editar Imagen" : "Nueva Imagen"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-accent-1 hover:opacity-70 transition-opacity"
              >
                <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-accent-7 mb-2">
                  Imagen
                </label>
                <ImageUploader
                  onChange={(file) => setSelectedFile(file)}
                  value={selectedFile || (editingImage ? `${(import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1").replace("/api/v1", "")}${editingImage.imageUrl}` : undefined)}
                  showPreview={true}
                  acceptCamera={false}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-7 mb-1">
                  Título (Opcional)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-accent-4 bg-accent-2 text-accent-1 focus:ring-2 focus:ring-accent-5 outline-none transition-all"
                  placeholder="Ej. Promoción de Verano"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-7 mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-accent-4 bg-accent-2 text-accent-1 focus:ring-2 focus:ring-accent-5 outline-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-accent-7 bg-accent-2 border border-accent-4 rounded-lg hover:bg-accent-3 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors rounded-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
