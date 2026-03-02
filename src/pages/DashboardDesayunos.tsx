import { useState, useEffect, useCallback } from 'react';
import { DateRangeSelector } from '../components/DateRangeSelector';
import {
  ShoppingBag, MapPin, DollarSign, TrendingUp, Coffee,
  Sun, Moon, Cake, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getDateRangeMexico, getLocalDateStr } from '../lib/utils/time';
import { formatCurrency, formatNumber } from '../lib/utils/format';
import { supabase } from '../lib/supabase/client';

const COLORS = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D'];

// ── Interfaces ──
interface ShiftMetrics {
  pedidos: number;
  ventas: number;
  chilaquiles: number;
  postres: number;
}

interface ProductoTop {
  nombre: string;
  cantidad: number;
  total: number;
  categoria: string;
}

interface VentaDia {
  fecha: string;
  ventas: number;
  pedidos: number;
}

interface SalsaTop {
  nombre: string;
  cantidad: number;
}

interface ClienteTop {
  nombre: string;
  total: number;
  pedidos: number;
}

const POSTRE_CAT_ID = 53;

export function DashboardDesayunos({ dateRange: externalRange, hideHeader }: { dateRange?: { start: string; end: string }, hideHeader?: boolean }) {
  const [dateRange, setDateRange] = useState(() => {
    if (externalRange) return { startDate: externalRange.start, endDate: externalRange.end };
    const [start, end] = getDateRangeMexico('week');
    return { startDate: start, endDate: end };
  });

  useEffect(() => {
    if (externalRange) {
      setDateRange({ startDate: externalRange.start, endDate: externalRange.end });
    }
  }, [externalRange]);

  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  }, []);

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [turnoManana, setTurnoManana] = useState<ShiftMetrics>({ pedidos: 0, ventas: 0, chilaquiles: 0, postres: 0 });
  const [turnoTarde, setTurnoTarde] = useState<ShiftMetrics>({ pedidos: 0, ventas: 0, chilaquiles: 0, postres: 0 });
  const [topProductosManana, setTopProductosManana] = useState<ProductoTop[]>([]);
  const [topProductosTarde, setTopProductosTarde] = useState<ProductoTop[]>([]);
  const [ventasPorDia, setVentasPorDia] = useState<VentaDia[]>([]);
  const [topSalsas, setTopSalsas] = useState<SalsaTop[]>([]);
  const [topClientes, setTopClientes] = useState<ClienteTop[]>([]);
  const [totales, setTotales] = useState({ pedidos: 0, ventas: 0, domicilio: 0, ticket: 0 });

  // Helper: hora local de México
  const getMexicoHour = (dateStr: string): number => {
    const date = new Date(dateStr);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      hour: 'numeric',
      hour12: false
    });
    return parseInt(formatter.format(date), 10);
  };

  // ── Data fetching ──
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos_vista')
        .select(`
          id,
          total,
          tipo_entrega_nombre,
          zona_entrega_id,
          insert_date,
          cliente_nombre,
          estado_nombre,
          metodo_pago,
          costo_envio,
          detalles_pedido (
            cantidad,
            precio_unitario,
            producto_id,
            productos (nombre, categoria_id, categorias(nombre)),
            salsas_seleccionadas
          )
        `)
        .gte('insert_date', dateRange.startDate)
        .lte('insert_date', dateRange.endDate)
        .is('deleted_at', null)
        .in('estado_nombre', ['Completado', 'En Reparto'])
        .order('insert_date', { ascending: true });

      if (error) throw error;

      // ── Filter: pedidos that contain chilaquiles OR postres ──
      const relevantPedidos = (pedidos || []).filter(pedido => {
        const detalles = (pedido.detalles_pedido as any[]) || [];
        const hasChilaquiles = detalles.some(d =>
          (d.productos?.nombre || '').toLowerCase().includes('chilaquil')
        );
        const hasPostres = detalles.some(d =>
          d.productos?.categoria_id === POSTRE_CAT_ID
        );
        return hasChilaquiles || hasPostres;
      });

      console.log(`🥞 Pedidos con chilaquiles/postres: ${relevantPedidos.length} de ${pedidos?.length || 0}`);

      // ── Classify by shift ──
      const manana: ShiftMetrics = { pedidos: 0, ventas: 0, chilaquiles: 0, postres: 0 };
      const tarde: ShiftMetrics = { pedidos: 0, ventas: 0, chilaquiles: 0, postres: 0 };

      const productosMananaMap = new Map<string, { cantidad: number; total: number; categoria: string }>();
      const productosTardeMap = new Map<string, { cantidad: number; total: number; categoria: string }>();
      const clientesMap = new Map<string, { total: number; pedidos: number }>();
      const salsasMap = new Map<string, number>();
      const ventasDiaMap = new Map<string, { ventas: number; pedidos: number }>();
      let totalVentas = 0;
      let totalDomicilio = 0;

      relevantPedidos.forEach(pedido => {
        const detalles = (pedido.detalles_pedido as any[]) || [];
        const hasChilaquiles = detalles.some(d =>
          (d.productos?.nombre || '').toLowerCase().includes('chilaquil')
        );
        const hasPostres = detalles.some(d =>
          d.productos?.categoria_id === POSTRE_CAT_ID
        );

        const hour = getMexicoHour(pedido.insert_date);
        const isMorning = hour >= 8 && hour < 14;
        const isAfternoon = hour >= 14 && hour < 23;

        const shift = isMorning ? manana : isAfternoon ? tarde : null;
        if (shift) {
          shift.pedidos++;
          shift.ventas += pedido.total || 0;
          if (hasChilaquiles) shift.chilaquiles++;
          if (hasPostres) shift.postres++;
        }

        totalVentas += pedido.total || 0;
        if (pedido.tipo_entrega_nombre === 'A domicilio') totalDomicilio++;

        // Cliente
        const nombreCliente = pedido.cliente_nombre || 'Cliente Final';
        const cs = clientesMap.get(nombreCliente) || { total: 0, pedidos: 0 };
        clientesMap.set(nombreCliente, { total: cs.total + (pedido.total || 0), pedidos: cs.pedidos + 1 });

        // Ventas por día
        const fechaLocal = getLocalDateStr(pedido.insert_date);
        const ds = ventasDiaMap.get(fechaLocal) || { ventas: 0, pedidos: 0 };
        ventasDiaMap.set(fechaLocal, { ventas: ds.ventas + (pedido.total || 0), pedidos: ds.pedidos + 1 });

        // Detalles: productos por turno y salsas
        const prodMap = isMorning ? productosMananaMap : isAfternoon ? productosTardeMap : null;
        detalles.forEach((item: any) => {
          const nombreProd = item.productos?.nombre || 'Producto desconocido';
          const catProd = item.productos?.categorias?.nombre || 'General';
          const catId = item.productos?.categoria_id;
          const isChilaquilProd = nombreProd.toLowerCase().includes('chilaquil');
          const isPostreProd = catId === POSTRE_CAT_ID;

          if (prodMap && (isChilaquilProd || isPostreProd)) {
            const ps = prodMap.get(nombreProd) || { cantidad: 0, total: 0, categoria: catProd };
            prodMap.set(nombreProd, {
              cantidad: ps.cantidad + item.cantidad,
              total: ps.total + (item.cantidad * item.precio_unitario),
              categoria: catProd
            });
          }

          if (item.salsas_seleccionadas && Array.isArray(item.salsas_seleccionadas)) {
            item.salsas_seleccionadas.forEach((s: any) => {
              const sNom = typeof s === 'string' ? s : s.nombre;
              salsasMap.set(sNom, (salsasMap.get(sNom) || 0) + 1);
            });
          }
        });
      });

      // ── Format results ──
      setTurnoManana(manana);
      setTurnoTarde(tarde);

      setTotales({
        pedidos: relevantPedidos.length,
        ventas: totalVentas,
        domicilio: totalDomicilio,
        ticket: relevantPedidos.length > 0 ? totalVentas / relevantPedidos.length : 0
      });

      setTopProductosManana(
        Array.from(productosMananaMap.entries())
          .map(([nombre, s]) => ({ nombre, ...s }))
          .sort((a, b) => b.cantidad - a.cantidad)
      );

      setTopProductosTarde(
        Array.from(productosTardeMap.entries())
          .map(([nombre, s]) => ({ nombre, ...s }))
          .sort((a, b) => b.cantidad - a.cantidad)
      );

      setTopClientes(
        Array.from(clientesMap.entries())
          .map(([nombre, s]) => ({ nombre, ...s }))
          .sort((a, b) => b.total - a.total)
      );

      setTopSalsas(
        Array.from(salsasMap.entries())
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 10)
      );

      setVentasPorDia(
        Array.from(ventasDiaMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([fecha, s]) => ({
            fecha: new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
            ...s
          }))
      );

    } catch (err) {
      console.error('❌ Error cargando datos desayunos:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ── Render helpers ──
  const renderProductList = (productos: ProductoTop[], emptyMsg: string) => (
    <div className="p-2 space-y-1">
      {productos.map((producto, index) => (
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
      {productos.length === 0 && (
        <div className="py-8 text-center text-gray-400 text-sm">{emptyMsg}</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        <span className="ml-2 text-gray-600">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {!hideHeader && (
          <div className="mb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-600 p-2.5 rounded-lg shadow-sm">
                  <Coffee className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard Desayunos & Postres</h1>
                  <p className="text-sm text-gray-500">Pedidos con chilaquiles o postres • Todos los horarios</p>
                </div>
              </div>
            </div>
            <DateRangeSelector onRangeChange={handleDateRangeChange} />
          </div>
        )}

        {/* Métricas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Pedidos</span>
              <ShoppingBag className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{formatNumber(totales.pedidos)}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Pedidos a Domicilio</span>
              <MapPin className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{formatNumber(totales.domicilio)}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Ventas</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{formatCurrency(totales.ventas)}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Ticket Promedio</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{formatCurrency(totales.ticket)}</span>
          </div>
        </div>

        {/* Tarjetas por turno */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Turno Matutino */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Sun className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Turno Matutino</h4>
                <p className="text-xs text-gray-500">8:00 AM – 2:00 PM</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500">Pedidos</p>
                <p className="text-xl font-bold text-amber-700">{turnoManana.pedidos}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500">Ventas</p>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(turnoManana.ventas)}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Coffee className="w-3 h-3" /> Chilaquiles
                </p>
                <p className="text-xl font-bold text-orange-600">{turnoManana.chilaquiles}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Cake className="w-3 h-3" /> Postres
                </p>
                <p className="text-xl font-bold text-pink-600">{turnoManana.postres}</p>
              </div>
            </div>
          </div>

          {/* Turno Vespertino */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Moon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Turno Vespertino</h4>
                <p className="text-xs text-gray-500">2:00 PM – 11:00 PM</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500">Pedidos</p>
                <p className="text-xl font-bold text-indigo-700">{turnoTarde.pedidos}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500">Ventas</p>
                <p className="text-xl font-bold text-indigo-700">{formatCurrency(turnoTarde.ventas)}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Coffee className="w-3 h-3" /> Chilaquiles
                </p>
                <p className="text-xl font-bold text-orange-600">{turnoTarde.chilaquiles}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Cake className="w-3 h-3" /> Postres
                </p>
                <p className="text-xl font-bold text-pink-600">{turnoTarde.postres}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Productos por Turno */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-gray-900 text-lg">Productos — Matutino</h2>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium ml-auto">8am – 2pm</span>
            </div>
            {renderProductList(topProductosManana, 'No hay productos en turno matutino')}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900 text-lg">Productos — Vespertino</h2>
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium ml-auto">2pm – 11pm</span>
            </div>
            {renderProductList(topProductosTarde, 'No hay productos en turno vespertino')}
          </div>
        </div>

        {/* Gráfico de Ventas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Ventas por Día</h2>
          <div className="h-[300px]">
            {ventasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasPorDia}>
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
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No hay datos de ventas</div>
            )}
          </div>
        </div>

        {/* Salsas + Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 Salsas Más Pedidas</h2>
            <div className="h-[300px]">
              {topSalsas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topSalsas.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="cantidad"
                      label={({ nombre, percent }) => `${nombre} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {topSalsas.slice(0, 5).map((_, index) => (
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h2 className="font-bold text-gray-900 text-lg">Top 5 Mejores Clientes</h2>
            </div>
            <div className="p-2 space-y-1">
              {topClientes.slice(0, 5).map((cliente, index) => (
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
              {topClientes.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">No hay datos de clientes</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
