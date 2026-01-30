import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { brandingService, BrandingSettings } from "../../services/brandingService";
import { ImageUploader } from "../../components/ImageUploader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faImage, faInfoCircle, faMobileAlt, faLock, faTimes, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useBrandingStore } from "../../stores/brandingStore";
import { sweetAlert } from "../../utils/sweetAlert";


export const GeneralSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingLogos, setSavingLogos] = useState(false);
  const [savingFavicon, setSavingFavicon] = useState(false);
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [openInfo, setOpenInfo] = useState(false);

  // Form State
  const [width, setWidth] = useState<number>(150);
  
  // Files
  const [headerLightFile, setHeaderLightFile] = useState<File | null>(null);
  const [headerDarkFile, setHeaderDarkFile] = useState<File | null>(null);
  const [footerLightFile, setFooterLightFile] = useState<File | null>(null);
  const [footerDarkFile, setFooterDarkFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  // Removed State
  const [headerLightRemoved, setHeaderLightRemoved] = useState(false);
  const [headerDarkRemoved, setHeaderDarkRemoved] = useState(false);
  const [footerLightRemoved, setFooterLightRemoved] = useState(false);
  const [footerDarkRemoved, setFooterDarkRemoved] = useState(false);
  const [faviconRemoved, setFaviconRemoved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await brandingService.getBranding();
      setSettings(data);
      if (data?.logo?.width) {
        setWidth(data.logo.width);
      }
      // Reset removed states on fresh load
      setHeaderLightRemoved(false);
      setHeaderDarkRemoved(false);
      setFooterLightRemoved(false);
      setFooterDarkRemoved(false);
      setFaviconRemoved(false);
    } catch (error) {
      console.error(error);
      sweetAlert.error("Error", "No se pudo cargar la configuración de branding");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLogos = async () => {
    try {
      setSavingLogos(true);
      const updatedSettings = await brandingService.updateBranding(width, {
        headerLight: headerLightFile || undefined,
        headerDark: headerDarkFile || undefined,
        footerLight: footerLightFile || undefined,
        footerDark: footerDarkFile || undefined,
      }, {
        removeHeaderLight: headerLightRemoved,
        removeHeaderDark: headerDarkRemoved,
        removeFooterLight: footerLightRemoved,
        removeFooterDark: footerDarkRemoved,
      });
      setSettings(updatedSettings);

      useBrandingStore.getState().setBranding(updatedSettings);
      
      setHeaderLightFile(null);
      setHeaderDarkFile(null);
      setFooterLightFile(null);
      setFooterDarkFile(null);
      
      setHeaderDarkRemoved(false);
      setFooterLightRemoved(false);
      setFooterDarkRemoved(false);

      sweetAlert.success("Logos Guardados", "La configuración de logos se ha guardado correctamente");
    } catch (error) {
      console.error(error);
      sweetAlert.error("Error", "No se pudo guardar la configuración de logos");
    } finally {
      setSavingLogos(false);
    }
  };

  const handleSaveFavicon = async () => {
    try {
      setSavingFavicon(true);
      // We pass the current width to ensure it's not lost/reset, but only valid favicon fields
      const updatedSettings = await brandingService.updateBranding(width, {
        favicon: faviconFile || undefined,
      }, {
        removeFavicon: faviconRemoved,
      });
      setSettings(updatedSettings);

      useBrandingStore.getState().setBranding(updatedSettings);
      
      setFaviconFile(null);
      setFaviconRemoved(false);

      sweetAlert.success("Favicon Guardado", "El favicon se ha actualizado correctamente");
    } catch (error) {
      console.error(error);
      sweetAlert.error("Error", "No se pudo guardar el favicon");
    } finally {
      setSavingFavicon(false);
    }
  };

  const getImageUrl = (path?: string) => {
    if (!path) return undefined;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
    if (path.startsWith("http")) return path;
    const baseUrl = apiUrl.replace("/api/v1", "");
    return `${baseUrl}${path}`;
  };

  const handleFileChange = (setter: (f: File | null) => void, remover: (b: boolean) => void) => (file: File | null) => {
    setter(file);
    remover(file === null);
  };

  return (
    <PageLayout
      title="Configuración General"
      subtitle="Gestiona el logo y la apariencia general de la aplicación"
      faIcon={{ icon: faCog }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Configuración General",
        content: (
            <p>Configure los aspectos visuales generales de la aplicación, incluyendo logos para header y footer, y el favicon.</p>
        ),
      }}
    >
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-5"></div>
        </div>
      ) : (

        <div className="space-y-8">
          
          {/* CARD 1: LOGOS */}
          <div className="bg-accent-3 rounded-xl shadow-sm border border-accent-4">
            {/* Custom Header Section */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-accent-4 rounded-t-xl">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent-3 flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faImage} className="text-xl text-accent-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-accent-1">Logos</h2>
                  <p className="text-sm text-accent-7">
                    Configura los logos para header y footer (Claro/Oscuro).
                  </p>
                </div>
              </div>

              {/* Width Configuration */}
              <div className="flex items-center gap-3 bg-accent-3/50 px-4 py-2 rounded-lg border border-accent-4">
                <label className="text-xs font-bold text-accent-7 uppercase tracking-wide whitespace-nowrap">
                  ANCHO LOGO
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="500"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-16 bg-transparent text-sm font-semibold text-accent-1 text-right outline-none"
                  />
                  <span className="text-xs font-medium text-accent-7">px</span>
                </div>
              </div>
            </div>

            {/* Logos Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Header Logos */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-accent-4 pb-3">
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-accent-3 text-accent-7">
                    HEADER
                  </span>
                  <h3 className="text-sm font-semibold text-accent-1">
                    Logos de Cabecera
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-accent-7 mb-2">
                      Modo Claro
                    </label>
                    <ImageUploader
                      onChange={handleFileChange(setHeaderLightFile, setHeaderLightRemoved)}
                      value={headerLightRemoved ? undefined : (headerLightFile || getImageUrl(settings?.logo?.header?.light))}
                      showPreview={true}
                      acceptCamera={false}
                      className="w-full"
                      previewHeightClass="h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-accent-7 mb-2">
                      Modo Oscuro
                    </label>
                    <ImageUploader
                      onChange={handleFileChange(setHeaderDarkFile, setHeaderDarkRemoved)}
                      value={headerDarkRemoved ? undefined : (headerDarkFile || getImageUrl(settings?.logo?.header?.dark))}
                      showPreview={true}
                      acceptCamera={false}
                      className="w-full"
                      previewHeightClass="h-24"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Logos */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-accent-4 pb-3">
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-accent-3 text-accent-7">
                    FOOTER
                  </span>
                  <h3 className="text-sm font-semibold text-accent-1">
                    Logos de Pie de Página
                  </h3>
                  <div className="group relative ml-auto">
                    <FontAwesomeIcon 
                      icon={faInfoCircle} 
                      className="text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 cursor-help h-3 w-3" 
                    />
                    <div className="absolute bottom-full mb-2 right-0 w-48 p-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                      Si no se sube, se usará el logo del Header por defecto.
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                      Modo Claro
                    </label>
                    <ImageUploader
                      onChange={handleFileChange(setFooterLightFile, setFooterLightRemoved)}
                      value={footerLightRemoved ? undefined : (footerLightFile || getImageUrl(settings?.logo?.footer?.light))}
                      showPreview={true}
                      acceptCamera={false}
                      className="w-full"
                      previewHeightClass="h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-accent-7 mb-2">
                      Modo Oscuro
                    </label>
                    <ImageUploader
                      onChange={handleFileChange(setFooterDarkFile, setFooterDarkRemoved)}
                      value={footerDarkRemoved ? undefined : (footerDarkFile || getImageUrl(settings?.logo?.footer?.dark))}
                      showPreview={true}
                      acceptCamera={false}
                      className="w-full"
                      previewHeightClass="h-24"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action Bar for Logos */}
            <div className="px-6 py-4 bg-accent-3 border-t border-accent-4 flex justify-end rounded-b-xl sticky bottom-0 z-10">
              <button
                type="button"
                onClick={handleSaveLogos}
                disabled={savingLogos}
                className="px-6 py-2 text-sm font-medium bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors disabled:opacity-50 shadow-sm rounded-lg"
              >
                {savingLogos ? "Guardando..." : "Guardar Logos"}
              </button>
            </div>
          </div>


          {/* CARD 2: FAVICON */}
          <div className="bg-accent-3 rounded-xl shadow-sm border border-accent-4">
            
            <div className="p-6 border-b border-accent-4">
                <div className="flex items-center gap-4 mb-1">
                    <div className="h-10 w-10 rounded-lg bg-accent-3 flex items-center justify-center shrink-0 text-accent-7">
                         <FontAwesomeIcon icon={faMobileAlt} className="text-lg" />
                    </div>
                   <h2 className="text-xl font-bold text-accent-1">Favicon</h2>
                </div>
                <p className="text-sm text-accent-7 ml-14">
                  Configura los iconos para la pestaña del navegador y la pantalla de inicio en dispositivos móviles.
                </p>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                
                {/* Column 1: Upload */}
                <div>
                     <div className="flex items-center gap-2 mb-6 border-b border-accent-4 pb-2">
                         <h3 className="text-base font-semibold text-accent-1">
                            Carga de Imagen
                         </h3>
                         <div className="group relative ml-auto">
                            <FontAwesomeIcon 
                              icon={faInfoCircle} 
                              className="text-accent-7 hover:text-accent-6 cursor-help h-3.5 w-3.5" 
                            />
                            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-accent-2 text-accent-7 text-xs rounded-lg shadow-xl border border-accent-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-left">
                              <p className="font-semibold mb-1 border-b border-accent-4 pb-1">Requisitos</p>
                              <p className="mb-1">Debe ser una imagen cuadrada.</p>
                              <p className="opacity-80">Recomendamos 512x512px. El sistema generará automáticamente todos los tamaños (16x16, 32x32, etc.).</p>
                            </div>
                          </div>
                      </div>

                     <label className="block text-xs font-bold text-accent-7 mb-2 uppercase tracking-wide">
                        Imagen (PNG, JPG, ICO)
                     </label>
                     <div className="h-64 border-2 border-dashed border-accent-4 rounded-xl bg-accent-2 relative overflow-hidden group hover:border-accent-6 transition-colors shadow-sm">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                             <div className="relative">
                                {/* Current Favicon Preview in Center if available */}
                                {(faviconFile || (settings?.logo?.favicon && !faviconRemoved)) ? (
                                    <div className="w-24 h-24 rounded-lg shadow-sm border border-accent-4 overflow-hidden mb-4 bg-accent-2 p-2">
                                         <img 
                                            src={faviconFile ? URL.createObjectURL(faviconFile) : getImageUrl(settings?.logo?.favicon)} 
                                            alt="Preview" 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-accent-3 rounded-full flex items-center justify-center mb-4">
                                        <FontAwesomeIcon icon={faImage} className="text-accent-5 text-2xl" />
                                    </div>
                                )}
                             </div>
                             
                             <p className="text-sm font-bold text-accent-1">
                                {(faviconFile || (settings?.logo?.favicon && !faviconRemoved)) ? "Haz clic o arrastra para reemplazar" : "Haz clic para subir"}
                             </p>
                             <p className="text-xs text-accent-7 mt-1">Soporta: PNG, JPG, ICO hasta 5MB</p>
                        </div>
                        <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.ico"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleFileChange(setFaviconFile, setFaviconRemoved)(e.target.files[0]);
                                }
                            }}
                            className="w-full h-full absolute inset-0 opacity-0 cursor-pointer z-30"
                        />
                         {/* Show preview on top if exists - REMOVED separate overlay, integrated above */}
                     </div>
                </div>

                {/* Column 2: Previews */}
                <div>
                    <h3 className="text-base font-semibold text-accent-1 mb-6 border-b border-accent-4 pb-2">
                        Vistas Previas
                    </h3>
                    
                    {/* Desktop Browser */}
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-accent-7 mb-3 uppercase tracking-wide">
                            NAVEGADOR DE ESCRITORIO
                        </label>
                        <div className="bg-accent-2 rounded-lg p-3 pb-0 border border-accent-4">
                                 <div className="flex items-center gap-2 px-1 pt-1 mb-2">
                                     <div className="flex gap-1.5 opacity-30">
                                         <div className="w-2.5 h-2.5 rounded-full bg-accent-6"></div>
                                         <div className="w-2.5 h-2.5 rounded-full bg-accent-6"></div>
                                         <div className="w-2.5 h-2.5 rounded-full bg-accent-6"></div>
                                     </div>
                                     <div className="bg-accent-2 rounded-t-lg px-3 py-1.5 flex items-center gap-2 text-xs text-accent-1 shadow-sm w-48 ml-2">
                                    {(faviconFile || (settings?.logo?.favicon && !faviconRemoved)) ? (
                                        <img
                                            src={faviconFile ? URL.createObjectURL(faviconFile) : getImageUrl(settings?.logo?.favicon)}
                                            alt="Favicon"
                                            className="w-4 h-4 object-contain"
                                        />
                                    ) : (
                                       <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                                    )}
                                     <span className="truncate flex-1">Inicio - Mi Sitio Web</span>
                                     <FontAwesomeIcon icon={faTimes} className="text-neutral-400 text-[10px]" />
                                 </div>
                                 <FontAwesomeIcon icon={faPlus} className="text-neutral-400 text-xs ml-1" />
                             </div>
                             
                             {/* Address Bar */}
                             <div className="bg-white dark:bg-neutral-900 py-2 px-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                                  <div className="flex gap-2 text-neutral-300 dark:text-neutral-600">
                                      <div className="w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
                                      <div className="w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
                                      <div className="w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
                                  </div>
                                  <div className="bg-white dark:bg-neutral-800 h-6 px-3 rounded flex-1 flex items-center gap-2 text-[10px] text-neutral-400 border border-neutral-100 dark:border-neutral-700 shadow-sm">
                                       <FontAwesomeIcon icon={faLock} className="text-[8px]" />
                                       <span>https://misitio.com</span>
                                  </div>
                             </div>

                             {/* Content Area */}
                             <div className="bg-white dark:bg-neutral-900 h-32 flex items-center justify-center rounded-b-lg border border-neutral-100 dark:border-neutral-800">
                                  <h1 className="text-3xl font-bold text-neutral-100 dark:text-neutral-800 tracking-widest uppercase">CONTENT</h1>
                             </div>
                        </div>
                    </div>



                </div>
            </div>

            {/* Footer Action Bar */}
             <div className="px-6 py-4 bg-accent-3 border-t border-accent-4 flex justify-end gap-3 rounded-b-xl sticky bottom-0 z-10">


                  <button
                    type="button"
                    onClick={handleSaveFavicon}
                    disabled={savingFavicon}
                    className="px-6 py-2 text-sm font-medium bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors disabled:opacity-50 shadow-sm rounded-lg"
                  >
                    {savingFavicon ? "Guardando..." : "Guardar Favicon"}
                  </button>
            </div>
          </div>

        </div>
      )}
    </PageLayout>
  );
};
