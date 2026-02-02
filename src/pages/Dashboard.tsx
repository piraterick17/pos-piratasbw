import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Truck,
  AlertTriangle,
  ArrowRight,
  Activity
} from 'lucide-react';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { useProductosStore } from '../lib/store/productosStore';
import { formatCurrency, formatDateTimeUTC } from '../lib/utils/formatters';
import { getLocalDateStr } from '../lib/utils/time';
import { calculateVentasTotales } from '../lib/utils/ventasCalculations';
import { filterPedidosByCategoria, ModoFiltroCategorias } from '../lib/utils/orderFilters';
import { WidgetCuentasPorPagar } from "../components/WidgetCuentasPorPagar";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Link } from 'react-router-dom';

// Componente auxiliar para Tarjetas de Estadísticas (KPIs)
const StatCard = ({ title, value, subtext, icon: Icon, colorClass, bgClass }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${bgClass}`}>
      <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
  </div>
);

export function Dashboard() {
  const { pedidos, fetchPedidosConDetalles } = usePedidosStore();
  const { productos, fetchProductos } = useProductosStore();
  const [isLoading, setIsLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<ModoFiltroCategorias>('todos');

  // Carga inicial de datos consolidados
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchPedidosConDetalles(),
        fetchProductos()
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchPedidosConDetalles, fetchProductos]);

  // --- LÓGICA DE NEGOCIO Y CÁLCULOS ---

  // Helper para fechas locales (Misma lógica que Transacciones.tsx)
  // Usar la función centralizada de TimeZone de México
  const todayStr = getLocalDateStr(new Date());

  const stats = useMemo(() => {
    const activePedidos = pedidos.filter(p => !p.deleted_at);

    // 1. Métricas de VENTAS DE HOY (Completado + En Reparto)
    const ventasHoyBase = activePedidos.filter(p => {
      if (!p.insert_date) return false;
      return (
        getLocalDateStr(p.insert_date) === todayStr &&
        (p.estado_nombre === 'Completado' || p.estado_nombre === 'En Reparto')
      );
    });

    const ventasHoy = filterPedidosByCategoria(ventasHoyBase, filtroCategoria, 54);
    const totalVentasHoy = ventasHoy.reduce((sum, p) => sum + (p.total || 0), 0);

    // 2. Métricas de LOGÍSTICA (Envíos)
    const pedidosEnReparto = activePedidos.filter(p => p.estado_nombre === 'En Reparto');
    const pedidosDomicilioHoy = ventasHoy.filter(p => p.tipo_entrega_nombre === 'A domicilio');

    // 3. Métricas GENERALES
    const pendientes = activePedidos.filter(p => p.estado_nombre === 'Pendiente');
    const completados = activePedidos.filter(p => p.estado_nombre === 'Completado');

    // 4. Inventario Bajo (Productos activos con stock <= stock_minimo)
    const productosBajoStock = productos.filter(p =>
      p.activo && p.controlar_stock && (p.stock_actual <= p.stock_minimo)
    );

    return {
      ventasHoy: totalVentasHoy,
      pedidosHoyCount: ventasHoy.length,
      pendientesCount: pendientes.length,
      enRepartoCount: pedidosEnReparto.length,
      domicilioHoyCount: pedidosDomicilioHoy.length,
      completadosCount: completados.length,
      bajoStockCount: productosBajoStock.length,
      productosBajoStockList: productosBajoStock.slice(0, 5)
    };
  }, [pedidos, productos, todayStr, filtroCategoria]);

  // Gráfico: Ventas Últimos 7 Días (Completado + En Reparto)
  const chartDataVentas = useMemo(() => {
    const datos = [];
    const hoy = new Date();

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toLocaleDateString('en-CA');

      const ventasDiaBase = pedidos.filter(p =>
        !p.deleted_at &&
        (p.estado_nombre === 'Completado' || p.estado_nombre === 'En Reparto') &&
        getLocalDateStr(p.insert_date) === fechaStr
      );

      const ventasDia = filterPedidosByCategoria(ventasDiaBase, filtroCategoria, 54);
      const totalDia = ventasDia.reduce((sum, p) => sum + (p.total || 0), 0);

      datos.push({
        name: fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        ventas: totalDia,
        pedidos: ventasDia.length
      });
    }
    return datos;
  }, [pedidos, filtroCategoria]);

  // Gráfico: Distribución por Categoría (Completado + En Reparto)
  const chartDataCategorias = useMemo(() => {
    const pedidosFiltrados = filterPedidosByCategoria(pedidos, filtroCategoria, 54);
    const resultado = calculateVentasTotales(pedidosFiltrados, {
      estados: ['Completado', 'En Reparto']
    });

    return resultado.desglosePorCategoria.slice(0, 6);
  }, [pedidos, filtroCategoria]);

  const COLORES_CHART = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 font-medium animate-pulse">Analizando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* --- HEADER --- */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Operativo</h1>
              <p className="text-sm text-gray-500 mt-1">
                Resumen en tiempo real • {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/vender" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Nueva Venta
              </Link>
            </div>
          </div>

          <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setFiltroCategoria('todos')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'todos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos los Pedidos
            </button>
            <button
              onClick={() => setFiltroCategoria('solo_desayunos')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'solo_desayunos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Solo Desayunos
            </button>
            <button
              onClick={() => setFiltroCategoria('excluir_desayunos')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'excluir_desayunos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sin Desayunos (Turno Regular)
            </button>
          </div>
        </div>

        {/* --- GRID DE KPIs PRINCIPALES --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ventas Hoy */}
          <StatCard 
            title="Ventas de Hoy" 
            value={formatCurrency(stats.ventasHoy)} 
            subtext={`${stats.pedidosHoyCount} pedidos registrados`}
            icon={DollarSign} 
            colorClass="text-green-600" 
            bgClass="bg-green-50"
          />
          
          {/* Pedidos Pendientes */}
          <StatCard 
            title="Por Atender" 
            value={stats.pendientesCount} 
            subtext="Pedidos en cola"
            icon={Clock} 
            colorClass="text-orange-600" 
            bgClass="bg-orange-50"
          />

          {/* Envíos Activos */}
          <StatCard 
            title="En Ruta" 
            value={stats.enRepartoCount} 
            subtext={`De ${stats.domicilioHoyCount} a domicilio hoy`}
            icon={Truck} 
            colorClass="text-blue-600" 
            bgClass="bg-blue-50"
          />

          {/* Alertas Inventario */}
          <StatCard 
            title="Stock Crítico" 
            value={stats.bajoStockCount} 
            subtext="Productos requieren atención"
            icon={AlertTriangle} 
            colorClass="text-red-600" 
            bgClass="bg-red-50"
          />
        </div>

        {/* --- SECCIÓN PRINCIPAL: GRÁFICO Y ALERTAS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico de Tendencia (Ocupa 2 columnas) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" /> Tendencia de Ventas
                </h3>
                <p className="text-sm text-gray-400">Últimos 7 días</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataVentas}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 12}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 12}} 
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(val: number) => [formatCurrency(val), 'Venta Total']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorVentas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tarjeta Lateral: Alertas y Resumen */}
          <div className="space-y-6">
            
            {/* Lista de Stock Bajo */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-full">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Alertas de Inventario
              </h3>
              
              {stats.productosBajoStockList.length > 0 ? (
                <div className="space-y-3">
                  {stats.productosBajoStockList.map((prod) => (
                    <div key={prod.id} className="flex justify-between items-center p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                      <div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{prod.nombre}</p>
                        <p className="text-xs text-red-500 font-medium">Quedan: {prod.stock_actual} {prod.unidad_medida}</p>
                      </div>
                      <Link to="/insumos" className="text-xs text-gray-400 hover:text-indigo-600">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                  {stats.bajoStockCount > 5 && (
                    <div className="pt-2 text-center border-t border-gray-100">
                      <Link to="/productos" className="text-xs text-indigo-600 font-medium hover:underline">
                        Ver {stats.bajoStockCount - 5} más...
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">Inventario Saludable</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- SECCIÓN INFERIOR: CATEGORÍAS Y FINANZAS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico Pastel: Categorías */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" /> Top Categorías
            </h3>
            <div className="h-[250px] relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={chartDataCategorias}
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="total"
                     nameKey="nombre"
                   >
                     {chartDataCategorias.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORES_CHART[index % COLORES_CHART.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(val: number) => formatCurrency(val)} />
                   <Legend layout="vertical" verticalAlign="middle" align="right" />
                 </PieChart>
               </ResponsiveContainer>
            </div>
          </div>

          {/* Widget Financiero (Cuentas por Pagar) - Ocupa 2 columnas */}
          <div className="lg:col-span-2">
            <WidgetCuentasPorPagar />
          </div>
        </div>

      </div>
    </div>
  );
}