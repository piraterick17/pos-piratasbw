import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Users, Clock, Award, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { formatCurrency } from '../lib/utils/formatters';
import { getDateRangeMexico, getLocalDateStr } from '../lib/utils/time';
import { filterProductosByCategoria, filterPedidosByCategoria, ModoFiltroCategorias } from '../lib/utils/orderFilters';
import { usePedidosStore } from '../lib/store/pedidosStore';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import toast from 'react-hot-toast';

interface MetricasVendedor {
  vendedor_id: string;
  vendedor_email: string;
  vendedor_nombre: string;
  total_ventas: number;
  veces_ofrecio_acompanamiento: number;
  veces_acepto_acompanamiento: number;
  veces_ofrecio_postre: number;
  veces_acepto_postre: number;
  tasa_conversion_acompanamiento: number;
  tasa_conversion_postre: number;
  tiempo_entrega_promedio: number;
}

interface ProductoTopVenta {
  producto_id: number;
  producto_nombre: string;
  categoria_nombre: string;
  unidades_vendidas: number;
  ingresos_totales: number;
  cantidad_pedidos: number;
}

interface TendenciaTiempo {
  hora: number;
  dia_semana: number;
  cantidad_pedidos: number;
  tiempo_promedio: number;
  tiempo_minimo: number;
  tiempo_maximo: number;
}

interface ResumenVentas {
  total_pedidos: number;
  pedidos_completados: number;
  pedidos_pendientes: number;
  ingresos_totales: number;
  ticket_promedio: number;
  tiempo_entrega_promedio: number;
}

