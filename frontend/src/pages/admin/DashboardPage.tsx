import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faUserShield,
  faLayerGroup,
  faUserTie,
  faUserGraduate,
  faChartBar,
  faChartPie,
  faHouse,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageLayout } from "../../components/PageLayout";
import axios from "../../api/axiosConfig";
import { useThemeStore } from "../../stores/themeStore";
import { generateChartColors, getThemeColors } from "../../config/colors";

interface DashboardStats {
  users: number;
  roles: number;
  areas: number;
  positions: number;
  levels: number;
  tenants: number;
}

interface RoleDistribution {
  name: string;
  value: number;
}

// Pre-generate chart colors
const COLORS = generateChartColors(16);

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: any;
  color: string;
  loading?: boolean;
}> = ({ title, value, icon, color, loading }) => (
  <div className="bg-accent-2 rounded-xl shadow-lg border border-accent-4 p-6 transition-all hover:shadow-xl hover:scale-[1.02]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-accent-7 uppercase tracking-wide">
          {title}
        </p>
        <p className="mt-2 text-3xl font-bold text-accent-1">
          {loading ? (
            <span className="inline-block w-16 h-8 bg-accent-4 rounded animate-pulse"></span>
          ) : (
            value.toLocaleString()
          )}
        </p>
      </div>
      <div
        className={`h-14 w-14 flex items-center justify-center rounded-xl ${color}`}
      >
        <FontAwesomeIcon icon={icon} className="h-7 w-7 text-accent-1" />
      </div>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const { theme } = useThemeStore();
  const { user } = useAuthStore(); // Obtener usuario para chequear rol
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    roles: 0,
    areas: 0,
    positions: 0,
    levels: 0,
    tenants: 0,
  });
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>(
    []
  );
  // Superadmin specific states
  const [tenantsByPlan, setTenantsByPlan] = useState<any[]>([]);
  const [topTenantsByUsers, setTopTenantsByUsers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const isDark = theme === "dark";
  const themeColors = getThemeColors(isDark);

  const isSuperAdmin = user?.tenantSlug === "superadmin";

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        const promises: Promise<any>[] = [
          axios.get(isSuperAdmin ? "/users/count?global=true" : "/users/count").catch(() => ({ data: { count: 0 } })),
          axios.get("/roles/count").catch(() => ({ data: { count: 0 } })),
          axios.get("/areas/count").catch(() => ({ data: { count: 0 } })),
          axios.get("/positions/count").catch(() => ({ data: { count: 0 } })),
          axios.get("/levels/count").catch(() => ({ data: { count: 0 } })),
        ];

        if (isSuperAdmin) {
          promises.push(axios.get("/tenants/count").catch(() => ({ data: { count: 0 } })));
          // Fetch detailed tenants for specific charts
          promises.push(axios.get("/tenants?limit=100").catch(() => ({ data: { tenants: [] } })));
        } else {
            promises.push(Promise.resolve({ data: { count: 0 } }));
            promises.push(Promise.resolve({ data: { tenants: [] } }));
        }

        const [usersRes, rolesRes, areasRes, positionsRes, levelsRes, tenantsCountRes, tenantsListRes] =
          await Promise.all(promises);

        setStats({
          users: usersRes.data?.count || 0,
          roles: rolesRes.data?.count || 0,
          areas: areasRes.data?.count || 0,
          positions: positionsRes.data?.count || 0,
          levels: levelsRes.data?.count || 0,
          tenants: tenantsCountRes.data?.count || 0,
        });

        if (isSuperAdmin && tenantsListRes.data?.tenants) {
            const tenants = tenantsListRes.data.tenants;

            // Process Tenants by Plan
            const planCounts: Record<string, number> = {};
            tenants.forEach((t: any) => {
                const plan = t.subscription?.plan || "free";
                planCounts[plan] = (planCounts[plan] || 0) + 1;
            });
            const planData = Object.entries(planCounts).map(([name, value]) => ({ 
                name: name.charAt(0).toUpperCase() + name.slice(1), 
                value 
            }));
            setTenantsByPlan(planData);

            // Process Top Tenants by Users
            const topTenants = [...tenants]
                .sort((a: any, b: any) => (b.userCount || 0) - (a.userCount || 0))
                .slice(0, 10)
                .map((t: any) => ({
                    name: t.name,
                    value: t.userCount || 0
                }));
            setTopTenantsByUsers(topTenants);
        }

        // Fetch roles for pie chart (Standard Admin)
        if (!isSuperAdmin) {
            try {
              const rolesListRes = await axios.get("/roles");
              if (rolesListRes.data?.roles) {
                const distribution = rolesListRes.data.roles.map(
                  (role: any, index: number) => ({
                    name: role.name || `Role ${index + 1}`,
                    value: role.usersCount || Math.floor(Math.random() * 10) + 1,
                  })
                );
                setRoleDistribution(
                  distribution.length > 0
                    ? distribution
                    : [
                        { name: "Admin", value: 3 },
                        { name: "User", value: 12 },
                        { name: "Viewer", value: 5 },
                      ]
                );
              } else {
                setRoleDistribution([
                  { name: "Admin", value: 3 },
                  { name: "User", value: 12 },
                  { name: "Viewer", value: 5 },
                ]);
              }
            } catch {
              setRoleDistribution([
                { name: "Admin", value: 3 },
                { name: "User", value: 12 },
                { name: "Viewer", value: 5 },
              ]);
            }
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]); // Agregar user como dependencia

  const barChartData = [
    { name: "Usuarios", value: stats.users, fill: COLORS[0] },
    { name: "Roles", value: stats.roles, fill: COLORS[1] },
    { name: "Áreas", value: stats.areas, fill: COLORS[2] },
    { name: "Cargos", value: stats.positions, fill: COLORS[3] },
    { name: "Niveles", value: stats.levels, fill: COLORS[4] },
  ];

  /* if (stats.tenants > 0) {
      barChartData.unshift({ name: "Tenants", value: stats.tenants, fill: COLORS[5] });
  } */

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Vista general del sistema"
      faIcon={{ icon: faHouse }}
      infoModal={{
        isOpen: isInfoOpen,
        onOpen: () => setIsInfoOpen(true),
        onClose: () => setIsInfoOpen(false),
        title: "Ayuda: Dashboard",
        content: (
          <p>
            Bienvenido al Dashboard Principal. Aquí encontrarás una visión global del estado de tu organización, incluyendo métricas clave y gráficos de distribución.
          </p>
        ),
      }}
    >
      <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.tenants > 0 && (
            <StatCard
                title="Tenants"
                value={stats.tenants}
                icon={faBuilding}
                color="bg-accent-9"
                loading={loading}
            />
          )}
          <StatCard
            title="Usuarios"
            value={stats.users}
            icon={faUsers}
            color="bg-accent-7"
            loading={loading}
          />
          <StatCard
            title="Roles"
            value={stats.roles}
            icon={faUserShield}
            color="bg-accent-6"
            loading={loading}
          />
          <StatCard
            title="Áreas"
            value={stats.areas}
            icon={faLayerGroup}
            color="bg-accent-8"
            loading={loading}
          />
          <StatCard
            title="Cargos"
            value={stats.positions}
            icon={faUserTie}
            color="bg-accent-5"
            loading={loading}
          />
          <StatCard
            title="Niveles"
            value={stats.levels}
            icon={faUserGraduate}
            color="bg-accent-4"
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: SuperAdmin (Top Tenants) vs Standard (Entities) */}
          <div className="bg-accent-2 rounded-xl shadow-lg border border-accent-4 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-accent-2 border border-accent-4">
                <FontAwesomeIcon
                  icon={faChartBar}
                  className="h-5 w-5 text-accent-9"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-accent-1">
                  {isSuperAdmin ? "Top Tenants por Usuarios" : "Distribución por Entidad"}
                </h2>
                <p className="text-sm text-accent-7">
                  {isSuperAdmin ? "Tenants con mayor cantidad de usuarios" : "Cantidad de registros por tipo"}
                </p>
              </div>
            </div>
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-5"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={isSuperAdmin ? topTenantsByUsers : barChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    layout={isSuperAdmin ? "vertical" : "horizontal"}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                    {isSuperAdmin ? (
                         <>
                            <XAxis type="number" tick={{ fill: themeColors.text }} />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: themeColors.text }} />
                         </>
                    ) : (
                        <>
                            <XAxis dataKey="name" tick={{ fill: themeColors.text }} />
                            <YAxis tick={{ fill: themeColors.text }} />
                        </>
                    )}
                    
                    <Tooltip
                      contentStyle={{
                        backgroundColor: themeColors.background,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelStyle={{
                        color: themeColors.textPrimary,
                        fontWeight: 600,
                      }}
                      itemStyle={{
                        color: themeColors.textSecondary,
                      }}
                    />
                    <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pie Chart: SuperAdmin (Tenants by Plan) vs Standard (Roles) */}
          <div className="bg-accent-2 rounded-xl shadow-lg border border-accent-4 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-accent-3 border border-accent-4">
                <FontAwesomeIcon
                  icon={faChartPie}
                  className="h-5 w-5 text-accent-1"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-accent-1">
                   {isSuperAdmin ? "Tenants por Plan" : "Distribución de Roles"}
                </h2>
                <p className="text-sm text-accent-7">
                   {isSuperAdmin ? "Distribución de suscripciones" : "Usuarios por rol asignado"}
                </p>
              </div>
            </div>
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-1"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={isSuperAdmin ? tenantsByPlan : roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={
                        isMobile 
                          ? undefined 
                          : ({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {(isSuperAdmin ? tenantsByPlan : roleDistribution).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke={themeColors.stroke}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: themeColors.background,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelStyle={{
                        color: themeColors.textPrimary,
                        fontWeight: 600,
                      }}
                      itemStyle={{
                        color: themeColors.textSecondary,
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        color: themeColors.text,
                      }}
                      formatter={(value) => (
                        <span style={{ color: themeColors.textSecondary }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
