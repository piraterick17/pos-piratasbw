import { useState, useCallback } from 'react';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { ShoppingBag, MapPin, DollarSign, TrendingUp, Coffee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDateRangeMexico } from '../lib/utils/time';
import { formatCurrency, formatNumber } from '../lib/utils/format';
import { useDashboardData } from '../hooks/useDashboardData';

const COLORS = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D'];

export function DashboardDesayunos() {
  // Inicializar con rango por defecto (últimos 7 días) usando utilidades de tiempo
  const [dateRange, setDateRange] = useState(() => {
    const [start, end] = getDateRangeMexico('week');
    return { startDate: start, endDate: end };
  });

  // Usar el nuevo Hook centralizado con el filtro de Desayunos activo
  const { data, loading } = useDashboardData(dateRange.startDate, dateRange.endDate, {
    breakfastOnly: true
  });

  // Memoizar el callback para evitar re-renders innecesarios
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pirateRed mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 p-2.5 rounded-lg shadow-sm">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Desayunos</h1>
                <p className="text-sm text-gray-500">Horario matutino (8:00 AM - 12:00 PM México)</p>
              </div>
            </div>
          </div>

          <DateRangeSelector
            onRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Pedidos</span>
              <ShoppingBag className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{formatNumber(data.totalPedidos)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Pedidos a Domicilio</span>
              <MapPin className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{formatNumber(data.pedidosDomicilio)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Ventas</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{formatCurrency(data.totalVentas)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Ticket Promedio</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{formatCurrency(data.ticketPromedio)}</span>
            </div>
          </div>
        </div>

        {/* Listas Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Productos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-orange-600" />
              <h2 className="font-bold text-gray-900 text-lg">Top 10 Productos Vendidos</h2>
            </div>
            <div className="p-2 space-y-1">
              {data.topProductos.map((producto, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className="w-6 text-sm font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-medium text-gray-800">{producto.nombre}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-gray-900">{formatNumber(producto.cantidad)} u</span>
                    <span className="block text-xs text-gray-500">{formatCurrency(producto.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Ubicaciones */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-gray-900 text-lg">Top 5 Ubicaciones</h2>
            </div>
            <div className="p-2 space-y-1">
              {data.topUbicaciones.map((ubicacion, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className="w-6 text-sm font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-medium text-gray-800">{ubicacion.zona}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{formatNumber(ubicacion.cantidad)} pedidos</span>
                </div>
              ))}
              {data.topUbicaciones.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">No hay datos de ubicaciones</div>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico de Ventas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Ventas por Día</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ventasPorDia}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="fecha"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{
                    backgroundColor: '#FFF',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [`${formatCurrency(value)}`, 'Ventas']}
                />
                <Bar dataKey="ventas" fill="#EA580C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Salsas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 Salsas Más Pedidas</h2>
            <div className="h-[300px]">
              {data.topSalsas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.topSalsas}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="cantidad"
                      label={({ nombre, percent }) => `${nombre} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {data.topSalsas.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No hay datos de salsas</div>
              )}
            </div>
          </div>

          {/* Top Clientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h2 className="font-bold text-gray-900 text-lg">Top 5 Mejores Clientes</h2>
            </div>
            <div className="p-2 space-y-1">
              {data.topClientes.map((cliente, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-emerald-50/50 rounded-lg transition-colors border border-transparent hover:border-emerald-100">
                  <div className="flex items-center gap-4">
                    <span className="w-6 text-sm font-bold text-emerald-300">#{index + 1}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{cliente.nombre}</span>
                      <span className="text-xs text-gray-500">{formatNumber(cliente.pedidos)} pedidos</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 font-mono tracking-tight">{formatCurrency(cliente.total)}</span>
                </div>
              ))}
              {data.topClientes.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">No hay datos de clientes</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