export default function Analytics() {
  const { pedidos, fetchPedidosConDetalles } = usePedidosStore();
  const [isLoading, setIsLoading] = useState(true);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<'hoy' | 'semana' | 'mes'>('hoy');
  const [filtroCategoria, setFiltroCategoria] = useState<ModoFiltroCategorias>('todos');
  const [metricasVendedores, setMetricasVendedores] = useState<MetricasVendedor[]>([]);
  const [productosTop, setProductosTop] = useState<ProductoTopVenta[]>([]);
  const [tendenciasTiempo, setTendenciasTiempo] = useState<TendenciaTiempo[]>([]);
  const [resumenVentas, setResumenVentas] = useState<ResumenVentas | null>(null);

  const obtenerFechasPeriodo = () => {
    // Usar las fechas convertidas a zona de México
    const [fechaInicio, fechaFin] = getDateRangeMexico(
      periodoSeleccionado === 'hoy' ? 'today' : periodoSeleccionado === 'semana' ? 'week' : 'month'
    );

    return {
      fechaInicio,
      fechaFin,
    };
  };

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const { fechaInicio, fechaFin } = obtenerFechasPeriodo();

      const [
        metricasResponse,
        productosResponse,
        tendenciasResponse,
        resumenResponse,
        _,
      ] = await Promise.all([
        supabase.from('v_metricas_vendedores').select('*'),
        supabase.rpc('get_productos_top_ventas', {
          p_fecha_inicio: fechaInicio,
          p_fecha_fin: fechaFin,
          p_limite: 10,
        }),
        supabase.rpc('get_tendencia_tiempos_entrega', {
          p_fecha_inicio: fechaInicio,
          p_fecha_fin: fechaFin,
        }),
        supabase.rpc('get_resumen_ventas_dia', {
          p_fecha: getLocalDateStr(new Date()),
        }),
        fetchPedidosConDetalles(),
      ]);

      if (metricasResponse.error) throw metricasResponse.error;
      if (productosResponse.error) throw productosResponse.error;
      if (tendenciasResponse.error) throw tendenciasResponse.error;
      if (resumenResponse.error) throw resumenResponse.error;

      setMetricasVendedores(metricasResponse.data || []);
      setProductosTop(productosResponse.data || []);
      setTendenciasTiempo(tendenciasResponse.data || []);
      setResumenVentas(resumenResponse.data?.[0] || null);
    } catch (error) {
      console.error('Error cargando analytics:', error);
      toast.error('Error al cargar los datos de análisis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [periodoSeleccionado]);

  const productosTopFiltrados = useMemo(() => {
    return filterProductosByCategoria(productosTop, filtroCategoria, 'Desayunos');
  }, [productosTop, filtroCategoria]);

  const resumenVentasFiltrado = useMemo(() => {
    if (!resumenVentas) return null;

    const todayStr = getLocalDateStr(new Date());
    const pedidosHoy = pedidos.filter(p => {
      if (!p.insert_date) return false;
      return (
        getLocalDateStr(p.insert_date) === todayStr &&
        (p.estado_nombre === 'Completado' || p.estado_nombre === 'En Reparto')
      );
    });

    const pedidosFiltrados = filterPedidosByCategoria(pedidosHoy, filtroCategoria, 54);

    const ingresos_totales = pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0);
    const ticket_promedio = pedidosFiltrados.length > 0
      ? ingresos_totales / pedidosFiltrados.length
      : 0;

    return {
      ...resumenVentas,
      ingresos_totales,
      ticket_promedio,
    };
  }, [resumenVentas, pedidos, filtroCategoria]);

  const getDiaSemanaLabel = (dia: number) => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[dia];
  };

  const datosGraficoTiempos = tendenciasTiempo.map(t => ({
    hora: `${t.hora}:00`,
    promedio: t.tiempo_promedio,
    minimo: t.tiempo_minimo,
    maximo: t.tiempo_maximo,
  }));

  const datosRadarVendedores = metricasVendedores.slice(0, 5).map(v => ({
    vendedor: v.vendedor_nombre || v.vendedor_email?.split('@')[0] || 'Sin nombre',
    ventas: v.total_ventas,
    conversionAcomp: v.tasa_conversion_acompanamiento,
    conversionPostre: v.tasa_conversion_postre,
    tiempoEntrega: Math.round(v.tiempo_entrega_promedio),
  }));

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando análisis...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Análisis Avanzado</h1>
              <p className="text-gray-600 mt-1">Panel de métricas y tendencias del negocio</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPeriodoSeleccionado('hoy')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  periodoSeleccionado === 'hoy'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setPeriodoSeleccionado('semana')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  periodoSeleccionado === 'semana'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                7 Días
              </button>
              <button
                onClick={() => setPeriodoSeleccionado('mes')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  periodoSeleccionado === 'mes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                30 Días
              </button>
            </div>
          </div>

          <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setFiltroCategoria('todos')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'todos'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos los Pedidos
            </button>
            <button
              onClick={() => setFiltroCategoria('solo_desayunos')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'solo_desayunos'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Solo Desayunos
            </button>
            <button
              onClick={() => setFiltroCategoria('excluir_desayunos')}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'excluir_desayunos'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sin Desayunos (Turno Regular)
            </button>
          </div>
        </div>

        {resumenVentasFiltrado && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ingresos del Día</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(resumenVentasFiltrado.ingresos_totales)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {resumenVentasFiltrado.pedidos_completados} de {resumenVentasFiltrado.total_pedidos} pedidos completados
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(resumenVentasFiltrado.ticket_promedio)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Promedio por pedido
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Tiempo de Entrega</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Math.round(resumenVentasFiltrado.tiempo_entrega_promedio)} min
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Promedio de entrega prometido
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Desempeño de Vendedores</h3>
            </div>

            {metricasVendedores.length > 0 ? (
              <div className="space-y-4">
                {metricasVendedores.slice(0, 5).map((vendedor, index) => (
                  <div key={vendedor.vendedor_id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {vendedor.vendedor_nombre || vendedor.vendedor_email}
                          </p>
                          <p className="text-sm text-gray-500">{vendedor.total_ventas} ventas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {vendedor.tasa_conversion_acompanamiento >= 50 && (
                            <Award className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Conversión Acompañamiento</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {vendedor.tasa_conversion_acompanamiento.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Conversión Postre</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {vendedor.tasa_conversion_postre.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos de vendedores disponibles</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Clock className="w-5 h-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Tendencias de Tiempo de Entrega</h3>
            </div>

            {datosGraficoTiempos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={datosGraficoTiempos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="promedio"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="Promedio"
                  />
                  <Line
                    type="monotone"
                    dataKey="maximo"
                    stroke="#EF4444"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="Máximo"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos de tiempos disponibles</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top 10 Productos Más Vendidos</h3>
          </div>

          {productosTopFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidades Vendidas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productosTopFiltrados.map((producto, index) => (
                    <tr key={producto.producto_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{producto.producto_nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.categoria_nombre || 'Sin categoría'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {producto.unidades_vendidas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(producto.ingresos_totales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {producto.cantidad_pedidos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay datos de productos disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
