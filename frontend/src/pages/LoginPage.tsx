import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
// import { GoogleLogin } from "@react-oauth/google";



import { useAuthStore } from "../stores/authStore";
// import { useThemeStore } from "../stores/themeStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagicWandSparkles, faCheckCircle, faTimesCircle, faEye, faEyeSlash, faBuilding, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

// ===== Validación =====
const loginWithClientSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  tenantSlug: z.string().optional(),
  cuentaId: z.string().optional(),
});
type LoginForm = z.infer<typeof loginWithClientSchema>;

interface CuentaOption {
  _id: string;
  name: string;
  slug?: string;
}

interface TenantOption {
  _id: string;
  name: string;
  slug: string;
}
interface DemoUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: {
    _id: string;
    name: string;
    description?: string;
  }[];
  isActive: boolean;
  tenant?: {
    _id: string;
    name: string;
    slug: string;
  };
  area?: {
    _id: string;
    name: string;
  };
}

// ===== Página de Login =====
export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  // const { theme, toggleTheme } = useThemeStore(); // Theme toggle removed
  const [isLoading, setIsLoading] = useState(false);
  const [, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [lastErrorObj, setLastErrorObj] = useState<any>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [availableCuentas, setAvailableCuentas] = useState<CuentaOption[]>([]);
  const [showCuentaSelector, setShowCuentaSelector] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginWithClientSchema),
    defaultValues: {
      // ← No precargar credenciales
      email: "",
      password: "",
      tenantSlug: "",
      cuentaId: "",
    },
  });

  const watchedEmail = watch("email");

  // Cargar usuarios demo al montar el componente
  useEffect(() => {
    fetchDemoUsers();
  }, []);

  // Verificar clientes disponibles cuando cambia el email
  useEffect(() => {
    if (watchedEmail && watchedEmail.includes("@")) {
      checkCuentasForEmail(watchedEmail);
    } else {
      setAvailableCuentas([]);
      setShowCuentaSelector(false);
    }
  }, [watchedEmail]);

  const fetchDemoUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/demo-users`);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const allUsers = usersData.users || [];
        console.log("📋 Usuarios cargados desde todos los tenants:", allUsers.length);
        setDemoUsers(allUsers);
      } else {
        console.warn("Error al cargar usuarios desde la DB");
        setDemoUsers([]);
      }
    } catch (error) {
      console.error("No se pudieron cargar los usuarios demo:", error);
      setDemoUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const extractApiError = (err: any): string => {
    const isProduction = import.meta.env.PROD;

    if (err?.isAxiosError) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || "";

      if (isProduction) {
        if (status === 401 || status === 403) {
          return "Correo electrónico o contraseña incorrectos";
        }
        if (status === 404) {
          return "Usuario no encontrado";
        }
        if (status === 500 || status === 503) {
          return "El servidor no está disponible. Intenta nuevamente en unos momentos";
        }
        if (!status) {
          return "No se pudo conectar con el servidor";
        }
        return "Ocurrió un error al iniciar sesión. Verifica tus credenciales";
      }
      return `[${status ?? "ERR"}] ${msg}`;
    }

    if (err?.__api) {
      const status = err.status ?? "ERR";
      const msg = err.data?.message || err.message || "";

      if (isProduction) {
        if (status === 401 || status === 403) {
          return "Correo electrónico o contraseña incorrectos";
        }
        if (status === 404) {
          return "Usuario no encontrado";
        }
        return "Error de autenticación. Verifica tus credenciales";
      }

      return `[${status}] ${msg}`;
    }

    if (err instanceof TypeError && /fetch/i.test(String(err))) {
      if (isProduction) {
        return "No se pudo conectar con el servidor. Verifica tu conexión a internet";
      }
      return "Network error (¿CORS? ¿URL del API correcta? ¿Servidor caído?)";
    }

    if (isProduction) {
      return "Ocurrió un error inesperado. Por favor, intenta nuevamente";
    }

    return err?.message || "Unexpected error";
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError("");
    setLastErrorObj(null);
    try {
      const result = await login(data.email, data.password, data.tenantSlug, data.cuentaId);

      if (result?.requires2FA && result?.email) {
        setTwoFactorEmail(result.email);
        setStep('2fa');
        setIsLoading(false);
        return;
      }

      if (result?.requiresTenantSelection && result.tenants) {
        setAvailableTenants(result.tenants);
        setShowTenantSelector(true);
        setError("Este email existe en múltiples tenants. Por favor selecciona uno.");
        setIsLoading(false);
        return;
      }

      // === Redirección para Superadmin ===
      const isSuperAdmin = result?.user?.primaryRole?.toLowerCase() === "superadmin" || result?.user?.roles?.some((r) => r.toLowerCase() === "superadmin");

      if (isSuperAdmin) {
        navigate("/admin/dashboard");
        return;
      }

      // === Redirección automática ===
      // Si el backend envía redirectTo, usar ese valor
      if (result?.redirectTo) {
        navigate(result.redirectTo);
        return;
      }

      // === Redirección según permisos ===
      // Verificar permisos en orden de prioridad
      const { hasPermission } = useAuthStore.getState();

      const routes = [
        // Lumba Connect override for now
        { permission: "dashboard:view", path: "/ventas" }, // Redirect dashboard access to ventas for Lumba
        
        { permission: "dashboard:view", path: "/admin/dashboard" },
        { permission: "clients:view", path: "/admin/clients" },
        { permission: "tenants:view", path: "/admin/tenants" },
        { permission: "levels:view", path: "/admin/levels" },
        { permission: "positions:view", path: "/admin/positions" },
        { permission: "areas:view", path: "/admin/areas" },
        { permission: "users:view", path: "/admin/users" },
        { permission: "roles:view", path: "/admin/roles" },
      ];

      for (const route of routes) {
        if (hasPermission(route.permission)) {
          navigate(route.path);
          return;
        }
      }

      // Fallback por defecto si no tiene ningún permiso específico o solo tiene acceso básico
      navigate("/admin/dashboard");
    } catch (err: any) {
      console.error("[login:error]", err);
      setLastErrorObj(err);
      const msg = extractApiError(err);
      setError(msg || t("auth.invalidCredentials"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError("Por favor ingresa un código de 6 dígitos válido.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await useAuthStore.getState().verify2FA(twoFactorEmail, twoFactorCode);

      // Same routing logic from standard login
      const isSuperAdmin = result?.user?.primaryRole?.toLowerCase() === "superadmin" || result?.user?.roles?.some((r) => r.toLowerCase() === "superadmin");
      if (isSuperAdmin) {
        navigate("/admin/dashboard");
        return;
      }

      if (result?.redirectTo) {
        navigate(result.redirectTo);
        return;
      }

      const { hasPermission } = useAuthStore.getState();
      const routes = [
        { permission: "dashboard:view", path: "/ventas" },
        { permission: "dashboard:view", path: "/admin/dashboard" },
        { permission: "clients:view", path: "/admin/clients" },
        { permission: "tenants:view", path: "/admin/tenants" },
        { permission: "levels:view", path: "/admin/levels" },
        { permission: "positions:view", path: "/admin/positions" },
        { permission: "areas:view", path: "/admin/areas" },
        { permission: "users:view", path: "/admin/users" },
        { permission: "roles:view", path: "/admin/roles" },
      ];

      for (const route of routes) {
        if (hasPermission(route.permission)) {
          navigate(route.path);
          return;
        }
      }

      navigate("/admin/dashboard");
    } catch (err: any) {
      console.error("[verify2FA:error]", err);
      setError(err.message || "Código de verificación inválido o expirado");
    } finally {
      setIsLoading(false);
    }
  };

  const autofill = (user: DemoUser) => {
    setValue("email", user.email, { shouldValidate: true });

    // Establecer el tenant del usuario seleccionado
    if (user.tenant?.slug) {
      setValue("tenantSlug", user.tenant.slug, { shouldValidate: true });
    }

    const demoPasswords: Record<string, string> = {
      "superadmin@example.com": "superadmin123",
      "admin@example.com": "admin123",
      "manager@example.com": "manager123",
      "user@example.com": "user123",
      "cliente@example.com": "changeme",
      "coordinador@mobile.com": "coordinador-123",
      "colaborador@mobile.com": "colaborador123",
      "coordinador2@mobile.com": "coordinador-123",
      "colaborador2@mobile.com": "colaborador123",
    };
    const password = demoPasswords[user.email] || "tenant123";
    setValue("password", password, { shouldValidate: true });
  };

  const checkCuentasForEmail = async (_email: string) => {
    // Esta función ahora no se usa, se maneja en el login
  };

  return (
    <div className="min-h-screen bg-[#ebebeb] flex items-center justify-center p-4">
      {/* Controles globales */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {/* <button onClick={handleLanguageToggle} className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 shadow-md hover:shadow-lg transition-all duration-200" title="Toggle Language">
            <FontAwesomeIcon icon={faGlobe} className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
          </button> */}
{/* Toggle Theme button removed */}
        </div>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl p-8 animate-slide-up border border-gray-200">
          <div className="text-center mb-4">
            <div className="flex justify-center items-center">
              <img src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.22.8/mercadolibre/logo__large_plus.png" alt="Mercado Libre" className="h-[34px] mb-2" />
            </div>
            <div>
              <p className="text-accent-8">{t("auth.loginSubtitle")}</p>
            </div>
          </div>

          {step === 'login' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Tenant Selector - solo cuando hay múltiples tenants */}
            {showTenantSelector && availableTenants.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-accent-1 mb-2">
                  <FontAwesomeIcon icon={faBuilding} className="h-4 w-4 mr-2" />
                  Selecciona tu organización
                </label>
                <select
                  {...register("tenantSlug")}
                  className="input-base"
                  required
                  onChange={(e) => {
                    setValue("tenantSlug", e.target.value);
                    setShowTenantSelector(false);
                  }}
                >
                  <option value="">Seleccionar organización...</option>
                  {availableTenants.map((tenant) => (
                    <option key={tenant._id} value={tenant.slug}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-accent-1 mb-2">{t("auth.email")}</label>
              <input {...register("email")} type="email" className="input-base" placeholder="admin@example.com" autoComplete="username" />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-accent-1 mb-2">{t("auth.password")}</label>
              <div className="relative">
                <input {...register("password")} type={showPassword ? "text" : "password"} className="input-base pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-800 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>

                {/* Solo en desarrollo: ver objeto de error completo */}
                {import.meta.env.DEV && lastErrorObj && (
                  <details className="mt-2 rounded border border-red-500 p-2 text-red-200">
                    <summary className="cursor-pointer text-xs text-red-200">Detalles del error (solo dev)</summary>
                    <pre className="mt-2 max-h-56 overflow-auto text-[10px] leading-4">{JSON.stringify(lastErrorObj, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}

            {/* Cuenta Selector */}
            {showCuentaSelector && availableCuentas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-accent-1 mb-2">
                  <FontAwesomeIcon icon={faBuilding} className="h-4 w-4 mr-2" />
                  Cuenta
                </label>
                <select {...register("cuentaId")} className="input-base" required={availableCuentas.length > 1}>
                  {availableCuentas.length > 1 && <option value="">Seleccionar cuenta...</option>}
                  {availableCuentas.map((cuenta) => (
                    <option key={cuenta._id} value={cuenta._id}>
                      {cuenta.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-4">
                <button type="submit" disabled={isLoading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? t("common.loading") : t("auth.signIn")}
                </button>

                {/* 
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-neutral-800 px-2 text-gray-500">O continuar con</span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={async (credentialResponse) => {
                            if (credentialResponse.credential) {
                                try {
                                    setIsLoading(true);
                                    // Use the store action
                                    const result = await useAuthStore.getState().loginWithGoogle(credentialResponse.credential);
                                    
                                    if (result?.requiresTenantSelection && result.tenants) {
                                        setAvailableTenants(result.tenants);
                                        setShowTenantSelector(true);
                                        setError("Este email existe en múltiples tenants. Por favor selecciona uno.");
                                        setIsLoading(false);
                                        return;
                                    }

                                    // Same redirect logic as onSubmit
                                     // === Redirección para Superadmin ===
                                    const isSuperAdmin = result?.user?.primaryRole?.toLowerCase() === "superadmin" || result?.user?.roles?.some((r) => r.toLowerCase() === "superadmin");

                                    if (isSuperAdmin) {
                                        navigate("/admin/dashboard");
                                        return;
                                    }

                                    // === Redirección automática ===
                                    if (result?.redirectTo) {
                                        navigate(result.redirectTo);
                                        return;
                                    }

                                    // === Redirección según permisos ===
                                    const { hasPermission } = useAuthStore.getState();
                                    const routes = [
                                        { permission: "dashboard:view", path: "/ventas" },
                                        { permission: "dashboard:view", path: "/admin/dashboard" },
                                        { permission: "clients:view", path: "/admin/clients" },
                                        { permission: "tenants:view", path: "/admin/tenants" },
                                        { permission: "levels:view", path: "/admin/levels" },
                                        { permission: "positions:view", path: "/admin/positions" },
                                        { permission: "areas:view", path: "/admin/areas" },
                                        { permission: "users:view", path: "/admin/users" },
                                        { permission: "roles:view", path: "/admin/roles" },
                                    ];

                                    for (const route of routes) {
                                        if (hasPermission(route.permission)) {
                                        navigate(route.path);
                                        return;
                                        }
                                    }
                                    navigate("/admin/dashboard");

                                } catch (err: any) {
                                    console.error("Google login error", err);
                                    setError(err.message || "Error starting Google session");
                                    setIsLoading(false);
                                }
                            }
                        }}
                        onError={() => {
                            setError("Error initiating Google login");
                        }}
                        useOneTap
                        shape="circle"
                        theme="outline" 
                    />
                </div>
                */}
            </div>
          </form>
          )}

          {step === '2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-6" autoComplete="off">
              <div>
                <label className="block text-sm font-medium text-accent-1 mb-2">Código de Verificación</label>
                <input 
                  type="text" 
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.trim())}
                  className="input-base text-center text-xl tracking-widest font-mono" 
                  placeholder="000000" 
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Hemos enviado un código de 6 dígitos a <span className="font-semibold">{twoFactorEmail}</span>.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-800 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button type="submit" disabled={isLoading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? t("common.loading") : "Verificar Código"}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setStep('login');
                    setError('');
                    setTwoFactorCode('');
                  }} 
                  disabled={isLoading} 
                  className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}

          {/* --- Usuarios disponibles --- */}
          {/* 
          <div className="mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="font-medium text-accent-1 hover:underline transition-colors">
                Crear cuenta
              </Link>
            </p>
          </div>
          */}

          {/* Solo mostrar usuarios disponibles en modo development */}
          {import.meta.env.DEV && demoUsers.length > 0 && (
            <div className="mt-4">
              <details className="rounded-lg border border-accent-4 bg-accent-3">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-accent-1">Usuarios disponibles ({demoUsers.length})</summary>
                <div className="p-4 space-y-3">
                  {demoUsers.map((user) => (
                    <div key={user._id} className="flex items-center justify-between gap-3 rounded-lg bg-accent-2 border border-accent-4 p-3">
                      <div className="flex-1">
                        {/* Tenant Badge - destacado arriba */}
                        {user.tenant && (
                          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-3 text-accent-1 border border-accent-4">
                            <FontAwesomeIcon icon={faBuilding} className="h-3 w-3" />
                            {user.tenant.name}
                          </div>
                        )}
                        <div className="text-sm font-semibold text-accent-1">{user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.email.split("@")[0]}</div>
                        <div className="text-xs text-accent-7">Email: {user.email}</div>
                        <div className="text-xs text-accent-7">Roles: {user.roles.map((r) => r.name).join(", ") || "Sin roles"}</div>
                        {user.area && (
                          <div className="text-xs text-accent-7 flex items-center gap-1">
                            <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
                            Area: {user.area.name}
                          </div>
                        )}
                        <div className="text-xs text-accent-7 flex items-center gap-1">
                          Estado:
                          {user.isActive ? <FontAwesomeIcon icon={faCheckCircle} className="text-accent-9 dark:text-accent-1" /> : <FontAwesomeIcon icon={faTimesCircle} className="text-accent-6" />}
                        </div>
                      </div>
                      <button type="button" onClick={() => autofill(user)} disabled={!user.isActive} className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                        <FontAwesomeIcon icon={faMagicWandSparkles} className="h-4 w-4" />
                        Usar
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
