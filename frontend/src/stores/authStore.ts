import { create } from "zustand";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  primaryRole?: string | null; // Nombre del rol principal (primer rol del array)
  cuentaIds?: string[];
  cuentaId?: string;
  permissions?: string[];
  tenantId: string;
  tenantSlug?: string;
}

interface Tenant {
  _id: string;
  name: string;
  slug: string;
  id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tenantId: string;
  isAuthenticated: boolean;
  registerTenant: (data: {
    companyName: string;
    slug: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<{ token: string; user: User; tenant: Tenant }>;
  loginWithGoogle: (token: string) => Promise<{ requiresTenantSelection?: boolean; tenants?: Tenant[]; redirectTo?: string; user?: User; requires2FA?: boolean; email?: string }>;
  login: (email: string, password: string, tenantSlug?: string, cuentaId?: string) => Promise<{ requiresTenantSelection?: boolean; tenants?: Tenant[]; redirectTo?: string; user?: User; requires2FA?: boolean; email?: string }>;
  verify2FA: (email: string, code: string) => Promise<{ redirectTo?: string; user?: User }>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  checkTenants: (email: string) => Promise<Tenant[]>;
  logout: () => void;
  setTenantId: (tenantId: string) => void;
  hasPermission: (permission: string) => boolean;
  getPrimaryRole: () => string | null;
}

function normalizeBaseUrl(raw?: string): string {
  const base = (raw && raw.trim()) || "/api/v1";
  // evitar dobles barras al concatenar endpoints
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function parseResponseSafely(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem("token"),
  tenantId: localStorage.getItem("tenantId") || "demo-tenant",
  isAuthenticated: (() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    console.log("Auth store init - token:", !!token, "user:", !!user);
    return !!(token && user);
  })(),

  async checkTenants(email) {
    const base = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const url = `${base}/auth/check-tenants`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await parseResponseSafely(res);

      if (!res.ok) {
        return [];
      }

      return data?.tenants || [];
    } catch (error) {
      console.error("Error checking tenants:", error);
      return [];
    }
  },

  async registerTenant(registerData) {
    const base = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const url = `${base}/auth/register-tenant`;

    let data: any = null;
    let res: Response | null = null;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      data = await parseResponseSafely(res);

      if (!res.ok) {
         const err = {
          __api: true,
          status: res.status,
          statusText: res.statusText,
          url,
          method: "POST",
          data,
          message: (data && (data.message || data.error || data.msg)) || `HTTP ${res.status}`,
        };
        throw err;
      }

      const token = data?.token;
      const user = data?.user as User | undefined;
      const tenant = data?.tenant as Tenant | undefined;
      
      if (!token || !user || !tenant) {
         throw new Error("Invalid response from server");
      }

      // Auto-login
      localStorage.setItem("token", token);
      localStorage.setItem("tenantId", tenant.id || tenant._id);
      localStorage.setItem("tenantSlug", tenant.slug);
      localStorage.setItem("user", JSON.stringify(user));

      set({
        token,
        tenantId: tenant.id || tenant._id,
        isAuthenticated: true,
        user,
      });

      return { token, user, tenant };
    } catch (error: any) {
        if (error?.__api) {
            throw error;
        }
        throw {
            __api: true,
            status: res?.status ?? "ERR",
            url,
            method: "POST",
            data,
            message: error?.message || "Network error",
        };
    }
  },

