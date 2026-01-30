import { create } from "zustand";

interface ThemeState {
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light", // Force light mode always

  toggleTheme: () => {
    // No-op: Dark mode disabled
    console.warn("Dark mode is disabled in this project.");
  },

  setTheme: (theme) => {
    // Only allow setting light mode
    if (theme === "dark") {
      console.warn("Dark mode is disabled.");
      return;
    }
    localStorage.setItem("theme", "light");
    set({ theme: "light" });
  },
}));
