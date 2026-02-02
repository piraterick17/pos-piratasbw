import React, { useEffect, useState, useMemo } from 'react';
import {
  Truck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  MapPin,
  BarChart3,
  User,
  DollarSign,
  Gift,
  Coffee,
  Download,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { formatCurrency } from '../lib/utils/formatters';
import { getLocalDateStr } from '../lib/utils/time';
import { DateRangeSelector } from '../components/DateRangeSelector';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';

// Función helper para obtener el rango de "hoy"
function getInitialDateRange(): [string, string] {
  const now = new Date();
  const mexicoOffset = 6 * 60 * 60 * 1000;
  const mexicoTime = new Date(now.getTime() - mexicoOffset);

  const startOfDay = new Date(mexicoTime);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(mexicoTime);
  endOfDay.setHours(23, 59, 59, 999);

  return [startOfDay.toISOString(), endOfDay.toISOString()];
}

interface MetricasEntrega {
  total_entregas: number;
  entregadas: number;
  en_proceso: number;
  tiempo_promedio_minutos: number;
  entregas_urgentes: number;
  valor_total_entregas: number;
  envios_gratis: number;
  envios_con_pago: number;
  total_costo_envio: number;
  pedidos_con_desayunos: number;
  promedio_envios_gratis: number;
  promedio_envios_pagados: number;
}

interface EntregaPorRepartidor {
  repartidor_id: string;
  repartidor_nombre: string;
  total_entregas: number;
  entregas_completadas: number;
  tiempo_promedio: number;
  tasa_exito: number;
}

interface EntregaPorZona {
  zona_id: number;
  zona_nombre: string;
  total_entregas: number;
  tiempo_promedio: number;
  porcentaje: number;
  intensidad: number;
}

interface TendenciaData {
  fecha: string;
  total: number;
  gratis: number;
  pagadas: number;
}

export function DashboardEntregas() {
  // Inicializar fechas directamente con el rango de "hoy"
  const [initialStart, initialEnd] = getInitialDateRange();

  const [metricas, setMetricas] = useState<MetricasEntrega | null>(null);
  const [entregasPorRepartidor, setEntregasPorRepartidor] = useState<EntregaPorRepartidor[]>([]);
  const [entregasPorZona, setEntregasPorZona] = useState<EntregaPorZona[]>([]);
  const [tendenciaData, setTendenciaData] = useState<TendenciaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialEnd);
  const [showAllZonas, setShowAllZonas] = useState(false);

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Cargar datos cuando cambian las fechas
  useEffect(() => {
    if (startDate && endDate) {
      cargarDatos();
    }
  }, [startDate, endDate]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        cargarMetricas(),
        cargarEntregasPorRepartidor(),
        cargarEntregasPorZona(),
        cargarTendencia()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMetricas = async () => {
    try {

      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select(`
          id,
          total,
          insert_date,
          costo_envio,
          tipo_entrega_id
        `)
        .eq('tipo_entrega_id', 1)
        .gte('insert_date', startDate)
        .lte('insert_date', endDate)
        .is('deleted_at', null);

      if (pedidosError) {
        console.error('❌ Error en query pedidos:', pedidosError);
        throw pedidosError;
      }

      console.log(`✅ Pedidos encontrados: ${pedidos?.length || 0}`);

      const { data: asignaciones, error: asignacionesError } = await supabase
        .from('asignaciones_entrega')
        .select(`
          *,
          pedido:pedidos(
            id,
            total,
            insert_date,
            costo_envio
          ),
          repartidor:usuarios(
            id,
            nombre
          )
        `)
        .gte('fecha_asignacion', startDate)
        .lte('fecha_asignacion', endDate);

      if (asignacionesError) {
        console.error('❌ Error en query asignaciones:', asignacionesError);
        throw asignacionesError;
      }

      console.log(`✅ Asignaciones encontradas: ${asignaciones?.length || 0}`);

      const ahora = new Date();

      const enProceso = asignaciones?.filter(a =>
        ['asignado', 'recogido', 'en_camino'].includes(a.estado)
      ) || [];

      const entregasCompletadas = asignaciones?.filter(a =>
        a.estado === 'entregado'
      ) || [];

      const entregasUrgentes = enProceso.filter(a => {
        if (!a.pedido?.insert_date) return false;
        const tiempoEspera = (ahora.getTime() - new Date(a.pedido.insert_date).getTime()) / 60000;
        return tiempoEspera > 45;
      });

      const entregasConTiempo = entregasCompletadas.filter(a => a.tiempo_total_minutos);
      const tiempoPromedio = entregasConTiempo.length > 0
        ? entregasConTiempo.reduce((sum, a) => sum + (a.tiempo_total_minutos || 0), 0) / entregasConTiempo.length
        : 0;

      const valorTotal = asignaciones?.reduce((sum, a) =>
        sum + (a.pedido?.total || 0), 0
      ) || 0;

      const enviosGratis = pedidos?.filter(p => !p.costo_envio || p.costo_envio === 0).length || 0;
      const enviosConPago = pedidos?.filter(p => p.costo_envio && p.costo_envio > 0).length || 0;
      const totalCostoEnvio = pedidos?.reduce((sum, p) => sum + (p.costo_envio || 0), 0) || 0;

      console.log('💰 Envíos gratis:', enviosGratis, 'Envíos con pago:', enviosConPago);

      let pedidosConDesayunos = 0;

      if (pedidos && pedidos.length > 0) {
        const pedidosIds = pedidos.map(p => p.id);

        const { data: detallesConDesayunos, error: desayunosError } = await supabase
          .from('detalles_pedido')
          .select(`
            pedido_id,
            productos!inner(
              categoria_id,
              categorias!inner(nombre)
            )
          `)
          .in('pedido_id', pedidosIds);

        if (!desayunosError && detallesConDesayunos) {
          const pedidosIdsConDesayuno = new Set();
          detallesConDesayunos.forEach((detalle: any) => {
            const nombreCategoria = detalle.productos?.categorias?.nombre?.toLowerCase() || '';
            if (nombreCategoria.includes('desayuno')) {
              pedidosIdsConDesayuno.add(detalle.pedido_id);
            }
          });
          pedidosConDesayunos = pedidosIdsConDesayuno.size;
          console.log('🥞 Pedidos con desayunos:', pedidosConDesayunos);
        }
      }

      const pedidosGratis = pedidos?.filter(p => !p.costo_envio || p.costo_envio === 0) || [];
      const pedidosPagados = pedidos?.filter(p => p.costo_envio && p.costo_envio > 0) || [];

      const promedioGratis = pedidosGratis.length > 0
        ? pedidosGratis.reduce((sum, p) => sum + (p.total || 0), 0) / pedidosGratis.length
        : 0;

      const promedioPagados = pedidosPagados.length > 0
        ? pedidosPagados.reduce((sum, p) => sum + (p.total || 0), 0) / pedidosPagados.length
        : 0;

      const metricasCalculadas = {
        total_entregas: pedidos?.length || 0,
        entregadas: entregasCompletadas.length,
        en_proceso: enProceso.length,
        tiempo_promedio_minutos: Math.round(tiempoPromedio),
        entregas_urgentes: entregasUrgentes.length,
        valor_total_entregas: valorTotal,
        envios_gratis: enviosGratis,
        envios_con_pago: enviosConPago,
        total_costo_envio: totalCostoEnvio,
        pedidos_con_desayunos: pedidosConDesayunos,
        promedio_envios_gratis: promedioGratis,
        promedio_envios_pagados: promedioPagados
      };

      console.log('📈 Métricas calculadas:', metricasCalculadas);
      setMetricas(metricasCalculadas);

    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
      throw error;
    }
  };

  const cargarEntregasPorRepartidor = async () => {
    console.log('👤 Cargando entregas por repartidor...');
    try {
      const { data: asignaciones, error } = await supabase
        .from('asignaciones_entrega')
        .select(`
          *,
          repartidor:usuarios!repartidor_id(
            id,
            nombre
          )
        `)
        .gte('fecha_asignacion', startDate)
        .lte('fecha_asignacion', endDate)
        .not('repartidor_id', 'is', null);

      if (error) {
        console.error('❌ Error en query repartidores:', error);
        throw error;
      }

      console.log(`✅ Asignaciones de repartidores: ${asignaciones?.length || 0}`);

      const repartidoresMap = new Map<string, EntregaPorRepartidor>();
      asignaciones?.forEach(a => {
        if (!a.repartidor_id || !a.repartidor) return;

        if (!repartidoresMap.has(a.repartidor_id)) {
          repartidoresMap.set(a.repartidor_id, {
            repartidor_id: a.repartidor_id,
            repartidor_nombre: a.repartidor.nombre,
            total_entregas: 0,
            entregas_completadas: 0,
            tiempo_promedio: 0,
            tasa_exito: 0
          });
        }

        const rep = repartidoresMap.get(a.repartidor_id)!;
        rep.total_entregas++;
        if (a.estado === 'entregado') {
          rep.entregas_completadas++;
          if (a.tiempo_total_minutos) {
            rep.tiempo_promedio += a.tiempo_total_minutos;
          }
        }
      });

      const repArray = Array.from(repartidoresMap.values()).map(rep => ({
        ...rep,
        tiempo_promedio: rep.entregas_completadas > 0
          ? Math.round(rep.tiempo_promedio / rep.entregas_completadas)
          : 0,
        tasa_exito: rep.total_entregas > 0
          ? Math.round((rep.entregas_completadas / rep.total_entregas) * 100)
          : 0
      }));

      repArray.sort((a, b) => b.entregas_completadas - a.entregas_completadas);
      console.log(`👥 Total repartidores procesados: ${repArray.length}`);
      setEntregasPorRepartidor(repArray);

    } catch (error) {
      console.error('❌ Error cargando repartidores:', error);
      throw error;
    }
  };

  const cargarEntregasPorZona = async () => {
    console.log('🗺️ Cargando entregas por zona...');
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          zona_entrega_id,
          zonas_entrega(
            id,
            nombre
          ),
          asignaciones_entrega(
            id,
            estado,
            tiempo_total_minutos
          )
        `)
        .eq('tipo_entrega_id', 1)
        .gte('insert_date', startDate)
        .lte('insert_date', endDate)
        .is('deleted_at', null);

      if (error) {
        console.error('❌ Error en query zonas:', error);
        throw error;
      }

      console.log(`✅ Pedidos para análisis de zonas: ${pedidos?.length || 0}`);

      const zonasMap = new Map<number, EntregaPorZona>();
      let totalEntregas = 0;

      pedidos?.forEach(p => {
        if (!p.zona_entrega_id || !p.zonas_entrega) return;

        const zonaId = p.zona_entrega_id;
        const zonaNombre = p.zonas_entrega.nombre;

        if (!zonasMap.has(zonaId)) {
          zonasMap.set(zonaId, {
            zona_id: zonaId,
            zona_nombre: zonaNombre,
            total_entregas: 0,
            tiempo_promedio: 0,
            porcentaje: 0,
            intensidad: 0
          });
        }

        const zona = zonasMap.get(zonaId)!;
        zona.total_entregas++;
        totalEntregas++;

        if (p.asignaciones_entrega?.[0]?.tiempo_total_minutos) {
          zona.tiempo_promedio += p.asignaciones_entrega[0].tiempo_total_minutos;
        }
      });

      const maxEntregas = Math.max(...Array.from(zonasMap.values()).map(z => z.total_entregas));

      const zonasArray = Array.from(zonasMap.values()).map(z => ({
        ...z,
        tiempo_promedio: z.total_entregas > 0
          ? Math.round(z.tiempo_promedio / z.total_entregas)
          : 0,
        porcentaje: totalEntregas > 0
          ? Math.round((z.total_entregas / totalEntregas) * 100)
          : 0,
        intensidad: maxEntregas > 0
          ? Math.round((z.total_entregas / maxEntregas) * 100)
          : 0
      }));

      zonasArray.sort((a, b) => b.total_entregas - a.total_entregas);
      console.log(`🌍 Total zonas procesadas: ${zonasArray.length}`);
      setEntregasPorZona(zonasArray);

    } catch (error) {
      console.error('❌ Error cargando zonas:', error);
      throw error;
    }
  };

  const cargarTendencia = async () => {
    console.log('📊 Cargando tendencia de entregas...');
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('id, insert_date, costo_envio')
        .eq('tipo_entrega_id', 1)
        .gte('insert_date', startDate)
        .lte('insert_date', endDate)
        .is('deleted_at', null)
        .order('insert_date');

      if (error) {
        console.error('❌ Error en query tendencia:', error);
        throw error;
      }

      console.log(`✅ Pedidos para tendencia: ${pedidos?.length || 0}`);

      const dataByDate = new Map<string, { total: number; gratis: number; pagadas: number }>();

      pedidos?.forEach(p => {
        const fecha = getLocalDateStr(p.insert_date);
        if (!dataByDate.has(fecha)) {
          dataByDate.set(fecha, { total: 0, gratis: 0, pagadas: 0 });
        }

        const data = dataByDate.get(fecha)!;
        data.total++;

        if (!p.costo_envio || p.costo_envio === 0) {
          data.gratis++;
        } else {
          data.pagadas++;
        }
      });

      const tendenciaArray: TendenciaData[] = Array.from(dataByDate.entries())
        .map(([fecha, data]) => ({
          fecha,
          total: data.total,
          gratis: data.gratis,
          pagadas: data.pagadas
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      console.log(`📈 Días con datos de tendencia: ${tendenciaArray.length}`);
      setTendenciaData(tendenciaArray);

    } catch (error) {
      console.error('❌ Error cargando tendencia:', error);
      throw error;
    }
  };

  const getColorForIntensity = (intensity: number): string => {
    if (intensity >= 80) return 'bg-red-500';
    if (intensity >= 60) return 'bg-orange-500';
    if (intensity >= 40) return 'bg-yellow-500';
    if (intensity >= 20) return 'bg-green-400';
    return 'bg-green-200';
  };

  const zonasToShow = useMemo(() => {
    return showAllZonas ? entregasPorZona : entregasPorZona.slice(0, 10);
  }, [entregasPorZona, showAllZonas]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading && !metricas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              Dashboard de Entregas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Análisis completo del sistema de entregas a domicilio
            </p>
          </div>
        </div>

        <DateRangeSelector onRangeChange={handleDateRangeChange} />

        {metricas && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Total Entregas</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {metricas.total_entregas}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Envíos Gratis</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {metricas.envios_gratis}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {metricas.total_entregas > 0
                        ? `${Math.round((metricas.envios_gratis / metricas.total_entregas) * 100)}%`
                        : '0%'} del total
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Envíos con Pago</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      {metricas.envios_con_pago}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(metricas.total_costo_envio)} total
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Con Desayunos</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {metricas.pedidos_con_desayunos}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {metricas.total_entregas > 0
                        ? `${Math.round((metricas.pedidos_con_desayunos / metricas.total_entregas) * 100)}%`
                        : '0%'} del total
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Tiempo Promedio</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {metricas.tiempo_promedio_minutos}
                      <span className="text-sm text-gray-500"> min</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-teal-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Entregas Urgentes</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {metricas.entregas_urgentes}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Más de 45 min</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Tendencia de Entregas
                </h3>
                <div className="text-xs text-gray-500">
                  Mostrando {tendenciaData.length} días
                </div>
              </div>

              {tendenciaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tendenciaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '14px' }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Total Entregas"
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gratis"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Envíos Gratis"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pagadas"
                      stroke="#f97316"
                      strokeWidth={2}
                      name="Envíos con Pago"
                      dot={{ fill: '#f97316', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No hay datos suficientes para mostrar la tendencia</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                    Mapa de Calor por Zonas
                  </h3>
                  {entregasPorZona.length > 10 && (
                    <button
                      onClick={() => setShowAllZonas(!showAllZonas)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showAllZonas ? 'Ver menos' : 'Ver todas'}
                    </button>
                  )}
                </div>

                {entregasPorZona.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay datos de zonas en este período</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 text-xs">
                      <span className="text-gray-600">Menos entregas</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-green-200 rounded"></div>
                        <div className="w-4 h-4 bg-green-400 rounded"></div>
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                      </div>
                      <span className="text-gray-600">Más entregas</span>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {zonasToShow.map((zona) => (
                        <div
                          key={zona.zona_id}
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <div className={`w-4 h-4 rounded ${getColorForIntensity(zona.intensidad)} mr-3 flex-shrink-0`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{zona.zona_nombre}</p>
                            <p className="text-xs text-gray-500">
                              {zona.tiempo_promedio} min promedio
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-gray-900">{zona.total_entregas}</p>
                            <p className="text-xs text-gray-500">{zona.porcentaje}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Desempeño por Repartidor
                </h3>

                {entregasPorRepartidor.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay datos de repartidores en este período</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {entregasPorRepartidor.map((rep, index) => (
                      <div key={rep.repartidor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{rep.repartidor_nombre}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-600">
                                {rep.entregas_completadas} entregas
                              </span>
                              <span className="text-xs text-gray-600">
                                {rep.tiempo_promedio} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${rep.tasa_exito}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {rep.tasa_exito}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
