import { BrandingSettings } from "../services/brandingService";

/**
 * Applies the theme colors from branding settings to the document root.
 */
export const applyTheme = (theme: string, branding: BrandingSettings | null) => {
  if (!branding?.colors) return;

  const root = document.documentElement;
  const colors = theme === 'dark' ? branding.colors.dark : branding.colors.light;

  // Reset previously set custom properties to ensure clean state if switching themes/colors
  // Note: This relies on the fact that we are overwriting the specific --accent-X variables.
  // We don't remove all styles, just overwrite the ones we care about.

  if (colors) {
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      } else {
        root.style.removeProperty(`--${key}`);
      }
    });
  }

  // Also apply the opposite theme's colors if we want to support consistent 
  // looking "manual" toggles or if there are cross-theme variables, 
  // but typically we just care about the CURRENT active theme for the :root
  
  // However, since index.css defines variables under [data-theme='light'] and [data-theme='dark']
  // modification of :root style attribute overrides both.
  // To correctly support switching modes without re-applying, we might need a more robust approach
  // or simply re-run this function whenever the theme changes (which we do in App.tsx).
};
