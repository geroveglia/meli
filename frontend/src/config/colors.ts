/**
 * Centralized color configuration for the application.
 * These colors match the tailwind.config.js palette.
 * Use these when you need hex values (e.g., for charts, SVG, inline styles).
 * For CSS classes, use Tailwind utilities directly (e.g., bg-primary-500).
 */

export const colors = {
  // Primary (Monochrome) - Replaces Blue
  primary: {
    50: '#f9fafb',   // gray-50
    100: '#f3f4f6',  // gray-100
    200: '#e5e7eb',  // gray-200
    300: '#d1d5db',  // gray-300
    400: '#9ca3af',  // gray-400
    500: '#6b7280',  // gray-500
    600: '#000000',  // BLACK (Strong contrast for buttons)
    700: '#1f2937',  // gray-800
    800: '#111827',  // gray-900
    900: '#030712',  // gray-950
    950: '#000000',  // black
  },
  // Secondary (Monochrome - Lighter/Silver) - Replaces Sky
  secondary: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  // Accent (Monochrome - Dark Gray) - Replaces Cyan
  accent: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Warning (Amber) - Warning states and favorites
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // Danger (Red) - Error states and destructive actions
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  // Neutral (Slate) - Bluish-gray for text, backgrounds, borders
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Scrollbar
  scrollbar: '#94a3b8',
} as const;

// Helper function to convert hex to rgba
export const hexToRgba = (hex: string, opacity: number): string => {
  // Parsing hex is tricky if we use CSS vars. 
  // For now, we will assume we are returning CSS variable strings directly for charts.
  return hex;
};

// Chart colors - generates an array of colors for charts using CSS variables
export const generateChartColors = (count: number): string[] => {
  const baseColors = [
    "var(--accent-9)",
    "var(--accent-7)",
    "var(--accent-5)",
    "var(--accent-8)",
    "var(--accent-6)",
    "var(--accent-4)",
    "var(--accent-10)",
    "var(--neutral-600)",
    "var(--accent-3)",
    "var(--neutral-400)",
  ];

  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    result.push(baseColors[i % baseColors.length]);
  }

  return result;
};

// Theme-aware colors for charts and inline styles
export const getThemeColors = (isDark: boolean) => ({
  text: isDark ? "var(--neutral-400)" : "var(--neutral-500)",
  textPrimary: isDark ? "var(--neutral-50)" : "var(--neutral-900)",
  textSecondary: isDark ? "var(--neutral-300)" : "var(--neutral-600)",
  grid: isDark ? "var(--neutral-700)" : "var(--neutral-200)",
  background: isDark ? "var(--neutral-800)" : "var(--neutral-50)", // Using neutral-50 for light mode bg
  border: isDark ? "var(--neutral-700)" : "var(--neutral-200)",
  surface: isDark ? "var(--neutral-900)" : "#ffffff",
  stroke: isDark ? "var(--neutral-800)" : "#ffffff",
});

export type ColorPalette = typeof colors;
