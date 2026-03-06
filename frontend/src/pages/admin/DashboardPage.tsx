import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useCuentaContextStore } from "../../stores/cuentaContextStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faChartPie,
  faHouse,
  faShoppingBag,
  faMoneyBillWave,
  faBoxOpen,
  faUsers,
  faBriefcase,
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
  meliOrders: number;
  meliRevenue: number;
  meliPending: number;
  salesHistory: { date: string; orders: number; revenue: number }[];
  statusDistribution: { name: string; value: number }[];
  totalTenants?: number;
  totalClients?: number;
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
  const { user } = useAuthStore();
  const { selectedCuenta } = useCuentaContextStore();

  const INITIAL_DASHBOARD_STATS: DashboardStats = {
    meliOrders: 0,
    meliRevenue: 0,
    meliPending: 0,
    salesHistory: [],
    statusDistribution: [],
    totalTenants: 0,
    totalClients: 0,
  };

  const [stats, setStats] = useState<DashboardStats>(INITIAL_DASHBOARD_STATS);
  const [loading, setLoading] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const isDark = theme === "dark";
  const themeColors = getThemeColors(isDark);
  const selectedClientId = selectedCuenta?._id?.trim() || undefined;

  useEffect(() => {
    let isActive = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const meliStatsRes = await axios.get("/meli/dashboard-stats", {
          params: selectedClientId ? { clientId: selectedClientId } : undefined,
        });

        if (!isActive) return;

        const meliData = meliStatsRes.data || {};
        setStats({
          meliOrders: meliData.orders?.total || 0,
          meliRevenue: meliData.orders?.revenue || 0,
          meliPending: meliData.statusDistribution?.find((s: any) => s.name === "pendiente_preparacion")?.value || 0,
          salesHistory: meliData.salesHistory || [],
          statusDistribution: meliData.statusDistribution || [],
          totalTenants: meliData.totalTenants,
          totalClients: meliData.totalClients,
        });
      } catch (error) {
        if (!isActive) return;
        console.error("Error fetching dashboard stats:", error);
        setStats(INITIAL_DASHBOARD_STATS);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchStats();
    return () => { isActive = false; };
  }, [user?.tenantId, selectedClientId]);

  const formatStatus = (status: string | undefined) => {
    if (!status) return "";
    const map: Record<string, string> = {
      pendiente_preparacion: "Pendiente",
      listo_para_entregar: "Listo",
      despachado_meli: "Despachado",
      retiro_local: "Retiro",
      entregado: "Entregado",
      cancelado_vuelto_stock: "Cancelado",
      devolucion_vuelto_stock: "Devolución",
    };
    return map[status] || status.replace(/_/g, " ");
  };

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
        {/* Stats Cards Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Pedidos (MeLi)"
                value={stats.meliOrders}
                icon={faShoppingBag}
                color="bg-yellow-400"
                loading={loading}
            />
             <StatCard
                title="Ingresos (MeLi)"
                value={stats.meliRevenue}
                icon={faMoneyBillWave}
                color="bg-green-500"
                loading={loading}
            />
             <StatCard
                title="Pendientes (MeLi)"
                value={stats.meliPending}
                icon={faBoxOpen}
                color="bg-blue-500"
                loading={loading}
            />
            <div className="hidden lg:block"></div> 
        </div>

        {/* System Stats (Superadmin Section) */}
        {(stats.totalTenants !== undefined && stats.totalTenants > 0) && (
          <div className="space-y-4">
             <h2 className="text-lg font-bold text-accent-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faChartPie} className="text-accent-7" />
                Resumen del Sistema
             </h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Organizaciones"
                    value={stats.totalTenants ?? 0}
                    icon={faUsers}
                    color="bg-purple-500"
                    loading={loading}
                />
                <StatCard
                    title="Total Clientes"
                    value={stats.totalClients ?? 0}
                    icon={faBriefcase}
                    color="bg-indigo-500"
                    loading={loading}
                />
             </div>
          </div>
        )}
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Sales History */}
          <div className="bg-accent-2 rounded-xl shadow-lg border border-accent-4 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-accent-2 border border-accent-4">
                <FontAwesomeIcon icon={faChartBar} className="h-5 w-5 text-accent-9" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-accent-1">Ventas últimos 7 días</h2>
                <p className="text-sm text-accent-7">Cantidad de pedidos diarios</p>
              </div>
            </div>
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-5"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.salesHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                    <XAxis 
                        dataKey="date" 
                        tick={{ fill: themeColors.text }} 
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                    />
                    <YAxis tick={{ fill: themeColors.text }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: themeColors.background,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: themeColors.textPrimary }}
                      itemStyle={{ color: themeColors.textSecondary }}
                    />
                    <Bar dataKey="orders" name="Pedidos" fill={COLORS[0]} radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pie Chart: Logistics Status */}
          <div className="bg-accent-2 rounded-xl shadow-lg border border-accent-4 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-accent-3 border border-accent-4">
                <FontAwesomeIcon icon={faChartPie} className="h-5 w-5 text-accent-1" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-accent-1">Estado de Logística</h2>
                <p className="text-sm text-accent-7">Distribución de estados de envío</p>
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
                      data={stats.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${formatStatus(name)} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {stats.statusDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={themeColors.stroke} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                        backgroundColor: themeColors.background,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: "8px",
                      }}
                    />
                    <Legend wrapperStyle={{ color: themeColors.text }} />
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
