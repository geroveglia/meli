import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useThemeStore } from "../stores/themeStore";
import { useBrandingStore } from "../stores/brandingStore";

// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faCube } from "@fortawesome/free-solid-svg-icons";

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
        <img 
          src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.22.8/mercadolibre/logo__large_plus.png" 
          alt="Mercado Libre" 
          className={`object-contain ${imgClassName}`} 
          style={{ height: "34px", width: "auto" }} 
        />
      )}
    </Link>
  );
};
