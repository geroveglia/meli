import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { seoService, SeoMetadata } from "../../services/seoService";
import { GooglePreview } from "./GooglePreview";
import { faSearch, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ImageUploader } from "../ImageUploader";
import { getImageUrl } from "../../utils/imageHelpers";
import { Checkbox } from "../Checkbox";
import { sweetAlert } from "../../utils/sweetAlert";

interface SeoManagerFormProps {
  entityType: string;
  entityId: string;
  defaultTitle?: string; // Fallback or initial
  previewUrl?: string;   // For the visual preview
}

export const SeoManagerForm: React.FC<SeoManagerFormProps> = ({
  entityType,
  entityId,
  defaultTitle = "Mi Sitio Web",
  previewUrl = "misitio.com > inicio",
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SeoMetadata>({
    entityType,
    entityId,
    metaTitle: "",
    metaDescription: "",
    ogImageUrl: "",
    noIndex: false,
  });
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);

  // Limits
  const TITLE_LIMIT = 60;
  const DESC_LIMIT = 160;

  useEffect(() => {
    loadSeo();
  }, [entityType, entityId]);

  const loadSeo = async () => {
    try {
      setLoading(true);
      const data = await seoService.getSeo(entityType, entityId);
      // Merge with defaults to ensure we have the structure even if API returns empty obj
      setFormData(prev => ({
        ...prev,
        ...data,
        entityType, // ensure persistence
        entityId
      }));
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos SEO");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SeoMetadata, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaving(true);
      await seoService.updateSeo(formData, ogImageFile || undefined);
      // toast.success("SEO actualizado correctamente");
      sweetAlert.success("SEO Guardado", "La configuración SEO se ha guardado correctamente");
    } catch (error) {
      console.error(error);
      sweetAlert.error("Error", "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const titleCount = formData.metaTitle?.length || 0;
  const descCount = formData.metaDescription?.length || 0;

  return (
    <form onSubmit={handleSave} className="space-y-6">
     
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Inputs */}
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-accent-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faGlobe} className="text-accent-6" />
                Metadatos
            </h3>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-1">
              Meta Title (Título SEO)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.metaTitle || ""}
                onChange={(e) => handleChange("metaTitle", e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border bg-accent-2 focus:ring-2 focus:outline-none transition-all
                  ${titleCount > TITLE_LIMIT 
                    ? "border-red-500 focus:ring-red-200" 
                    : "border-accent-4 focus:ring-accent-5"
                  }
                  text-accent-1
                `}
                placeholder="Ej: Inicio | Mi Empresa Increíble"
              />
              <div className={`absolute right-2 top-2.5 text-xs font-semibold
                ${titleCount > TITLE_LIMIT ? "text-red-500" : "text-accent-6"}
              `}>
                {titleCount}/{TITLE_LIMIT}
              </div>
            </div>
            <p className="text-xs text-accent-6 mt-1">
              Recomendado: 50-60 caracteres.
            </p>
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-sm font-medium text-accent-7 mb-1">
              Meta Description
            </label>
            <div className="relative">
              <textarea
                rows={4}
                value={formData.metaDescription || ""}
                onChange={(e) => handleChange("metaDescription", e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border bg-accent-2 focus:ring-2 focus:outline-none transition-all resize-none
                   ${descCount > DESC_LIMIT 
                    ? "border-red-500 focus:ring-red-200" 
                    : "border-accent-4 focus:ring-accent-5"
                  }
                  text-accent-1
                `}
                placeholder="Breve descripción de tu página para los resultados de búsqueda..."
              />
               <div className={`absolute right-2 bottom-2 text-xs font-semibold
                ${descCount > DESC_LIMIT ? "text-danger-500" : "text-neutral-400"}
              `}>
                {descCount}/{DESC_LIMIT}
              </div>
            </div>
             <p className="text-xs text-accent-6 mt-1">
              Recomendado: 150-160 caracteres.
            </p>
          </div>

           {/* No Index Toggle */}
           <div className="flex items-center gap-3 pt-2">
            <Checkbox
                id="noIndex"
                checked={formData.noIndex || false}
                onChange={(e) => handleChange("noIndex", (e.target as HTMLInputElement).checked)}
                label="Evitar que los motores de búsqueda indexen esta página (noindex)"
            />
           </div>

           {/* Social Share Image */}
           <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
             <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
               Imagen para Redes Sociales (OG Image)
             </h4>
             <p className="text-xs text-neutral-500 mb-3">
               Esta imagen aparecerá cuando se comparta el enlace en WhatsApp, Facebook, LinkedIn, etc.
             </p>
             <ImageUploader
                onChange={(file) => setOgImageFile(file)}
                value={ogImageFile || getImageUrl(formData.ogImageUrl)}
                showPreview={true}
                acceptCamera={false}
                className="w-full"
                previewHeightClass="h-48"
             />
           </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
             <h3 className="text-lg font-semibold text-accent-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faSearch} className="text-accent-6" />
                Vista Previa en Google
            </h3>
            
            <div className="bg-accent-2 p-6 rounded-xl border border-dashed border-accent-4 flex flex-col items-center justify-center min-h-[200px]">
                <GooglePreview 
                    title={formData.metaTitle || defaultTitle}
                    description={formData.metaDescription}
                    url={previewUrl}
                />
                <p className="text-xs text-accent-6 mt-4 text-center max-w-sm">
                    Así es como se vería tu resultado en una búsqueda de escritorio. La apariencia real puede variar.
                </p>
            </div>
        </div>
      </div>

       <div className="flex justify-end pt-4 pb-6 px-6 -mx-6 -mb-6 border-t border-accent-4 sticky bottom-0 z-10 bg-accent-2 rounded-b-xl">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-2 text-sm font-medium bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors disabled:opacity-50 shadow-sm rounded-lg"
          >
             {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
    </form>
  );
};
