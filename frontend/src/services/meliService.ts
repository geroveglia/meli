
import axios from "../api/axiosConfig";

export interface MeliConnectionStatus {
    isConnected: boolean;
    sellerId?: number;
    nickname?: string;
    expiresAt?: string;
    appId?: string;
    clientSecret?: string;
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

    async configureCredentials(appId: string, clientSecret: string): Promise<void> {
        await axios.post('/meli/credentials', { appId, clientSecret });
    },

    async getConnectionStatus(): Promise<MeliConnectionStatus> {
        const selectedAccount = useLumbaStore.getState().selectedAccount;

        // prioritize specific account if selected
        if (selectedAccount && typeof selectedAccount === 'object' && 'id' in selectedAccount) {
             try {
                const response = await axios.get(`/cuentas/${selectedAccount.id}`);
                const cuenta = response.data.cuenta || response.data; // Handle both { cuenta: ... } and direct object
                
                if (cuenta.mercadolibre && (cuenta.mercadolibre.accessToken || cuenta.mercadolibre.sellerId)) {
                    return {
                        isConnected: true,
                        sellerId: cuenta.mercadolibre.sellerId,
                        nickname: cuenta.mercadolibre.nickname,
                        expiresAt: cuenta.mercadolibre.expiresAt
                    };
                }
             } catch (e) {
                 console.error("Error fetching account status", e);
             }
             return { isConnected: false };

        } else {
            // Default: Check current tenant
            try {
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
            } catch (e) {
                console.error("Error fetching tenant status", e);
            }
            
            // If selecting "Todas", we might want to return true if at least one account is connected,
            // or just let the orders show up regardless of this status flag.
            return { isConnected: selectedAccount === "Todas" }; 
        }
    },
};