  async loginWithGoogle(token: string) {
    const base = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const url = `${base}/auth/google`;

    let data: any = null;
    let res: Response | null = null;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
        });

        data = await parseResponseSafely(res);

         // Si hay múltiples tenants, devolver info para selección
        if (res.status === 300 && data?.requiresTenantSelection) {
            return {
            requiresTenantSelection: true,
            tenants: data.tenants || [],
            };
        }

        if (!res.ok) {
            throw {
                __api: true,
                status: res.status,
                message: data?.error || "Error initiating Google login",
            };
        }
        
        // Éxito
        const authToken = data?.token;
        const user = data?.user as User | undefined;
        const redirectTo = data?.redirectTo;

        if (!authToken) throw new Error("No token received");

        localStorage.setItem("token", authToken);
        localStorage.setItem("tenantId", user?.tenantId || "");
        if (user?.tenantSlug) {
            localStorage.setItem("tenantSlug", user.tenantSlug);
        }
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        }
        
        set({
            token: authToken,
            tenantId: user?.tenantId || "",
            isAuthenticated: true,
            user: user || null,
        });

        return { redirectTo, user };

    } catch (error: any) {
        if (error?.__api) throw error;
        throw { message: error?.message || "Network error" };
    }
  },

  async login(email, password, tenantSlug, cuentaId) {
    const base = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const url = `${base}/auth/login`;

    let data: any = null;
    let res: Response | null = null;

    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          ...(tenantSlug ? { tenantSlug } : {}),
          ...(cuentaId ? { clientId: cuentaId } : {}),
        }),
      });

      data = await parseResponseSafely(res);

      // Si hay múltiples tenants, devolver info para selección
      if (res.status === 300 && data?.requiresTenantSelection) {
        return {
          requiresTenantSelection: true,
          tenants: data.tenants || [],
        };
      }

      if (!res.ok) {
        const err = {
          __api: true,
          status: res.status,
          statusText: res.statusText,
          url,
          method: "POST",
          data,
          message: (data && (data.message || data.error || data.msg)) || `HTTP ${res.status}`,
        };
        throw err;
      }

      // 2FA Handle
      if (data?.requires2FA) {
        return {
          requires2FA: true,
          email: data.email,
        };
      }

      // Éxito Normal
      const token = data?.token;
      const user = data?.user as User | undefined;
      const redirectTo = data?.redirectTo;

      if (!token) {
        const err = {
          __api: true,
          status: 500,
          url,
          method: "POST",
          data,
          message: "Missing token in response",
        };
        throw err;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("tenantId", user?.tenantId || "");
      if (user?.tenantSlug) {
        localStorage.setItem("tenantSlug", user.tenantSlug);
      }
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }
      set({
        token,
        tenantId: user?.tenantId || "",
        isAuthenticated: true,
        user: user || null,
      });

      return { redirectTo, user };
    } catch (error: any) {
      // Propagamos un error estructurado para que el componente lo muestre bien
      if (error?.__api) {
        throw error;
      }
      // Network / CORS / fetch TypeError
      throw {
        __api: true,
        status: res?.status ?? "ERR",
        url,
        method: "POST",
        data,
        message: error?.message || "Network error (¿CORS? ¿URL del API correcta? ¿Servidor caído?)",
      };
    }
  },

  async verify2FA(email: string, code: string) {
    const base = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const url = `${base}/auth/verify-2fa`;
    let data: any = null;
    let res: Response | null = null;
    
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      data = await parseResponseSafely(res);

      if (!res.ok) {
        throw {
          __api: true,
          status: res.status,
          message: data?.error || data?.message || "Invalid verification code"
        };
      }

      const token = data?.token;
      const user = data?.user as User | undefined;
      const redirectTo = data?.redirectTo;

      if (!token || !user) {
        throw new Error("Invalid response from verification");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("tenantId", user?.tenantId || "");
      if (user?.tenantSlug) {
        localStorage.setItem("tenantSlug", user.tenantSlug);
      }
      localStorage.setItem("user", JSON.stringify(user));
      
      set({
        token,
        tenantId: user?.tenantId || "",
        isAuthenticated: true,
        user: user || null,
      });

      return { redirectTo, user };
    } catch (error: any) {
      if (error?.__api) throw error;
      throw { message: error?.message || "Network error" };
    }
  },

  async forgotPassword(email: string) {
    const base = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const url = `${base}/auth/forgot-password`;
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await parseResponseSafely(res);

      if (!res.ok) {
        throw {
          __api: true,
          status: res.status,
          message: data?.error || data?.message || "Error al solicitar recuperación de contraseña"
        };
      }

      return data?.message || "Enlace enviado";
    } catch (error: any) {
      if (error?.__api) throw error;
      throw { message: error?.message || "Network error" };
    }
  },

  async resetPassword(token: string, newPassword: string) {
    const base = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const url = `${base}/auth/reset-password`;
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await parseResponseSafely(res);

      if (!res.ok) {
        throw {
          __api: true,
          status: res.status,
          message: data?.error || data?.message || "Error al restablecer contraseña"
        };
      }
    } catch (error: any) {
      if (error?.__api) throw error;
      throw { message: error?.message || "Network error" };
    }
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("user");
    localStorage.removeItem("tenantSlug");
    set({ user: null, token: null, isAuthenticated: false });
  },

  setTenantId(tenantId: string) {
    localStorage.setItem("tenantId", tenantId);
    set({ tenantId });
  },

  hasPermission(permission: string): boolean {
    const { user } = get();
    if (!user) return false;

    // SuperAdmin siempre tiene acceso total
    if (user.primaryRole?.toLowerCase() === "superadmin") {
      return true;
    }

    // Admin tiene acceso total excepto a tenants (solo superadmin)
    if (user.primaryRole?.toLowerCase() === "admin") {
      const [module] = permission.split(":");
      // Admin NO puede acceder a tenants
      if (module === "tenants") {
        return false;
      }
      return true;
    }

    // Verificar permisos del usuario
    const permissions = user.permissions || [];
    const [module, action] = permission.split(":");

    // Sistema simplificado: module:view otorga acceso completo por defecto
    const hasViewPermission = permissions.includes(`${module}:view`);
    const hasWildcard = permissions.includes("*") || permissions.includes(`${module}:*`);
    const hasSpecificPermission = permissions.includes(permission);

    // Si tiene view, tiene acceso completo a menos que requiera permiso específico
    return hasWildcard || hasSpecificPermission || (action !== "view" && hasViewPermission);
  },

  getPrimaryRole(): string | null {
    const { user } = get();
    if (!user) return null;
    // Primero intentar usar primaryRole si existe
    if (user.primaryRole) return user.primaryRole;
    // Si no, usar el primer rol del array (ahora son nombres, no IDs)
    if (user.roles && user.roles.length > 0) return user.roles[0];
    return null;
  },
}));
