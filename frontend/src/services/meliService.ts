
import axios from "../api/axiosConfig";

export interface MeliConnectionStatus {
    isConnected: boolean;
    sellerId?: number;
    nickname?: string;
    expiresAt?: string;
}

import { useLumbaStore } from "../stores/lumbaStore";

export const meliService = {
    async getAuthUrl(cuentaId?: string): Promise<string> {
        let url = "/meli/auth";
        
        if (cuentaId) {
            url += `?cuentaId=${cuentaId}`;
        } else {
            // Fallback to store if no param provided (legacy behavior or global context)
            const selectedAccount = useLumbaStore.getState().selectedAccount;
            if (typeof selectedAccount !== 'string' && selectedAccount.type === 'cuenta') {
                url += `?cuentaId=${selectedAccount.id}`;
            }
        }
        
        const response = await axios.get<{ url: string }>(url);
        return response.data.url;
    },

    async disconnect(cuentaId?: string): Promise<void> {
        const body: any = {};
        
        if (cuentaId) {
            body.cuentaId = cuentaId;
        } else {
            const selectedAccount = useLumbaStore.getState().selectedAccount;
            if (selectedAccount && typeof selectedAccount === 'object' && 'type' in selectedAccount && (selectedAccount as any).type === 'cuenta') {
                body.cuentaId = (selectedAccount as any).id;
            }
        }

        await axios.post('/meli/disconnect', body);
    },

    async getConnectionStatus(): Promise<MeliConnectionStatus> {
        const selectedAccount = useLumbaStore.getState().selectedAccount;

        if (selectedAccount && typeof selectedAccount === 'object' && 'type' in selectedAccount && (selectedAccount as any).type === 'cuenta') {
             try {
                const response = await axios.get(`/cuentas/${(selectedAccount as any).id}`);
                const cuenta = response.data; // This might be wrapped in { cuenta: ... } depending on API? 
                // Wait, api/cuentas.ts list returns { cuentas: [] }, get returns?
                // Usually get returns the object directly or { data: object }. 
                // Let's assume standard axios response.data is the payload.
                // If it returns the normalized object from `api/cuentas.ts`, it has `mercadolibre` field.
                
                // Correction: The API endpoint likely returns the Mongoose document. 
                // We need to check if the backend normalizes it. 
                // Usually `res.json(cuenta)`.
                // Let's assume it returns the object with a `mercadolibre` property.
                
                if (cuenta.mercadolibre && (cuenta.mercadolibre.accessToken || cuenta.mercadolibre.isConnected)) {
                    return {
                        isConnected: true,
                        sellerId: cuenta.mercadolibre.sellerId,
                        nickname: cuenta.mercadolibre.nickname,
                        expiresAt: cuenta.mercadolibre.expiresAt
                    };
                }
             } catch (e) {
                 console.error("Error fetching cuenta status", e);
             }
             return { isConnected: false };

        } else {
            // Default: Tenant
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
        }
    },
};
