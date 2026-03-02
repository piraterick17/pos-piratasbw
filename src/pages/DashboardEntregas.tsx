import { useEffect, useState, useMemo } from 'react';
import {
  Truck,
  TrendingUp,
  MapPin,
  BarChart3,
  DollarSign,
  Gift,
  Coffee,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { formatCurrency } from '../lib/utils/format';
import { getDateRangeMexico, getLocalDateStr } from '../lib/utils/time';
import { DateRangeSelector } from '../components/DateRangeSelector';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// El rango inicial ahora usa la utilidad centralizada de México
function getInitialDateRange(): [string, string] {
  return getDateRangeMexico('today');
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

export function DashboardEntregas({ dateRange, hideHeader }: { dateRange?: { start: string; end: string }, hideHeader?: boolean }) {
  const [initialStart, initialEnd] = useMemo(() => {
    if (dateRange) return [dateRange.start, dateRange.end];
    return getInitialDateRange();
  }, [dateRange]);

  const [metricas, setMetricas] = useState<MetricasEntrega | null>(null);
  const [entregasPorZona, setEntregasPorZona] = useState<EntregaPorZona[]>([]);
  const [zonasTarde, setZonasTarde] = useState<EntregaPorZona[]>([]);
  const [tendenciaData, setTendenciaData] = useState<TendenciaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialEnd);
  const [showAllZonas, setShowAllZonas] = useState(false);
  const [metricasManana, setMetricasManana] = useState<{ entregas: number; costo_envio_total: number }>({ entregas: 0, costo_envio_total: 0 });
  const [metricasTardeState, setMetricasTardeState] = useState<{ entregas: number; costo_envio_total: number }>({ entregas: 0, costo_envio_total: 0 });

  // Helper: obtener hora local de México desde un string UTC
  const getMexicoHour = (dateStr: string): number => {
    const date = new Date(dateStr);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      hour: 'numeric',
      hour12: false
    });
    return parseInt(formatter.format(date), 10);
  };

  useEffect(() => {
    if (dateRange) {
      setStartDate(dateRange.start);
      setEndDate(dateRange.end);
    }
  }, [dateRange]);

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

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

      // ── Métricas por turno (hora local de México) ──
      const pedidosManana = pedidos?.filter(p => {
        const hour = getMexicoHour(p.insert_date);
        return hour >= 8 && hour < 14;
      }) || [];

      const pedidosTardeArr = pedidos?.filter(p => {
        const hour = getMexicoHour(p.insert_date);
        return hour >= 14 && hour < 23;
      }) || [];

      setMetricasManana({
        entregas: pedidosManana.length,
        costo_envio_total: pedidosManana
          .filter(p => p.costo_envio && p.costo_envio > 0)
          .reduce((sum, p) => sum + (p.costo_envio || 0), 0)
      });

      setMetricasTardeState({
        entregas: pedidosTardeArr.length,
        costo_envio_total: pedidosTardeArr
          .filter(p => p.costo_envio && p.costo_envio > 0)
          .reduce((sum, p) => sum + (p.costo_envio || 0), 0)
      });

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

  const cargarEntregasPorZona = async () => {
    console.log('🗺️ Cargando entregas por zona...');
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          insert_date,
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
        const zonaNombre = Array.isArray(p.zonas_entrega)
          ? p.zonas_entrega[0]?.nombre
          : (p.zonas_entrega as any)?.nombre || 'Zona desconocida';

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

      // ── Distribución de zonas del turno vespertino (2pm–11pm MX) ──
      const pedidosTardeZona = pedidos?.filter(p => {
        if (!p.insert_date || !p.zona_entrega_id || !p.zonas_entrega) return false;
        const hour = getMexicoHour(p.insert_date);
        return hour >= 14 && hour < 23;
      }) || [];

      const zonasTardeMap = new Map<number, EntregaPorZona>();
      let totalTarde = 0;

      pedidosTardeZona.forEach(p => {
        const zonaId = p.zona_entrega_id!;
        const zonaNombre = Array.isArray(p.zonas_entrega)
          ? p.zonas_entrega[0]?.nombre
          : (p.zonas_entrega as any)?.nombre || 'Zona desconocida';

        if (!zonasTardeMap.has(zonaId)) {
          zonasTardeMap.set(zonaId, {
            zona_id: zonaId,
            zona_nombre: zonaNombre,
            total_entregas: 0,
            tiempo_promedio: 0,
            porcentaje: 0,
            intensidad: 0
          });
        }

        zonasTardeMap.get(zonaId)!.total_entregas++;
        totalTarde++;
      });

      const maxTarde = Math.max(0, ...Array.from(zonasTardeMap.values()).map(z => z.total_entregas));
      const zonasTardeArray = Array.from(zonasTardeMap.values()).map(z => ({
        ...z,
        porcentaje: totalTarde > 0 ? Math.round((z.total_entregas / totalTarde) * 100) : 0,
        intensidad: maxTarde > 0 ? Math.round((z.total_entregas / maxTarde) * 100) : 0
      }));
      zonasTardeArray.sort((a, b) => b.total_entregas - a.total_entregas);
      setZonasTarde(zonasTardeArray);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
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
        {!hideHeader && (
          <>
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
          </>
        )}

        {metricas && (
          <>
            {/* Tarjetas de métricas generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

            {/* Métricas por Turno */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Sun className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Turno Matutino</h4>
                    <p className="text-xs text-gray-500">8:00 AM – 2:00 PM</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Entregas</p>
                    <p className="text-2xl font-bold text-amber-700">{metricasManana.entregas}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Ingresos Envío</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(metricasManana.costo_envio_total)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Moon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Turno Vespertino</h4>
                    <p className="text-xs text-gray-500">2:00 PM – 11:00 PM</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Entregas</p>
                    <p className="text-2xl font-bold text-indigo-700">{metricasTardeState.entregas}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Ingresos Envío</p>
                    <p className="text-2xl font-bold text-indigo-700">{formatCurrency(metricasTardeState.costo_envio_total)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tendencia de Entregas */}
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

            {/* Zonas: General + Vespertino */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mapa de Calor por Zonas (todas) */}
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

              {/* Distribución Zonas Vespertino (2pm–11pm) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Moon className="w-5 h-5 mr-2 text-indigo-600" />
                    Zonas Turno Vespertino
                  </h3>
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium">2:00 PM – 11:00 PM</span>
                </div>

                {zonasTarde.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay datos de zonas vespertinas en este período</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {zonasTarde.map((zona) => (
                      <div
                        key={zona.zona_id}
                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded ${getColorForIntensity(zona.intensidad)} mr-3 flex-shrink-0`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{zona.zona_nombre}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-gray-900">{zona.total_entregas}</p>
                          <p className="text-xs text-gray-500">{zona.porcentaje}%</p>
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
