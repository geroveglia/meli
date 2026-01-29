import axios from "axios";
import { useAuthStore } from "../stores/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export interface CarouselImage {
  _id: string;
  title?: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

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

export const carouselService = {
  getAll: async (): Promise<CarouselImage[]> => {
    const response = await axios.get(`${API_URL}/carousel-images`, getHeaders());
    return response.data;
  },

  upload: async (file: File, title?: string, order?: number): Promise<CarouselImage> => {
    const formData = new FormData();
    formData.append("image", file);
    if (title) formData.append("title", title);
    if (order !== undefined) formData.append("order", order.toString());

    const response = await axios.post(`${API_URL}/carousel-images`, formData, {
      ...getHeaders(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/carousel-images/${id}`, getHeaders());
  },

  update: async (id: string, data: Partial<CarouselImage>, file?: File): Promise<CarouselImage> => {
    // Si hay archivo, usar FormData
    if (file) {
        const formData = new FormData();
        formData.append("image", file);
        if (data.title !== undefined) formData.append("title", data.title);
        if (data.order !== undefined) formData.append("order", data.order.toString());
        if (data.isActive !== undefined) formData.append("isActive", String(data.isActive));

        const response = await axios.patch(`${API_URL}/carousel-images/${id}`, formData, {
           ...getHeaders(),
        });
        return response.data;

    } else {
        // Fallback a JSON si no hay archivo (aunque el backend ahora espera multipart igual va a funcionar si el backend lo cambiamos para soportar JSON tambien?
        // El backend lo cambiamos para usar upload.single. Multer a veces molesta con JSON puro si espera multipart.
        // Pero express puede manejarlo si configuramos bien.
        // Sin embargo, para consistencia y dado que puse upload.single, es mejor mandar multipart siempre o manejar ambos casos.
        // Mi codigo de backend intenta leer req.body. title.
        // Si uso axios.patch con objeto JSON, req.body tendrá los datos (si express.json() corre antes).
        // PERO en server.ts excluí /carousel-images de express.json()!
        // Entonces DEBO mandar FormData siempre o arreglar el server.ts.
        // Mejor mando FormData siempre para este endpoint.

        const formData = new FormData();
        if (data.title !== undefined) formData.append("title", data.title);
        if (data.order !== undefined) formData.append("order", data.order.toString());
        if (data.isActive !== undefined) formData.append("isActive", String(data.isActive));

        const response = await axios.patch(`${API_URL}/carousel-images/${id}`, formData, {
            ...getHeaders(),
        });
        return response.data;
    }
  },
};
