// apps/web/src/App.tsx
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useThemeStore } from "./stores/themeStore";
import { useBrandingStore } from "./stores/brandingStore";
import { applyTheme } from "./utils/themeUtils";

import { Home } from "./pages/Home";
import { ComponentsLab } from "./pages/ComponentsLab";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

import { RolesPage } from "./pages/admin/RolesPage";
import { PositionsPage } from "./pages/admin/PositionsPage";
import { LevelsPage } from "./pages/admin/LevelsPage";
import { AreasPage } from "./pages/admin/AreasPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { ClientsPage } from "./pages/admin/ClientsPage";
import { ClientInfoPage } from "./pages/admin/ClientInfoPage";
import { ProjectsPage } from "./pages/admin/ProjectsPage";
import { CarouselImagesPage } from "./pages/admin/CarouselImagesPage";
import { TenantsPage } from "./pages/admin/TenantsPage";
import { GeneralSettingsPage } from "./pages/admin/GeneralSettingsPage";

import { SeoSettingsPage } from "./pages/admin/SeoSettingsPage";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { MobileNavbar } from "./components/Navbar";
import { PublicNavbar } from "./components/PublicNavbar";
import { ServerStatusCard } from "./components/ServerStatusCard";

// --- Layout público (sin Navbar) ---
const PublicLayout: React.FC = () => {
  const location = useLocation();
  const hideNavbarRoutes = ["/login", "/register"];

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && <PublicNavbar />}
      <Outlet />
    </>
  );
};

// --- Layout principal que incluye el MobileNavbar ---
// Esto se aplica a TODAS las rutas protegidas/autenticadas
const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      {isAuthenticated && <MobileNavbar />}
      <Outlet />
    </>
  );
};

function App() {
  const { isAuthenticated, token, user } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    console.log("=== APP STARTUP ===");
    console.log("🌍 VITE_API_URL:", import.meta.env.VITE_API_URL);
    console.log("🌍 MODE:", import.meta.env.MODE);
    console.log("🌍 DEV:", import.meta.env.DEV);
    console.log("🌍 PROD:", import.meta.env.PROD);
    console.log("==================");
  }, []);

  // Restaurar sesión si hay token
  useEffect(() => {
    if (token && user && !isAuthenticated) {
      useAuthStore.setState({ isAuthenticated: true });
    } else if (token && !user) {
      const checkTokenValidity = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/secure/ping`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Tenant-Id": localStorage.getItem("tenantId") || "demo-tenant",
            },
          });

          if (!response.ok) {
            useAuthStore.getState().logout();
          } else {
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
              try {
                const userData = JSON.parse(savedUser);
                useAuthStore.setState({ user: userData, isAuthenticated: true });
              } catch {
                useAuthStore.getState().logout();
              }
            }
          }
        } catch {
          useAuthStore.getState().logout();
        }
      };
      checkTokenValidity();
    }
  }, [token, user, isAuthenticated]);

  // Sincronizar tema
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove("light", "dark");
    body.classList.remove("light", "dark");
    root.classList.add(theme);
    body.classList.add(theme);
    root.setAttribute("data-theme", theme);
  }, [theme]);

  // Sincronizar Favicon y cargar Branding
  const { branding, fetchBranding } = useBrandingStore();

  useEffect(() => {
    fetchBranding();
  }, []);

  useEffect(() => {
    const updateFavicon = (url: string) => {
      // Remove existing favicons
      const existingLinks = document.querySelectorAll("link[rel*='icon']");
      existingLinks.forEach((link) => link.remove());

      // Create new favicon
      const link = document.createElement("link");
      link.type = "image/x-icon";
      link.rel = "shortcut icon";
      link.href = url;
      document.getElementsByTagName("head")[0].appendChild(link);
    };

    if (branding?.logo?.favicon) {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
      const baseUrl = apiUrl.replace("/api/v1", "");
      const faviconUrl = branding.logo.favicon.startsWith("http") ? branding.logo.favicon : `${baseUrl}${branding.logo.favicon}`;

      updateFavicon(faviconUrl);
    } else {
      // Reset to default
      updateFavicon("/vite.svg");
    }

    // Apply colors
    applyTheme(theme, branding);
  }, [branding, theme]);

  return (
    <div className={theme}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Router>
          <Routes>
            {/* Rutas públicas (SIN Navbar) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/components" element={<ComponentsLab />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<SignupPage />} />
            </Route>

            {/* Rutas protegidas (CON MobileNavbar) - Prefijo /admin */}
            <Route path="/admin" element={<AppLayout />}>
              {/* Dashboard */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                index
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="roles"
                element={
                  <ProtectedRoute>
                    <RolesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="positions"
                element={
                  <ProtectedRoute>
                    <PositionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="levels"
                element={
                  <ProtectedRoute>
                    <LevelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="areas"
                element={
                  <ProtectedRoute>
                    <AreasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clients"
                element={
                  <ProtectedRoute>
                    <ClientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants"
                element={
                  <ProtectedRoute>
                    <TenantsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="carousel-images"
                element={
                  <ProtectedRoute>
                    <CarouselImagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="general"
                element={
                  <ProtectedRoute>
                    <GeneralSettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="seo"
                element={
                  <ProtectedRoute>
                    <SeoSettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Client Routes (Root Level) */}
            <Route element={<AppLayout />}>
              <Route
                path="/client-info"
                element={
                  <ProtectedRoute>
                    <ClientInfoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-projects"
                element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>

          <ServerStatusCard />
        </Router>
      </div>
    </div>
  );
}

export default App;
