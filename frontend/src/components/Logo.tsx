import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useThemeStore } from "../stores/themeStore";
import { useBrandingStore } from "../stores/brandingStore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube } from "@fortawesome/free-solid-svg-icons";

type LogoProps = {
  /** Tailwind size para el <h1>. Ej: "text-2xl" | "text-3xl" */
  sizeClass?: string;
  /** Clases para el contenedor <Link> (posicionamiento/hover) */
  wrapperClassName?: string;
  /** Ruta destino del logo */
  to?: string;
  /** Clases extra para la etiqueta <img> (ej: object-contain, constraints) */
  imgClassName?: string;
};

export const Logo: React.FC<LogoProps & { forceTheme?: "light" | "dark" }> = ({ wrapperClassName = "flex items-center cursor-pointer hover:opacity-80 transition-opacity", to = "/admin/dashboard", imgClassName = "", forceTheme }) => {
  // Use global store
  const { branding, fetchBranding } = useBrandingStore();
  const { theme: globalTheme } = useThemeStore();
  
  // Effective theme: valid overrides global
  const activeTheme = forceTheme || globalTheme;

  useEffect(() => {
    // Only fetch if not already loaded (or can fetch on every mount if we prefer freshness)
    if (!branding) {
      fetchBranding();
    }
  }, [branding, fetchBranding]);

  const getLogoUrl = () => {
    if (!branding?.logo?.header) return null;
    const mode = activeTheme === "dark" ? "dark" : "light";
    return branding.logo.header[mode];
  };

  const logoUrl = getLogoUrl();
  const logoWidth = branding?.logo?.width || 150;

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
  const baseUrl = apiUrl.replace("/api/v1", "");
  const fullLogoUrl = logoUrl ? (logoUrl.startsWith("http") ? logoUrl : `${baseUrl}${logoUrl}`) : null;

  return (
    <Link to={to} className={wrapperClassName}>
      {fullLogoUrl ? (
        <img src={fullLogoUrl} alt={`${import.meta.env.VITE_APP_FIRST_NAME} ${import.meta.env.VITE_APP_LAST_NAME} Logo`} className={`object-contain ${imgClassName}`} style={{ width: `${logoWidth}px` }} />
      ) : (
        <div className="flex items-center gap-3 group">
          {/* Logo Icon - FontAwesome Cube */}
          <div className={`relative w-8 h-8 flex items-center justify-center ${activeTheme === "dark" ? "text-white" : "text-black"}`}>
            <FontAwesomeIcon icon={faCube} className="w-8 h-8 group-hover:animate-pulse transition-all" />
          </div>

          {/* Logo Text - TEMPLATE using provided style */}
          <div className="flex flex-col">
            <span
              className={`text-2xl font-black tracking-widest uppercase select-none ${activeTheme === "dark" ? "text-white" : "text-black"}`}
              style={{
                fontFamily: "'Inter', sans-serif",
              }}
            >
              TEMPLATE
            </span>
          </div>
        </div>
      )}
    </Link>
  );
};
