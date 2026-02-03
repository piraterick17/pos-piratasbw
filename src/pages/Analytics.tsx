import { useState } from 'react';
import {
  TrendingUp,
  Package,
  Users,
  MapPin,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { getDateRangeMexico } from '../lib/utils/time';
import { formatCurrency } from '../lib/utils/format';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Analytics() {
  const [rangeType, setRangeType] = useState<'today' | 'week' | 'month' | 'year'>('month');

  const [dateRange, setDateRange] = useState(() => {
    const [start, end] = getDateRangeMexico('month');
    return { start, end };
  });

  const { data: analytics, loading } = useDashboardData(
    dateRange.start,
    dateRange.end,
    { includeCancelled: false }
  );

  const COLORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const handleRangeChange = (type: 'today' | 'week' | 'month' | 'year') => {
    setRangeType(type);
    const [start, end] = getDateRangeMexico(type);
    setDateRange({ start, end });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 font-bold tracking-widest animate-pulse">CARGANDO INTELIGENCIA DE NEGOCIO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header con Selector de Rango */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              Análisis Avanzado
            </h1>
            <p className="text-sm text-gray-500 font-medium tracking-tight">
              Datos consolidados de {rangeType === 'today' ? 'Hoy' : rangeType === 'week' ? 'esta Semana' : 'este Mes'}
            </p>
          </div>

          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            {(['today', 'week', 'month'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleRangeChange(type)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${rangeType === type
                  ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md'
                  : 'text-gray-400 hover:text-gray-900'
                  }`}
              >
                {type === 'today' ? 'Hoy' : type === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticCard
            title="Ingresos Totales"
            value={formatCurrency(analytics.totalVentas)}
            icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
            subtitle={`${analytics.totalPedidos} transacciones exitosas`}
          />
          <AnalyticCard
            title="Ticket Promedio"
            value={formatCurrency(analytics.ticketPromedio)}
            icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
            subtitle="Gasto medio por cliente"
          />
          <AnalyticCard
            title="A Domicilio"
            value={analytics.pedidosDomicilio.toString()}
            icon={<MapPin className="w-6 h-6 text-amber-600" />}
            subtitle={`${analytics.totalPedidos > 0 ? ((analytics.pedidosDomicilio / analytics.totalPedidos) * 100).toFixed(0) : 0}% de los pedidos`}
          />
          <AnalyticCard
            title="Top Producto"
            value={analytics.topProductos[0]?.nombre || 'N/A'}
            icon={<Package className="w-6 h-6 text-purple-600" />}
            subtitle={`${analytics.topProductos[0]?.cantidad || 0} unidades vendidas`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Tendencia */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Curva de Crecimiento
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.ventasPorDia}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(v) => [formatCurrency(v as number), 'Ventas']}
                />
                <Area type="monotone" dataKey="ventas" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Zonas */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <MapPin className="w-4 h-4 text-amber-600" />
              Distribución por Zona
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.topUbicaciones}
                  dataKey="cantidad"
                  nameKey="zona"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                >
                  {analytics.topUbicaciones.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Productos */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <Package className="w-4 h-4 text-purple-600" />
              Top 10 Productos
            </h3>
            <div className="space-y-4">
              {analytics.topProductos.slice(0, 10).map((p: any, idx: number) => (
                <div key={p.nombre} className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-300 w-4">{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-700">{p.nombre}</span>
                      <span className="text-xs font-black text-indigo-600">{p.cantidad}</span>
                    </div>
                    <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${analytics.topProductos[0] ? (p.cantidad / analytics.topProductos[0].cantidad) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Clientes */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
              <Users className="w-4 h-4 text-emerald-600" />
              Fidelidad de Clientes
            </h3>
            <div className="space-y-4">
              {analytics.topClientes.slice(0, 10).map((c: any) => (
                <div key={c.nombre} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.nombre}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{c.pedidos} PEDIDOS REALIZADOS</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(c.total)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">TOTAL INVERTIDO</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function AnalyticCard({ title, value, icon, subtitle }: { title: string, value: string, icon: any, subtitle: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 rounded-2xl">{icon}</div>
      </div>
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{title}</h3>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-xs font-bold text-gray-400 mt-2 flex items-center gap-1">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
