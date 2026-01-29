import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { useThemeStore } from "../../stores/themeStore";
import { brandingService } from "../../services/brandingService";
import { useBrandingStore } from "../../stores/brandingStore";
import { sweetAlert } from "../../utils/sweetAlert"; 
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette, faUndo, faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { applyTheme } from "../../utils/themeUtils";

// Type defining the structure of our color configuration
type ColorScheme = Record<string, string>;

// Default colors from index.css (fallback / reference)
const DEFAULT_LIGHT: ColorScheme = {
  "accent-1": "#09090b",
  "accent-2": "#ffffff",
  "accent-3": "#f4f4f5",
  "accent-4": "#e4e4e7",
  "accent-5": "#d4d4d8",
  "accent-6": "#a1a1aa",
  "accent-7": "#71717a",
  "accent-8": "#52525b",
  "accent-9": "#27272a",
  "accent-10": "#18181b",
  "primary-50": "#eff6ff",
  "primary-100": "#dbeafe",
  "primary-200": "#bfdbfe",
  "primary-300": "#93c5fd",
  "primary-400": "#60a5fa",
  "primary-500": "#3b82f6",
  "primary-600": "#2563eb",
  "primary-700": "#1d4ed8",
  "primary-800": "#1e40af",
  "primary-900": "#1e3a8a",
  "primary-950": "#172554",
};

const DEFAULT_DARK: ColorScheme = {
  "accent-1": "#ffffff", 
  "accent-2": "#000000",
  "accent-3": "#18181b",
  "accent-4": "#27272a",
  "accent-5": "#3f3f46",
  "accent-6": "#52525b",
  "accent-7": "#71717a",
  "accent-8": "#a1a1aa",
  "accent-9": "#d4d4d8",
  "accent-10": "#f4f4f5",
  "primary-50": "#eff6ff",
  "primary-100": "#dbeafe",
  "primary-200": "#bfdbfe",
  "primary-300": "#93c5fd",
  "primary-400": "#60a5fa",
  "primary-500": "#3b82f6",
  "primary-600": "#2563eb",
  "primary-700": "#1d4ed8",
  "primary-800": "#1e40af",
  "primary-900": "#1e3a8a",
  "primary-950": "#172554",
};

const ACCENT_KEYS = Array.from({ length: 10 }, (_, i) => `accent-${i + 1}`);


const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="flex items-center gap-3 p-2 rounded-lg border border-accent-4 bg-accent-2">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-8 rounded cursor-pointer border-none bg-transparent p-0"
    />
    <div className="flex-1 min-w-0">
      <label className="text-xs font-semibold text-accent-7 uppercase tracking-wide block">{label}</label>
      <div className="text-sm font-mono text-accent-1">{value}</div>
    </div>
  </div>
);

export const ThemeColorsPage: React.FC = () => {
  const { branding, setBranding, fetchBranding } = useBrandingStore();
  const { theme } = useThemeStore();
  

  const [saving, setSaving] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);

  const [lightColors, setLightColors] = useState<ColorScheme>(DEFAULT_LIGHT);
  const [darkColors, setDarkColors] = useState<ColorScheme>(DEFAULT_DARK);

  useEffect(() => {
    // Initial load logic
    if (branding) {
      initializeColors(branding);
    } else {
      fetchBranding();
    }
  }, [branding]);

  const initializeColors = (data: any) => {
    if (data?.colors?.light) {
      setLightColors(prev => ({ ...prev, ...data.colors.light }));
    }
    if (data?.colors?.dark) {
      setDarkColors(prev => ({ ...prev, ...data.colors.dark }));
    }
  };

  const handleColorChange = (mode: 'light' | 'dark', key: string, value: string) => {
    if (mode === 'light') {
      setLightColors(prev => ({ ...prev, [key]: value }));
    } else {
      setDarkColors(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentWidth = branding?.logo?.width || 150;
      
      const updated = await brandingService.updateBranding(
        currentWidth,
        {}, // No new files
        {}, // No removals
        {
          light: lightColors,
          dark: darkColors
        }
      );

      setBranding(updated);
      
      // Apply immediately
      applyTheme(theme, updated);

      sweetAlert.success("Guardado", "Los colores se han actualizado correctamente.");
    } catch (error) {
      console.error(error);
      sweetAlert.error("Error", "No se pudieron guardar los colores.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const result = await sweetAlert.confirm(
      "¿Restablecer colores?",
      "¿Estás seguro de restablecer los colores a los valores por defecto? Se perderán los cambios no guardados.",
      "Sí, restablecer",
      "Cancelar"
    );

    if (result.isConfirmed) {
      setLightColors(DEFAULT_LIGHT);
      setDarkColors(DEFAULT_DARK);
      sweetAlert.success("Restablecido", "Los colores se han vuelto a sus valores por defecto temporariamente. No olvides guardar cambios.");
    }
  };



  return (
    <PageLayout
      title="Colores del Tema"
      subtitle="Personaliza la paleta de colores para los modos claro y oscuro."
      faIcon={{ icon: faPalette }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Colores del Tema",
        content: (
            <p>Personalice la paleta de colores del sistema para los modos claro y oscuro. Cambie los colores de acento y primarios.</p>
        ),
      }}
    >
      <div className="bg-accent-2 rounded-xl shadow-sm border border-accent-4 flex flex-col">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Light Mode Column */}
          <div className="space-y-6">
             <div className="flex items-center gap-3 border-b border-accent-4 pb-3">
                <div className="h-8 w-8 rounded-full bg-accent-2 border border-accent-4 flex items-center justify-center text-accent-1 shadow-sm">
                    <FontAwesomeIcon icon={faSun} />
                </div>
                <h3 className="text-lg font-bold text-accent-1">Modo Claro</h3>
             </div>
             
             <div>
               <h4 className="text-sm font-semibold text-accent-6 mb-3 uppercase tracking-wider">Base (Grises)</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {ACCENT_KEYS.map((key) => (
                   <ColorInput
                      key={`light-${key}`}
                      label={key}
                      value={lightColors[key] || DEFAULT_LIGHT[key]}
                      onChange={(val) => handleColorChange('light', key, val)}
                   />
                 ))}
               </div>
             </div>
          </div>

          {/* Dark Mode Column */}
          <div className="space-y-6">
             <div className="flex items-center gap-3 border-b border-accent-4 pb-3">
                <div className="h-8 w-8 rounded-full bg-accent-2 border border-accent-4 flex items-center justify-center text-accent-1 shadow-sm">
                    <FontAwesomeIcon icon={faMoon} />
                </div>
                <h3 className="text-lg font-bold text-accent-1">Modo Oscuro</h3>
             </div>
             
             <div>
               <h4 className="text-sm font-semibold text-accent-6 mb-3 uppercase tracking-wider">Base (Grises)</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {ACCENT_KEYS.map((key) => (
                   <ColorInput
                      key={`dark-${key}`}
                      label={key}
                      value={darkColors[key] || DEFAULT_DARK[key]}
                      onChange={(val) => handleColorChange('dark', key, val)}
                   />
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-10 px-6 py-4 border-t border-accent-4 flex justify-end gap-3 bg-accent-2 rounded-b-xl">
           <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-accent-7 bg-transparent hover:bg-accent-3 border border-transparent hover:border-accent-4 rounded-lg transition-all"
          >
            <FontAwesomeIcon icon={faUndo} className="mr-2" />
            Restablecer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium bg-accent-9 text-accent-2 hover:bg-accent-8 transition-colors disabled:opacity-50 shadow-sm rounded-lg"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </PageLayout>
  );
};
