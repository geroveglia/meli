import { create } from "zustand";
import { brandingService, BrandingSettings } from "../services/brandingService";

interface BrandingStore {
  branding: BrandingSettings | null;
  loading: boolean;
  fetchBranding: () => Promise<void>;
  setBranding: (branding: BrandingSettings) => void;
}

export const useBrandingStore = create<BrandingStore>((set) => ({
  branding: null,
  loading: false,
  fetchBranding: async () => {
    set({ loading: true });
    try {
      const branding = await brandingService.getBranding();
      set({ branding, loading: false });
    } catch (error) {
      console.error("Error fetching branding:", error);
      set({ loading: false });
    }
  },
  setBranding: (branding) => set({ branding }),
}));
