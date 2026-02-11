
import axios from "../api/axiosConfig";

export interface MeliConnectionStatus {
    isConnected: boolean;
    sellerId?: number;
    nickname?: string;
    expiresAt?: string;
}

export const meliService = {
    async getAuthUrl(): Promise<string> {
        const response = await axios.get<{ url: string }>("/meli/auth");
        return response.data.url;
    },

    async disconnect(): Promise<void> {
        await axios.post('/meli/disconnect');
    },

    async getConnectionStatus(): Promise<MeliConnectionStatus> {
        // We can get this info from the current tenant
        const response = await axios.get("/tenants/current");
        const tenant = response.data;
        
        if (tenant.mercadolibre && tenant.mercadolibre.accessToken) {
            return {
                isConnected: true,
                sellerId: tenant.mercadolibre.sellerId,
                nickname: tenant.mercadolibre.nickname,
                expiresAt: tenant.mercadolibre.expiresAt
            };
        }
        
        return { isConnected: false };
    },
    

};
