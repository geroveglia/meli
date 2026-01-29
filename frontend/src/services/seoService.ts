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

export interface SeoMetadata {
  _id?: string;
  entityType: string;
  entityId: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  noIndex?: boolean;
}

export const seoService = {
  getSeo: async (entityType: string, entityId: string): Promise<SeoMetadata> => {
    const { headers } = getHeaders();
    const response = await axios.get(`${API_URL}/seo/${entityType}/${entityId}`, { headers });
    return response.data;
  },

  updateSeo: async (data: SeoMetadata, file?: File): Promise<SeoMetadata> => {
    const { headers } = getHeaders();
    
    // Convert to FormData to support file upload
    const formData = new FormData();
    formData.append("entityType", data.entityType);
    formData.append("entityId", data.entityId);
    if (data.metaTitle) formData.append("metaTitle", data.metaTitle);
    if (data.metaDescription) formData.append("metaDescription", data.metaDescription);
    if (data.noIndex !== undefined) formData.append("noIndex", String(data.noIndex));
    
    // If file provided, append it
    if (file) {
      formData.append("ogImage", file);
    } else if (data.ogImageUrl) {
        // preserve existing URL or empty string
       formData.append("ogImageUrl", data.ogImageUrl);
    }

    const response = await axios.post(`${API_URL}/seo/update`, formData, { 
        headers: {
            ...headers,
            "Content-Type": "multipart/form-data",
        }
    });
    return response.data;
  },
};
