import axios from "axios";
import { useAuthStore } from "../stores/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  const tenantId = localStorage.getItem("tenantId") || "";
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
    },
  };
};

export interface BrandingSettings {
  logo: {
    width: number;
    header: {
      light?: string;
      dark?: string;
    };
    footer: {
      light?: string;
      dark?: string;
    };
    favicon?: string;
  };
  colors?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}

export const brandingService = {
  getBranding: async (): Promise<BrandingSettings> => {
    const response = await axios.get(`${API_URL}/tenants/current/branding`, getHeaders());
    return response.data;
  },

  updateBranding: async (
    width: number,
    files: {
      headerLight?: File;
      headerDark?: File;
      footerLight?: File;
      footerDark?: File;
      favicon?: File;
    },
    removals?: {
      removeHeaderLight?: boolean;
      removeHeaderDark?: boolean;
      removeFooterLight?: boolean;
      removeFooterDark?: boolean;
      removeFavicon?: boolean;
    },
    colors?: {
      light?: Record<string, string>;
      dark?: Record<string, string>;
    }
  ): Promise<BrandingSettings> => {
    const formData = new FormData();
    formData.append("width", width.toString());
    
    if (files.headerLight) formData.append("headerLight", files.headerLight);
    if (files.headerDark) formData.append("headerDark", files.headerDark);
    if (files.footerLight) formData.append("footerLight", files.footerLight);
    if (files.footerDark) formData.append("footerDark", files.footerDark);
    if (files.favicon) formData.append("favicon", files.favicon);

    if (removals?.removeHeaderLight) formData.append("removeHeaderLight", "true");
    if (removals?.removeHeaderDark) formData.append("removeHeaderDark", "true");
    if (removals?.removeFooterLight) formData.append("removeFooterLight", "true");
    if (removals?.removeFooterDark) formData.append("removeFooterDark", "true");
    if (removals?.removeFavicon) formData.append("removeFavicon", "true");

    if (colors) {
      formData.append("colors", JSON.stringify(colors));
    }

    const headers = getHeaders().headers;
    const response = await axios.put(`${API_URL}/tenants/current/branding`, formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
