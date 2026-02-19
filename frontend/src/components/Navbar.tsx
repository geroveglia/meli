import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../stores/authStore";

import { useCuentaContextStore } from "../stores/cuentaContextStore";
import { useLumbaStore } from "../stores/lumbaStore";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faBars, faRightFromBracket, faHouse, faUserGear, faBuilding, faArrowUpRightFromSquare, faCog, faUser, faUserShield, faChevronDown, faUsersGear, faInfoCircle, faImages, faMoneyBillWave, faBell, faBook, faPlug } from "@fortawesome/free-solid-svg-icons";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

import axios from "../api/axiosConfig";
import { meliService } from "../services/meliService";
import { SettingsModal } from "./SettingsModal";
import CuentaSelector from "./CuentaSelector";
import { motion, AnimatePresence } from "framer-motion";

interface AdminCounts {
  cuentas: number;
  tenants: number;
  roles: number;
  users: number;
}

export const MobileNavbar: React.FC = () => {
  const { user, logout, hasPermission } = useAuthStore();
  const { notifications, setNotification } = useLumbaStore(); // Added notifications access

  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // New State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, setAdminAccordionOpen] = useState(true);
  const [isDocOpen, setIsDocOpen] = useState(false);

  // No renderizar el Navbar en rutas públicas
  const publicRoutes = ["/login", "/register", "/register-client"];
  if (publicRoutes.includes(location.pathname)) {
    return null;
  }

  // Notification Mapping
  const notificationMap: Record<string, { label: string; path: string }> = {
    // Logistica
    PENDIENTE_PREPARACION: { label: "Nuevos pedidos en preparación", path: "/logistica?status=PENDIENTE_PREPARACION" },
    LISTO_PARA_ENTREGAR: { label: "Pedidos listos para entregar", path: "/logistica?status=LISTO_PARA_ENTREGAR" },
    DESPACHADO_MELI: { label: "Pedidos despachados", path: "/logistica?status=DESPACHADO_MELI" },
    RETIRO_EN_LOCAL: { label: "Retiros en local", path: "/logistica?status=RETIRO_EN_LOCAL" },
    ENTREGADOS: { label: "Pedidos entregados", path: "/logistica?status=ENTREGADOS" },
    DESEMPAQUETAR: { label: "Pedidos para desempaquetar", path: "/logistica?status=DESEMPAQUETAR" },
    DEVOLUCION: { label: "Devoluciones", path: "/logistica?status=DEVOLUCION" },
    CANCELADOS: { label: "Pedidos cancelados", path: "/logistica?status=CANCELADOS" },
    // Ventas
    PENDIENTE_FACTURACION: { label: "Pendientes de facturación", path: "/ventas?status=PENDIENTE_FACTURACION" },
    FACTURADAS: { label: "Pedidos facturados", path: "/ventas?status=FACTURADAS" },
    VENTAS_CANCELADAS: { label: "Ventas canceladas", path: "/ventas?status=VENTAS_CANCELADAS" },
    NOTAS_DE_CREDITO: { label: "Notas de crédito generadas", path: "/ventas?status=NOTAS_DE_CREDITO" },
  };

  const activeNotifications = Object.keys(notifications || {}).filter((key) => notifications[key]);

  // Estado del acordeón persistente: "users" | "general" | null
  const [openAdminSection, setOpenAdminSection] = useState<string | null>(() => {
    return localStorage.getItem("adminOpenSection") || "general";
  });

  const toggleAdminSection = (section: "users" | "general" | "config" | "logistica" | "ventas" | "doc") => {
    const newVal = openAdminSection === section ? null : section;
    setOpenAdminSection(newVal);
    if (newVal) localStorage.setItem("adminOpenSection", newVal);
    else localStorage.removeItem("adminOpenSection");
  };
  const [adminCounts, setAdminCounts] = useState<AdminCounts>({
    cuentas: 0,
    tenants: 0,
    roles: 0,
    users: 0,
  });

  const creativeWinRef = useRef<Window | null>(null);

  useEffect(() => {
    const fetchAdminCounts = async () => {
      try {
        const promises: Array<Promise<any>> = [];

        if (hasPermission("tenants:view")) promises.push(axios.get("/tenants/count").catch(() => ({ data: { count: 0 } })));
        else promises.push(Promise.resolve({ data: { count: 0 } }));

        if (hasPermission("roles:view")) promises.push(axios.get("/roles/count").catch(() => ({ data: { count: 0 } })));
        else promises.push(Promise.resolve({ data: { count: 0 } }));

        if (hasPermission("users:view")) {
          promises.push(axios.get("/users/count").catch(() => ({ data: { count: 0 } })));
        } else {
          promises.push(Promise.resolve({ data: { count: 0 } }));
        }

        const [tenantsRes, rolesRes, usersRes] = await Promise.all(promises);

        setAdminCounts({
          cuentas: 0,
          tenants: tenantsRes?.data?.count || 0,
          roles: rolesRes?.data?.count || 0,
          users: usersRes?.data?.count || 0,
        });
      } catch (error) {
        console.error("Error fetching admin counts:", error);
      }
    };
    fetchAdminCounts();
  }, [hasPermission, user]);

  useEffect(() => {
    if (user?.tenantSlug === "superadmin") setAdminAccordionOpen(true);
  }, [user?.tenantSlug]);

  useEffect(() => {
    if (["/admin/dashboard", "/admin/tenants", "/admin/cuentas", "/perfil"].includes(location.pathname)) {
      setOpenAdminSection("general");
    } else if (["/logistica"].includes(location.pathname)) {
      setOpenAdminSection("logistica");
    } else if (["/ventas"].includes(location.pathname)) {
      setOpenAdminSection("ventas");
    } else if (["/admin/carousel-images", "/admin/general", "/admin/seo"].includes(location.pathname)) {
      setOpenAdminSection("general");
    } else if (location.pathname.startsWith("/admin/doc")) {
      setOpenAdminSection("general");
      setIsDocOpen(true);
    } else if (["/admin/roles", "/admin/users"].includes(location.pathname)) {
      setOpenAdminSection("users");
    }
  }, [location.pathname]);

  const userRoleNames = useMemo(() => {
    if (Array.isArray(user?.roles) && user.roles.length > 0) {
      if (typeof user.roles[0] === "string") return [...new Set(user.roles)];
      if (typeof user.roles[0] === "object" && user.roles[0] !== null) {
        const names = user.roles.map((r: any) => r.name || r).filter((n): n is string => typeof n === "string");
        return [...new Set(names)];
      }
    }
    return user?.primaryRole ? [user.primaryRole] : [];
  }, [user?.roles, user?.primaryRole]);

  const menuItems = useMemo(() => {
    const isSuperAdminTenant = user?.tenantSlug === "superadmin";

    const base: Array<{
      path: string;
      icon: any;
      label: string;
      external?: boolean;
      scope?: "global" | "cuenta";
      count?: number;
      dividerTop?: boolean;
      isCreativeSuite?: boolean;
      badge?: string;
      badgeColor?: string;
      disabled?: boolean;
    }> = [];

    if (isSuperAdminTenant) {
      base.push(
        {
          path: "/admin/dashboard",
          icon: faHouse,
          label: "Dashboard",
          scope: "global",
        },
        {
          path: "/admin/tenants",
          icon: faBuilding,
          label: "Tenants",
          scope: "global",
          count: adminCounts.tenants,
        },
        {
          path: "/admin/carousel-images",
          icon: faImages,
          label: "Carrusel",
          scope: "global",
        },
        {
          path: "/admin/general",
          icon: faCog,
          label: "Logo",
          scope: "global",
        },

        {
          path: "/admin/seo",
          icon: faSearch,
          label: "SEO",
          scope: "global",
        },
      );
    } else {
      // Dashboard siempre visible
      base.push({
        path: "/admin/dashboard",
        icon: faHouse,
        label: "Dashboard",
        scope: "global",
      });

      // --- LUMBA CONNECT ---
      base.push({
        path: "/ventas",
        icon: faUsersGear,
        label: "Lumba - Ventas",
        scope: "global",
        badge: "Nuevo",
        badgeColor: "bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100",
      });
      base.push({
        path: "/logistica",
        icon: faBuilding, // Using generic icon
        label: "Lumba - Logistica",
        scope: "global",
      });

      base.push({
        path: "/admin/carousel-images",
        icon: faImages,
        label: "Carrusel",
        scope: "global",
      });
      base.push({
        path: "/admin/general",
        icon: faCog,
        label: "Logo",
        scope: "global",
      });





      base.push({
        path: "/admin/seo",
        icon: faSearch,
        label: "SEO",
        scope: "global",
      });
      if (hasPermission("roles:view"))
        base.push({
          path: "/admin/roles",
          icon: faUserShield,
          label: "Roles",
          scope: "global",
          count: adminCounts.roles,
          badge: "",
          badgeColor: "bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100",
        });

      if (hasPermission("users:view"))
        base.push({
          path: "/admin/users",
          icon: faUserGear,
          label: "Usuarios",
          scope: "global",
          count: adminCounts.users,
          badge: "",
          badgeColor: "bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100",
        });
      if (hasPermission("cuentas:view"))
        base.push({
          path: "/admin/cuentas",
          icon: faBuilding,
          label: "Cuentas",
          scope: "global",
          badge: "",
          badgeColor: "bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100",
        });
    }

    return base;
  }, [hasPermission, adminCounts, user?.tenantSlug]);

  const handleMenuClick = (e: React.MouseEvent<HTMLAnchorElement>, item: any) => {
    if (item.external && item.label === "Creative Suite") {
      e.preventDefault();
      const url = item.path as string;
      const windowName = "creativeSuite";
      if (creativeWinRef.current && !creativeWinRef.current.closed) {
        creativeWinRef.current.focus();
      } else {
        creativeWinRef.current = window.open(url, windowName);
      }
    }
  };

  const RoleChips: React.FC<{ className?: string }> = ({ className = "text-[9px]" }) =>
    userRoleNames.length ? (
      <div className="flex flex-wrap gap-1">
        {userRoleNames.map((label) => (
          <div key={label} className={`flex text-transform: capitalize font-semibold items-center justify-center px-3 py-1 rounded-full ${className} text-xs bg-white text-black`}>
            <FontAwesomeIcon icon={faUserShield} className="h-3 w-3 mr-1.5" />
            {label}
          </div>
        ))}
      </div>
    ) : (
      <div className="mt-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${className} font-medium bg-white text-black uppercase`}>{user?.primaryRole ?? "user"}</span>
      </div>
    );

  const UserCard: React.FC = () => {
    const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.lastName || user?.email || "Usuario";
    return (
      <div>
        {user?.tenantSlug && (
          <div className="flex flex-col lg:flex-row gap-2 w-full lg:justify-between items-center lg:items-start lg:px-2">
            <div className="hidden lg:flex text-transform: capitalize font-semibold items-center justify-center px-3 py-1 rounded-full text-xs bg-white text-black" title={user.tenantSlug}>
              <FontAwesomeIcon icon={faBuilding} className="h-3 w-3 mr-1.5" />
              {user.tenantSlug}
            </div>
            <div className="flex text-transform: capitalize font-semibold items-center justify-center px-3 py-1 rounded-full text-xs bg-white text-black" title={displayName}>
              <FontAwesomeIcon icon={faUser} className="h-3 w-3 mr-1.5" /> {displayName}
            </div>
            <div className="hidden lg:block">
              <RoleChips />
            </div>
          </div>
        )}
      </div>
    );
  };

  const LogoutButton: React.FC<{
    onClick?: () => void;
    className?: string;
    logout: () => void;
  }> = ({ onClick, className = "", logout }) => (
    <button
      onClick={() => {
        logout();
        onClick?.();
      }}
      className={`flex items-center space-x-3 w-full py-3 rounded-lg text-accent-7 dark:text-accent-6 hover:text-accent-1 transition-colors ${className}`}
    >
      <FontAwesomeIcon icon={faRightFromBracket} className="h-5 w-5" />
      <span className="font-medium lg:hidden"></span>
    </button>
  );

  interface NavMenuProps {
    menuItems: any[];
    openAdminSection: string | null;
    toggleAdminSection: (section: "users" | "general" | "config" | "logistica" | "ventas" | "doc") => void;
    onItemClick?: () => void;
    handleMenuClick: (e: React.MouseEvent<HTMLAnchorElement>, item: any) => void;
    setIsSettingsOpen: (open: boolean) => void;
  }

  const NavMenu: React.FC<NavMenuProps> = ({ menuItems, openAdminSection, toggleAdminSection, onItemClick, handleMenuClick, setIsSettingsOpen }) => {
    const location = useLocation();
    const selectedCuenta = useCuentaContextStore((state) => state.selectedCuenta);
    const { orders, notifications, setNotification } = useLumbaStore();
    const SHOW_MENU_COUNTS = true;

    const isActive = (path: string) => location.pathname === path;

    // Calculate counts - filter by client if one is selected
    const [isMeliConnected, setIsMeliConnected] = useState(true);

    React.useEffect(() => {
      const checkConnection = async () => {
        try {
          const status = await meliService.getConnectionStatus();
          setIsMeliConnected(status.isConnected);
        } catch (error) {
          setIsMeliConnected(false);
        }
      };
      checkConnection();
    }, [selectedCuenta]);

    const getCount = (type: "logistics" | "sales", status: string) => {
      if (!isMeliConnected) return 0;

      let filteredOrders = orders;

      // Filter by client if one is selected
      if (selectedCuenta) {
        filteredOrders = orders.filter((o) => {
            if (typeof o.account === 'string') return false; 
            return o.account.id === selectedCuenta._id;
        });
      }

      if (type === "logistics") {
        return filteredOrders.filter((o) => o.logisticsStatus === status).length;
      }
      if (type === "sales") {
        return filteredOrders.filter((o) => o.salesStatus === status).length;
      }
      return 0;
    };

    // Partición de items: Admin Usuarios (sin clients ni dashboard)
    const userAdminItems = menuItems.filter((item) => ["/admin/roles", "/admin/users"].includes(item.path));

    // Items de Admin General (Dashboard + Clientes + Tenants para superadmin + SEO)
    const dashboardItem = menuItems.find((item) => item.path === "/admin/dashboard");
    const cuentaItem = menuItems.find((item) => item.path === "/admin/cuentas");
    const tenantsItem = menuItems.find((item) => item.path === "/admin/tenants");
    const carouselItem = menuItems.find((item) => item.path === "/admin/carousel-images");

    const generalItem = menuItems.find((item) => item.path === "/admin/general");

    const seoItem = menuItems.find((item) => item.path === "/admin/seo");


    // Lumba Items
    const ventasItem = menuItems.find((item) => item.path === "/ventas");
    const logisticaItem = menuItems.find((item) => item.path === "/logistica");

    // Otros items que no pertenecen a ninguna sección
    const otherAdminItems = menuItems.filter((item) => !userAdminItems.some((u) => u.path === item.path) && item.path !== "/admin/dashboard" && item.path !== "/admin/cuentas" && item.path !== "/admin/tenants" && item.path !== "/admin/carousel-images" && item.path !== "/admin/general" && item.path !== "/admin/seo" && item.path !== "/ventas" && item.path !== "/logistica");

    const renderMenuItem = (item: any) => {
      // Debug log to verify HMR
      console.log("NavMenu rendering item:", item.label);
      if (item.external) {
        return (
          <a
            key={item.path}
            href={item.path}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              handleMenuClick(e, item);
              onItemClick?.();
            }}
            className="group flex items-center justify-between px-2 py-2 transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      }

      if (item.path === "#") {
        return (
          <button
            key={item.label}
            onClick={() => {
              setIsSettingsOpen(true);
              onItemClick?.();
            }}
            className="group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <FontAwesomeIcon icon={item.icon} className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium truncate">{item.label}</span>
            </div>
            {SHOW_MENU_COUNTS && item.count !== undefined && <span className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${item.count > 0 ? "bg-slate-500/20 text-slate-500 dark:bg-white/20 dark:text-white" : "bg-red-500/20 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}>{item.count}</span>}
          </button>
        );
      }

      // Disabled state
      if (item.disabled) {
        return (
          <div key={item.path} className="group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all cursor-not-allowed opacity-40 bg-neutral-100 dark:bg-neutral-700 select-none">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="h-8 w-8 flex items-center justify-center rounded-md bg-neutral-200 dark:bg-neutral-600">
                <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
              </div>
              <span className="font-medium truncate">{item.label}</span>
            </div>
          </div>
        );
      }
      return (
        <Link key={item.path} to={item.path} onClick={onItemClick} aria-current={isActive(item.path) ? "page" : undefined} className={`group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all ${isActive(item.path) ? "!bg-gray-100 !text-accent-1 border border-gray-200 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent"}`}>
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${isActive(item.path) ? "bg-white text-blue-600" : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-white group-hover:text-blue-600"}`}>
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
            </div>
            <span className="font-medium truncate">{item.label}</span>
            {item.badge && <span className={`ml-1 px-2 py-0.5 rounded-full text-[8px] font-bold bg-accent-2 text-accent-9 border border-accent-9 dark:bg-black dark:text-white dark:border-white uppercase`}>{item.badge}</span>}
          </div>

          {SHOW_MENU_COUNTS && item.count !== undefined && <span className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${item.count > 0 ? "bg-slate-500/20 text-slate-500 dark:bg-white/20 dark:text-white" : "bg-red-500/20 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}>{item.count}</span>}
        </Link>
      );
    };
    return (
      <div>
        {/* CLIENT SELECTOR - Arriba de todo */}
        {cuentaItem && (
          <div className="px-2 mb-4">
            <CuentaSelector className="w-full" />

            {/* Menú del contexto del cuenta */}
            <div className="mt-3 space-y-1">
              {/* Información - solo cuando hay cuenta específico */}
              {selectedCuenta && (
                <Link to="/cuenta-info" onClick={onItemClick} aria-current={isActive("/cuenta-info") ? "page" : undefined} className={`group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all ${isActive("/cuenta-info") ? "!bg-gray-100 !text-accent-1 border border-gray-200 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent"}`}>
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${isActive("/cuenta-info") ? "bg-white text-blue-600" : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-white group-hover:text-blue-600"}`}>
                      <FontAwesomeIcon icon={faInfoCircle} className="h-4 w-4" />
                    </div>
                    <span className="font-medium truncate">Información</span>
                  </div>
                </Link>
              )}

              {/* Logística - como menú desplegable */}
              {logisticaItem && (
                <div>
                  <button onClick={() => toggleAdminSection("logistica")} className={`w-full group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all ${location.pathname === "/logistica" ? "!bg-gray-100 !text-accent-1 border border-gray-200 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent"}`}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${location.pathname === "/logistica" ? "bg-white text-blue-600" : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-white group-hover:text-blue-600"}`}>
                        <FontAwesomeIcon icon={faBuilding} className="h-4 w-4" />
                      </div>
                      <span className="font-medium truncate">Logística</span>
                    </div>
                    <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 text-gray-400 transform transition-transform ${openAdminSection === "logistica" ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {openAdminSection === "logistica" && (
                      <motion.nav
                        key="logistica"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                          open: { opacity: 1, height: "auto" },
                          collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden space-y-1 ml-4"
                      >
                        <div className="py-1">
                          {[
                            { label: "En preparación", status: "PENDIENTE_PREPARACION", count: getCount("logistics", "pendiente_preparacion") },
                            { label: "Listo para entregar", status: "LISTO_PARA_ENTREGAR", count: getCount("logistics", "listo_para_entregar") },
                            { label: "Despachado ML", status: "DESPACHADO_MELI", count: getCount("logistics", "despachado_meli") },
                            { label: "Retiro en Local", status: "RETIRO_EN_LOCAL", count: getCount("logistics", "retiro_local") },
                            { label: "Entregados", status: "ENTREGADOS", count: getCount("logistics", "entregado") },
                          ].map((sub) => {
                            const hasNotification = notifications?.[sub.status];
                            return (
                              <Link
                                key={sub.status}
                                to={`/logistica?status=${sub.status}`}
                                onClick={() => {
                                  setOpen(false);
                                  if (hasNotification) {
                                    setNotification(sub.status, false);
                                  }
                                }}
                                className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg transition-all ${location.search.includes(sub.status) ? "!bg-gray-100 !text-accent-1" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}
                              >
                                <span className="font-medium truncate text-sm">{sub.label}</span>
                                <span className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${hasNotification ? "bg-blue-600 text-white animate-breath-blue border-none" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>{sub.count}</span>
                              </Link>
                            );
                          })}

                          <div className="pl-2 pt-2 pb-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Anulaciones</div>

                          {[
                            { label: "Desempaquetar", status: "DESEMPAQUETAR", count: isMeliConnected ? orders.filter((o) => (selectedCuenta ? (typeof o.account !== 'string' && o.account.id === selectedCuenta._id) : true) && o.packaged && (o.logisticsStatus === "cancelado_vuelto_stock" || o.logisticsStatus === "devolucion_vuelto_stock")).length : 0 },
                            { label: "Devolucion", status: "DEVOLUCION", count: isMeliConnected ? orders.filter((o) => (selectedCuenta ? (typeof o.account !== 'string' && o.account.id === selectedCuenta._id) : true) && !o.packaged && o.logisticsStatus === "devolucion_vuelto_stock").length : 0 },
                            { label: "Cancelados", status: "CANCELADOS", count: isMeliConnected ? orders.filter((o) => (selectedCuenta ? (typeof o.account !== 'string' && o.account.id === selectedCuenta._id) : true) && !o.packaged && o.logisticsStatus === "cancelado_vuelto_stock").length : 0 },
                          ].map((sub) => {
                            const hasNotification = notifications?.[sub.status];
                            return (
                              <Link
                                key={sub.status}
                                to={`/logistica?status=${sub.status}`}
                                onClick={() => {
                                  setOpen(false);
                                  if (hasNotification) {
                                    setNotification(sub.status, false);
                                  }
                                }}
                                className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg transition-all ${location.search.includes(sub.status) ? "!bg-gray-100 !text-accent-1" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}
                              >
                                <span className="font-medium truncate text-sm">{sub.label}</span>
                                <span className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${hasNotification ? "bg-blue-600 text-white animate-breath-blue border-none" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>{sub.count}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.nav>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Facturación - como menú desplegable */}
              {ventasItem && (
                <div>
                  <button onClick={() => toggleAdminSection("ventas")} className={`w-full group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all ${location.pathname === "/ventas" ? "!bg-gray-100 !text-accent-1 border border-gray-200 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent"}`}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${location.pathname === "/ventas" ? "bg-white text-blue-600" : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-white group-hover:text-blue-600"}`}>
                        <FontAwesomeIcon icon={faUsersGear} className="h-4 w-4" />
                      </div>
                      <span className="font-medium truncate">Facturación</span>
                    </div>
                    <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 text-gray-400 transform transition-transform ${openAdminSection === "ventas" ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {openAdminSection === "ventas" && (
                      <motion.nav
                        key="ventas"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                          open: { opacity: 1, height: "auto" },
                          collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden space-y-1 ml-4"
                      >
                        <div className="py-1">
                          {[
                            { label: "Pendiente Facturación", status: "PENDIENTE_FACTURACION", count: getCount("sales", "pendiente_facturacion") },
                            { label: "Facturadas", status: "FACTURADAS", count: getCount("sales", "facturada") },
                            { label: "Ventas Canceladas", status: "VENTAS_CANCELADAS", count: getCount("sales", "venta_cancelada") },
                            { label: "Notas de Crédito", status: "NOTAS_DE_CREDITO", count: getCount("sales", "nota_credito") },
                          ].map((sub) => {
                            const hasNotification = notifications?.[sub.status];
                            return (
                              <Link
                                key={sub.status}
                                to={`/ventas?status=${sub.status}`}
                                onClick={() => {
                                  setOpen(false);
                                  if (hasNotification) {
                                    setNotification(sub.status, false);
                                  }
                                }}
                                className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg transition-all ${location.search.includes(sub.status) ? "!bg-gray-100 !text-accent-1" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}
                              >
                                <span className="font-medium truncate text-sm">{sub.label}</span>
                                <span className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${hasNotification ? "bg-blue-600 text-white animate-breath-blue border-none" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>{sub.count}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.nav>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}



        {cuentaItem && (dashboardItem || tenantsItem || userAdminItems.length > 0) && <div className="border-t border-gray-200 dark:border-gray-700 mx-4 my-3" />}

        {/* ADMIN GENERAL - Dashboard, Tenants y Cuentas */}
        {(dashboardItem || cuentaItem || tenantsItem) && (
          <div className="px-2 mb-2">
            <button onClick={() => toggleAdminSection("general")} className="w-full flex items-center justify-between text-sm font-medium text-neutral-500 dark:text-neutral-400 tracking-wider transition-colors pb-2 pt-2">
              <span>
                <FontAwesomeIcon icon={faCog} className="mr-2 h-4 w-4" />
                <span className="uppercase">Admin General</span>
              </span>
              <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 transform transition-transform ${openAdminSection === "general" ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {openAdminSection === "general" && (
                <motion.nav
                  key="general"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: "auto" },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden space-y-1"
                >
                  <div className="pb-2">
                    {/* Dashboard */}
                    {dashboardItem && renderMenuItem(dashboardItem)}



                    {/* Tenants (solo superadmin) */}
                    {tenantsItem && renderMenuItem(tenantsItem)}

                    {/* Cuentas */}
                    {cuentaItem && renderMenuItem(cuentaItem)}

                    {/* Configuración */}
                    <Link
                      to="/admin/configuracion"
                      onClick={() => setOpen(false)}
                      className={`group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all ${
                        isActive("/admin/configuracion")
                          ? "!bg-gray-100 !text-accent-1 border border-gray-200 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div
                          className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
                            isActive("/admin/configuracion")
                              ? "bg-white text-blue-600"
                              : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-white group-hover:text-blue-600"
                          }`}
                        >
                          <FontAwesomeIcon icon={faMoneyBillWave} className="h-4 w-4" />
                        </div>
                        <span className="font-medium truncate">Facturación</span>
                      </div>
                    </Link>

                    {/* Integraciones */}
                    <Link
                      to="/admin/integrations"
                      onClick={() => setOpen(false)}
                      className={`group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all ${
                        isActive("/admin/integrations")
                          ? "!bg-gray-100 !text-accent-1 border border-gray-200 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div
                          className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
                            isActive("/admin/integrations")
                              ? "bg-white text-blue-600"
                              : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-white group-hover:text-blue-600"
                          }`}
                        >
                          <FontAwesomeIcon icon={faPlug} className="h-4 w-4" />
                        </div>
                        <span className="font-medium truncate">Integraciones</span>
                      </div>
                    </Link>

                    {/* Documentación - Submenú */}
                    <div>
                      <button 
                        onClick={() => setIsDocOpen(!isDocOpen)} 
                        className={`w-full group relative flex items-center justify-between px-2 py-2 rounded-lg transition-all ${location.pathname.startsWith("/admin/doc") ? "!bg-gray-100 !text-accent-1 border border-gray-200 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent"}`}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${location.pathname.startsWith("/admin/doc") ? "bg-white text-blue-600" : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-white group-hover:text-blue-600"}`}>
                            <FontAwesomeIcon icon={faBook} className="h-4 w-4" />
                          </div>
                          <span className="font-medium truncate">Documentación</span>
                        </div>
                        <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 text-gray-400 transform transition-transform ${isDocOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence initial={false}>
                        {isDocOpen && (
                          <motion.nav
                            key="doc-submenu"
                            initial="collapsed"
                            animate="open"
                            exit="collapsed"
                            variants={{
                              open: { opacity: 1, height: "auto" },
                              collapsed: { opacity: 0, height: 0 },
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden space-y-1 ml-4"
                          >
                             <div className="py-1">
                              <div className="pl-2 pt-2 pb-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">General</div>
                               {[
                                  { label: "Introducción", path: "/admin/doc" },
                                  { label: "Estructura del Proyecto", path: "/admin/doc/structure" },
                               ].map((sub) => (
                                  <Link
                                    key={sub.path}
                                    to={sub.path}
                                    onClick={() => setOpen(false)}
                                    className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg transition-all ${location.pathname === sub.path ? "!bg-gray-100 !text-accent-1" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}
                                  >
                                    <span className="font-medium truncate text-sm">{sub.label}</span>
                                  </Link>
                               ))}

                               <div className="pl-2 pt-2 pb-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Lumba (MercadoLibre)</div>
                               {[
                                  { label: "Lógica & Estados", path: "/admin/doc/meli-logic" },
                               ].map((sub) => (
                                  <Link
                                    key={sub.path}
                                    to={sub.path}
                                    onClick={() => setOpen(false)}
                                    className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg transition-all ${location.pathname === sub.path ? "!bg-gray-100 !text-accent-1" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900"}`}
                                  >
                                    <span className="font-medium truncate text-sm">{sub.label}</span>
                                  </Link>
                               ))}
                             </div>
                          </motion.nav>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* CONFIGURACIÓN - Web (Carrusel, Logo, SEO) */}
        {false && (carouselItem || generalItem || seoItem) && (
          <div className="px-2 mb-2">
            <button onClick={() => toggleAdminSection("config")} className="w-full flex items-center justify-between text-sm font-medium text-neutral-500 dark:text-neutral-400 tracking-wider transition-colors pb-2 pt-2">
              <span>
                <FontAwesomeIcon icon={faCog} className="mr-2 h-4 w-4" />
                <span className="uppercase">Configuración</span>
              </span>
              <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 transform transition-transform ${openAdminSection === "config" ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {openAdminSection === "config" && (
                <motion.nav
                  key="config"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: "auto" },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden space-y-1"
                >
                  <div className="pb-2">
                    <div className="pl-2 pt-1 pb-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Web</div>
                    {/* SEO */}
                    {seoItem && renderMenuItem(seoItem)}

                    {/* Carousel */}
                    {carouselItem && renderMenuItem(carouselItem)}

                    {/* General/Logo */}
                    {generalItem && renderMenuItem(generalItem)}
                  </div>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ADMIN USUARIOS */}
        {userAdminItems.length > 0 && (
          <div className="px-2 mb-2">
            <button onClick={() => toggleAdminSection("users")} className="w-full flex items-center justify-between text-sm font-medium text-neutral-500 dark:text-neutral-400 tracking-wider transition-colors pb-2 pt-2">
              <span>
                <FontAwesomeIcon icon={faUsersGear} className="mr-2 h-4 w-4" />
                <span className="uppercase"> Admin Usuarios</span>
              </span>
              <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 transform transition-transform ${openAdminSection === "users" ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {openAdminSection === "users" && (
                <motion.nav
                  key="users"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: "auto" },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden space-y-1"
                >
                  <div className="pb-2">{userAdminItems.map((item) => renderMenuItem(item))}</div>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* OTROS ITEMS (si existen) */}
        {otherAdminItems.length > 0 && (
          <div className="px-2 mb-2">
            <nav className="space-y-1 pb-2">{otherAdminItems.map((item) => renderMenuItem(item))}</nav>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className="bg-primary-400 dark:bg-accent-2 shadow-sm border-b border-accent-4 sticky top-0 z-40 transition-colors duration-300">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16 relative">
            <div className="lg:hidden">
              <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg hover:bg-accent-3 flex-1 overflow-y-auto space-y-4 transition-colors text-accent-1">
                {open ? <FontAwesomeIcon icon={faXmark} className="h-6 w-6" /> : <FontAwesomeIcon icon={faBars} className="h-6 w-6" />}
              </button>
            </div>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 lg:static lg:transform-none lg:w-64 lg:flex lg:justify-start lg:items-center">
              <Link to="/admin/dashboard" className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                <img 
                  src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png" 
                  alt="Mercado Libre" 
                  className="max-h-8 max-w-[150px] object-contain" 
                />
              </Link>
            </div>
            <div className="flex items-center justify-center space-x-2 ml-auto">
              {/* Mobile Notification Button (Right) */}
              <div className="lg:hidden relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg hover:bg-accent-3 transition-colors text-accent-1 relative"
                >
                  <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
                  {activeNotifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse border border-primary-400 dark:border-accent-2"></span>
                  )}
                </button>

                {/* Notifications Dropdown (Right Aligned) */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 origin-top-right"
                    >
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notificaciones</h3>
                        <span className="text-xs text-gray-500">{activeNotifications.length} nuevas</span>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {activeNotifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                            <FontAwesomeIcon icon={faBell} className="h-6 w-6 mb-2 opacity-50 block mx-auto" />
                            No tienes notificaciones
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {activeNotifications.map((key) => {
                              const info = notificationMap[key];
                              if (!info) return null;
                              return (
                                <Link
                                  key={key}
                                  to={info.path}
                                  onClick={() => {
                                    setNotification(key, false);
                                    setShowNotifications(false);
                                  }}
                                  className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{info.label}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">Toca para ver</p>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden lg:block">
                <UserCard />
              </div>

              {/* 🤖 Robot (por ahora oculto) */}
              {/*               <button onClick={() => openAssistant?.()} className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="Asistente IA">
                <FontAwesomeIcon icon={faRobot} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button> */}

              {/* Theme Toggle Removed - Enforced Light Mode */}
              <div className="sticky bottom-0 left-0 right-0 bg-transparent dark:bg-transparent py-2 border-none px-4 hidden lg:block">
                <LogoutButton onClick={() => setOpen(false)} logout={logout} />
              </div>
            </div>
          </div>
        </div>

        {open && <div className="fixed inset-0 z-40 bg-neutral-950/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />}
        <div className={`fixed top-0 left-0 z-50 h-svh w-80 bg-accent-3 dark:bg-accent-3 transform transition-transform duration-300 ease-in-out flex flex-col ${open ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!open}>
          <div className="p-4 pb-0">
            <div className="flex items-start justify-between border-b border-neutral-700 mb-2">
              <div>
                <Link to="/admin/dashboard" className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                  <img 
                    src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png" 
                    alt="Mercado Libre" 
                    className="max-h-10 max-w-[150px] object-contain" 
                  />
                </Link>
              </div>
              <button onClick={() => setOpen(false)} className="p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5 text-accent-1" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-3">
              {/*               {showClientContext && (
                <div className="bg-white dark:bg-neutral-950">
                  <div>
                    <div className="text-sm font-medium text-neutral-500 dark:text-neutral-40 uppercase tracking-wider mb-2">Cliente</div>
                    <ClientSelector />
                  </div>
                  <div>
                    <ClientContextMenu />
                  </div>
                </div>
              )} */}
              <div>
                <NavMenu menuItems={menuItems} openAdminSection={openAdminSection} toggleAdminSection={toggleAdminSection} onItemClick={() => setOpen(false)} handleMenuClick={handleMenuClick} setIsSettingsOpen={setIsSettingsOpen} />
              </div>
            </div>
          </div>

          <div className="lg:hidden flex-none bg-accent-3 border-t border-accent-4 p-4 flex justify-between items-end items-center">
            <div>
              <UserCard />
            </div>
            <div>
              <LogoutButton onClick={() => setOpen(false)} logout={logout} />
            </div>
          </div>
        </div>
      </nav>

      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-accent-3 lg:border-r lg:border-accent-4 transition-colors duration-300">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col pt-5 pb-4 overflow-y-auto mt-12">
            <div className="px-3 mb-4">
              <div className={`bg-transparent dark:bg-transparent py-2`}>
                <NavMenu menuItems={menuItems} openAdminSection={openAdminSection} toggleAdminSection={toggleAdminSection} onItemClick={() => setOpen(false)} handleMenuClick={handleMenuClick} setIsSettingsOpen={setIsSettingsOpen} />
              </div>
            </div>
          </div>
          <div className="px-3 pb-4 lg:hidden">
            <LogoutButton logout={logout} />
          </div>
        </div>
      </aside>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
