import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { ShoppingBag, MapPin, DollarSign, TrendingUp, Coffee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { getLocalDateStr, getMexicoDateToUTC, getEndOfDayMexico } from '../lib/utils/time';

interface DashboardData {
  totalPedidos: number;
  pedidosDomicilio: number;
  totalVentas: number;
  ticketPromedio: number;
  topProductos: Array<{ nombre: string; cantidad: number; total: number }>;
  topUbicaciones: Array<{ zona: string; cantidad: number }>;
  ventasPorDia: Array<{ fecha: string; ventas: number }>;
  topSalsas: Array<{ nombre: string; cantidad: number }>;
  topClientes: Array<{ nombre: string; total: number; pedidos: number }>;
}

const COLORS = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D'];

export function DashboardDesayunos() {
  const [loading, setLoading] = useState(true);

  // Inicializar con rango por defecto (últimos 7 días)
  const getInitialDateRange = () => {
    const now = new Date();
    const mexicoOffset = 6 * 60 * 60 * 1000;
    const mxNow = new Date(now.getTime() - mexicoOffset);

    const startDate = new Date(mxNow);
    startDate.setDate(mxNow.getDate() - 6);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = mxNow.toISOString().split('T')[0];

    return {
      startDate: getMexicoDateToUTC(startDateStr),
      endDate: getEndOfDayMexico(new Date(endDateStr))
    };
  };

  const [dateRange, setDateRange] = useState(getInitialDateRange());
  const hasFetchedInitially = useRef(false);

  const [data, setData] = useState<DashboardData>({
    totalPedidos: 0,
    pedidosDomicilio: 0,
    totalVentas: 0,
    ticketPromedio: 0,
    topProductos: [],
    topUbicaciones: [],
    ventasPorDia: [],
    topSalsas: [],
    topClientes: []
  });

  // Memoizar el callback para evitar re-renders innecesarios
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  }, []);

  useEffect(() => {
    // Cargar datos solo la primera vez con el rango inicial
    if (!hasFetchedInitially.current) {
      hasFetchedInitially.current = true;
      fetchDashboardData();
    }
  }, []);

  useEffect(() => {
    // Cargar datos cuando cambia el rango (pero no en la carga inicial)
    if (hasFetchedInitially.current) {
      fetchDashboardData();
    }
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const startDateUTC = dateRange.startDate;
      const endDateUTC = dateRange.endDate;

      // Obtener pedidos del turno matutino (8:00 AM - 12:00 PM)
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select(`
          id,
          total,
          tipo_entrega_id,
          zona_entrega_id,
          insert_date,
          cliente_id,
          clientes (nombre),
          detalles_pedido (
            cantidad,
            precio_unitario,
            producto_id,
            productos (nombre),
            salsas_seleccionadas
          )
        `)
        .gte('insert_date', startDateUTC)
        .lte('insert_date', endDateUTC)
        .eq('estado_id', 5)
        .order('insert_date', { ascending: true });

      if (pedidosError) throw pedidosError;

      // Filtrar por turno matutino (8:00 AM - 12:00 PM en hora México)
      const pedidosMatutinos = (pedidos || []).filter(pedido => {
        // Convertir UTC a hora México (UTC-6)
        const fechaUTC = new Date(pedido.insert_date);
        const mexicoOffset = 6 * 60 * 60 * 1000; // 6 horas en milisegundos
        const fechaMexico = new Date(fechaUTC.getTime() - mexicoOffset);
        const hora = fechaMexico.getUTCHours();
        return hora >= 8 && hora < 12;
      });

      // Log solo si hay datos interesantes o si es la primera carga
      if (pedidosMatutinos.length > 0) {
        console.log(`Dashboard Desayunos: ${pedidosMatutinos.length} pedidos del turno matutino (8am-12pm)`);
      }

      // Calcular métricas básicas
      const totalPedidos = pedidosMatutinos.length;
      const pedidosDomicilio = pedidosMatutinos.filter(p => p.tipo_entrega_id === 1).length;
      const totalVentas = pedidosMatutinos.reduce((sum, p) => sum + (p.total || 0), 0);
      const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

      // Top productos vendidos
      const productosMap = new Map<string, { cantidad: number; total: number }>();
      pedidosMatutinos.forEach(pedido => {
        pedido.detalles_pedido?.forEach((item: any) => {
          const nombre = item.productos?.nombre || 'Producto desconocido';
          const existing = productosMap.get(nombre) || { cantidad: 0, total: 0 };
          productosMap.set(nombre, {
            cantidad: existing.cantidad + item.cantidad,
            total: existing.total + (item.cantidad * item.precio_unitario)
          });
        });
      });

      const topProductos = Array.from(productosMap.entries())
        .map(([nombre, stats]) => ({ nombre, ...stats }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);

      // Top ubicaciones por zona de entrega
      const { data: zonasEntrega } = await supabase
        .from('zonas_entrega')
        .select('id, nombre');

      const zonasMap = new Map<string, number>();
      pedidosMatutinos.forEach(pedido => {
        if (pedido.tipo_entrega_id === 1 && pedido.zona_entrega_id) {
          const zona = zonasEntrega?.find(z => z.id === pedido.zona_entrega_id);
          if (zona?.nombre) {
            zonasMap.set(zona.nombre, (zonasMap.get(zona.nombre) || 0) + 1);
          }
        }
      });

      const topUbicaciones = Array.from(zonasMap.entries())
        .map(([zona, cantidad]) => ({ zona, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // Ventas por día (usando hora México)
      const ventasPorDiaMap = new Map<string, number>();
      pedidosMatutinos.forEach(pedido => {
        const fecha = getLocalDateStr(pedido.insert_date);
        ventasPorDiaMap.set(fecha, (ventasPorDiaMap.get(fecha) || 0) + (pedido.total || 0));
      });

      const ventasPorDia = Array.from(ventasPorDiaMap.entries())
        .map(([fecha, ventas]) => ({
          fecha: new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          ventas: Math.round(ventas)
        }))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      // Top salsas
      const salsasMap = new Map<string, number>();
      pedidosMatutinos.forEach(pedido => {
        pedido.detalles_pedido?.forEach((item: any) => {
          if (item.salsas_seleccionadas && Array.isArray(item.salsas_seleccionadas)) {
            item.salsas_seleccionadas.forEach((salsa: any) => {
              const nombreSalsa = typeof salsa === 'string' ? salsa : salsa.nombre;
              salsasMap.set(nombreSalsa, (salsasMap.get(nombreSalsa) || 0) + 1);
            });
          }
        });
      });

      const topSalsas = Array.from(salsasMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // Top clientes
      const clientesMap = new Map<string, { total: number; pedidos: number }>();
      pedidosMatutinos.forEach(pedido => {
        const nombre = pedido.clientes?.nombre || 'Cliente sin nombre';
        const existing = clientesMap.get(nombre) || { total: 0, pedidos: 0 };
        clientesMap.set(nombre, {
          total: existing.total + (pedido.total || 0),
          pedidos: existing.pedidos + 1
        });
      });

      const topClientes = Array.from(clientesMap.entries())
        .map(([nombre, stats]) => ({ nombre, ...stats }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setData({
        totalPedidos,
        pedidosDomicilio,
        totalVentas,
        ticketPromedio,
        topProductos,
        topUbicaciones,
        ventasPorDia,
        topSalsas,
        topClientes
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="h-full overflow-y-auto bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
              <Coffee className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Desayunos</h1>
              <p className="text-gray-600">Turno Matutino: 8:00 AM - 12:00 PM</p>
            </div>
          </div>

          <DateRangeSelector
            onRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Pedidos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data.totalPedidos}</p>
              </div>
              <ShoppingBag className="w-12 h-12 text-orange-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pedidos a Domicilio</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data.pedidosDomicilio}</p>
              </div>
              <MapPin className="w-12 h-12 text-amber-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Ventas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${data.totalVentas.toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Ticket Promedio</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${data.ticketPromedio.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Top Productos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-orange-500" />
              Top 10 Productos Vendidos
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.topProductos.map((producto, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{producto.nombre}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">{producto.cantidad} unidades</p>
                    <p className="text-xs text-gray-600">${producto.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Ubicaciones */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-500" />
              Top 5 Ubicaciones
            </h2>
            <div className="space-y-3">
              {data.topUbicaciones.map((ubicacion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-amber-500 text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{ubicacion.zona}</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{ubicacion.cantidad} pedidos</span>
                </div>
              ))}
              {data.topUbicaciones.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay datos de ubicaciones</p>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico de Ventas por Día */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ventas por Día</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ventasPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="ventas" fill="#F97316" name="Ventas" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Salsas y Top Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Salsas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Salsas Más Pedidas</h2>
            {data.topSalsas.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.topSalsas}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cantidad"
                  >
                    {data.topSalsas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No hay datos de salsas</p>
            )}
          </div>

          {/* Top Clientes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Mejores Clientes</h2>
            <div className="space-y-3">
              {data.topClientes.map((cliente, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{cliente.nombre}</p>
                      <p className="text-xs text-gray-600">{cliente.pedidos} pedidos</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-600">${cliente.total.toFixed(2)}</span>
                </div>
              ))}
              {data.topClientes.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay datos de clientes</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
