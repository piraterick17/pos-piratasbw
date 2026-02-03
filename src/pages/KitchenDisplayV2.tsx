import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, ChefHat, AlertTriangle, RefreshCw, Play, Check, TrendingUp, ShoppingBag, Home, ChevronRight, LayoutDashboard } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';

interface Estacion {
  id: string;
  nombre: string;
  orden: number;
  color: string;
  active: boolean;
}

interface ProgresoPedido {
  total_items: number;
  items_listos: number;
  porcentaje_completado: number;
}

interface CocinaItem {
  id: string;
  pedido_id: number;
  detalle_pedido_id: number;
  estacion_id: string;
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado';
  prioridad: number;
  tiempo_estimado: number;
  inicio_preparacion: string | null;
  fin_preparacion: string | null;
  notas: string | null;
  created_at: string;
  pedido: {
    id: number;
    estado_id: number;
    tipo_entrega?: {
      nombre: string;
    };
    cliente: {
      nombre: string;
    } | null;
  };
  detalle: {
    cantidad: number;
    producto: {
      nombre: string;
    };
  };
  progreso?: ProgresoPedido;
}

const getMinutosTranscurridos = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / 60000);
};


const ItemCard: React.FC<{
  item: CocinaItem;
  onStatusChange: (itemId: string, nuevoEstado: string) => void;
}> = ({
  item,
  onStatusChange,
}) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const minutosTranscurridos = item.inicio_preparacion
      ? getMinutosTranscurridos(item.inicio_preparacion)
      : getMinutosTranscurridos(item.created_at);

    const porcentajeCompletado = item.tiempo_estimado
      ? Math.min((minutosTranscurridos / item.tiempo_estimado) * 100, 100)
      : 0;

    // Sistema de urgencia dinámico
    const isLento = minutosTranscurridos >= 12;
    const isAdvertencia = minutosTranscurridos >= 8 && minutosTranscurridos < 12;

    const urgencyClass = isLento
      ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse-subtle'
      : isAdvertencia
        ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
        : 'border-white/20';

    const timerColor = isLento
      ? 'text-rose-600'
      : isAdvertencia
        ? 'text-amber-600'
        : 'text-emerald-600';

    const handleClick = async () => {
      let nuevoEstado: string;
      if (item.estado === 'pendiente') {
        nuevoEstado = 'preparando';
      } else if (item.estado === 'preparando') {
        nuevoEstado = 'listo';
      } else {
        return;
      }

      setIsUpdating(true);
      try {
        await onStatusChange(item.id, nuevoEstado);
      } finally {
        setIsUpdating(false);
      }
    };

    const tipoEntregaNombre = item.pedido.tipo_entrega?.nombre || 'Local';
    const isDomicilio = tipoEntregaNombre.toLowerCase().includes('domicilio');

    return (
      <div
        className={`group relative bg-white/90 backdrop-blur-md rounded-2xl border-2 ${urgencyClass} p-4 md:p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isUpdating ? 'opacity-50 grayscale' : ''
          }`}
        onClick={handleClick}
      >
        {/* Badge de Entrega */}
        <div className={`absolute -top-3 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 shadow-md border ${isDomicilio ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-amber-500 text-white border-amber-300'
          }`}>
          {isDomicilio ? <Home className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
          {tipoEntregaNombre}
        </div>

        <div className="flex items-start justify-between mb-4 mt-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-xl text-gray-900 leading-none">
                #{item.pedido.id}
              </h3>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded leading-none">
                {item.estado}
              </span>
            </div>
            {item.pedido.cliente && (
              <p className="text-xs font-bold text-gray-500 truncate">{item.pedido.cliente.nombre}</p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className={`flex items-center justify-end gap-1.5 ${timerColor}`}>
              <Clock className={`w-4 h-4 ${isLento ? 'animate-spin-slow' : ''}`} />
              <span className="font-black text-2xl tabular-nums leading-none tracking-tighter">{minutosTranscurridos}m</span>
            </div>
            <div className="flex items-center justify-end gap-1 mt-1">
              <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${isLento ? 'bg-rose-500' : isAdvertencia ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${porcentajeCompletado}%` }}
                />
              </div>
              {item.tiempo_estimado && (
                <span className="text-[10px] font-black text-gray-400">/{item.tiempo_estimado}m</span>
              )}
            </div>
          </div>
        </div>

        {/* PRODUCTO PRINCIPAL - HIGH VISIBILITY */}
        <div className="mb-4 bg-gray-50/50 rounded-xl p-3 border border-gray-100 shadow-inner group-hover:bg-white transition-colors duration-300">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600 leading-none">{item.detalle.cantidad}x</span>
            <span className="text-xl font-black text-gray-900 items-center uppercase tracking-tight leading-tight">
              {item.detalle.producto.nombre}
            </span>
          </div>
        </div>

        {/* Notas destacadas */}
        {item.notas && (
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border-l-4 border-amber-400 shadow-sm animate-pulse-subtle">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Observaciones:</span>
            </div>
            <p className="text-sm font-bold text-amber-900 italic leading-snug">{item.notas}</p>
          </div>
        )}

        {/* Progreso del pedido completo - Minimalista */}
        {item.progreso && item.progreso.total_items > 1 && (
          <div className="mb-4 p-2.5 bg-blue-50/40 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                Estado del Pedido completo
              </span>
              <span className="text-[10px] font-black text-blue-700">
                {item.progreso.items_listos}/{item.progreso.total_items} listos
              </span>
            </div>
            <div className="w-full bg-blue-100/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${item.progreso.porcentaje_completado}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-2 space-y-2">
          {item.estado === 'pendiente' && (
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 active:scale-95">
              <Play className="w-4 h-4 fill-current" />
              Iniciar Preparación
            </button>
          )}
          {item.estado === 'preparando' && (
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 active:scale-95">
              <Check className="w-5 h-5 stroke-[3px]" />
              Marcar Listo
            </button>
          )}
          {item.estado === 'listo' && (
            <div className="w-full bg-emerald-100 text-emerald-800 h-12 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs border border-emerald-200">
              <CheckCircle className="w-5 h-5" />
              Listo para Entrega
            </div>
          )}
        </div>

        {/* Efecto decorativo de urgencia */}
        {isLento && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500 rounded-b-2xl blur-[2px] opacity-50" />
        )}
      </div>
    );
  };

export function KitchenDisplayV2() {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [items, setItems] = useState<CocinaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [estacionActiva, setEstacionActiva] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  const loadEstaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('estaciones_cocina')
        .select('*')
        .eq('active', true)
        .order('orden', { ascending: true });

      if (error) {
        console.error('Error loading estaciones:', error);
        toast.error(`Error al cargar estaciones: ${error.message}`);
        throw error;
      }

      if (!data || data.length === 0) {
        toast.error('No hay estaciones de cocina configuradas');
        setEstaciones([]);
        return;
      }

      setEstaciones(data);
      if (!estacionActiva) {
        setEstacionActiva(data[0].id);
      }
    } catch (error: any) {
      console.error('Error loading estaciones:', error);
      setEstaciones([]);
    }
  };

  const loadProgresoPedido = async (pedidoId: number): Promise<ProgresoPedido> => {
    try {
      const { data, error } = await supabase
        .rpc('obtener_progreso_pedido', { p_pedido_id: pedidoId });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0];
      }

      return { total_items: 0, items_listos: 0, porcentaje_completado: 0 };
    } catch (error) {
      console.error('Error loading progreso:', error);
      return { total_items: 0, items_listos: 0, porcentaje_completado: 0 };
    }
  };

  const loadItems = async () => {
    try {
      const query = supabase
        .from('cocina_items')
        .select(
          `
          *,
          pedido:pedidos!cocina_items_pedido_id_fkey(
            id,
            estado_id,
            cliente:clientes(nombre),
            tipo_entrega:tipos_entrega(nombre)
          ),
          detalle:detalles_pedido!cocina_items_detalle_pedido_id_fkey(
            cantidad,
            producto:productos(nombre)
          )
        `
        )
        .in('estado', ['pendiente', 'preparando', 'listo'])
        .order('prioridad', { ascending: false })
        .order('created_at', { ascending: true });

      if (estacionActiva) {
        query.eq('estacion_id', estacionActiva);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading items:', error);
        toast.error(`Error al cargar items: ${error.message}`);
        throw error;
      }

      // Obtener los estados de pedidos completados y cancelados
      const { data: estadosData } = await supabase
        .from('estados_pedido')
        .select('id, nombre')
        .in('nombre', ['Completado', 'Cancelado']);

      const estadosExcluidos = estadosData?.map(e => e.id) || [];

      // Filtrar items que pertenezcan a pedidos activos
      const itemsFiltrados = (data || []).filter(item => {
        return !estadosExcluidos.includes(item.pedido?.estado_id);
      });

      // Cargar progreso para cada pedido único
      const itemsConProgreso = await Promise.all(
        itemsFiltrados.map(async (item) => {
          const progreso = await loadProgresoPedido(item.pedido_id);
          return { ...item, progreso };
        })
      );

      setItems(itemsConProgreso);
    } catch (error: any) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEstaciones();
  }, []);

  useEffect(() => {
    if (estaciones.length > 0) {
      loadItems();
    }
  }, [estacionActiva, estaciones]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRealtimeInsert = async (newRecord: any) => {
    if (estacionActiva && newRecord.estacion_id !== estacionActiva) {
      return;
    }

    const { data: itemData } = await supabase
      .from('cocina_items')
      .select(
        `
        *,
        pedido:pedidos!cocina_items_pedido_id_fkey(
          id,
          estado_id,
          cliente:clientes(nombre)
        ),
        detalle:detalles_pedido!cocina_items_detalle_pedido_id_fkey(
          cantidad,
          producto:productos(nombre)
        )
      `
      )
      .eq('id', newRecord.id)
      .maybeSingle();

    if (itemData) {
      const progreso = await loadProgresoPedido(itemData.pedido_id);
      const itemConProgreso = { ...itemData, progreso };
      setItems((prevItems) => [itemConProgreso, ...prevItems]);
    }
  };

  const handleRealtimeUpdate = async (updatedRecord: any) => {
    const itemIndex = items.findIndex((item) => item.id === updatedRecord.id);

    if (itemIndex === -1) {
      return;
    }

    if (!['pendiente', 'preparando', 'listo'].includes(updatedRecord.estado)) {
      setItems((prevItems) => prevItems.filter((item) => item.id !== updatedRecord.id));
      return;
    }

    const { data: itemData } = await supabase
      .from('cocina_items')
      .select(
        `
        *,
        pedido:pedidos!cocina_items_pedido_id_fkey(
          id,
          estado_id,
          cliente:clientes(nombre),
          tipo_entrega:tipos_entrega(nombre)
        ),
        detalle:detalles_pedido!cocina_items_detalle_pedido_id_fkey(
          cantidad,
          producto:productos(nombre)
        )
      `
      )
      .eq('id', updatedRecord.id)
      .maybeSingle();

    if (itemData) {
      const progreso = await loadProgresoPedido(itemData.pedido_id);
      const itemConProgreso = { ...itemData, progreso };

      setItems((prevItems) =>
        prevItems.map((item) => (item.id === updatedRecord.id ? itemConProgreso : item))
      );

      const pedidosAfectados = new Set([itemData.pedido_id]);
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (pedidosAfectados.has(item.pedido_id) && item.id !== updatedRecord.id) {
            return { ...item, progreso };
          }
          return item;
        })
      );
    }
  };

  const handleRealtimeDelete = (deletedRecord: any) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== deletedRecord.id));
  };

  useEffect(() => {
    if (estaciones.length === 0) return;

    const cocinaChannel = supabase
      .channel('cocina-changes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cocina_items',
        },
        (payload) => {
          console.log('Item insertado:', payload.new);
          handleRealtimeInsert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cocina_items',
        },
        (payload) => {
          console.log('Item actualizado:', payload.new);
          handleRealtimeUpdate(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'cocina_items',
        },
        (payload) => {
          console.log('Item eliminado:', payload.old);
          handleRealtimeDelete(payload.old);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Suscripción en tiempo real activa para cocina_items');
        }
      });

    const pedidosChannel = supabase
      .channel('pedidos-sync-stations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
        },
        async (payload) => {
          const { data: estadosData } = await supabase
            .from('estados_pedido')
            .select('id, nombre')
            .in('nombre', ['Completado', 'Cancelado']);

          const estadosExcluidos = estadosData?.map((e) => e.id) || [];

          if (estadosExcluidos.includes(payload.new.estado_id)) {
            setItems((prevItems) => prevItems.filter((item) => item.pedido_id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cocinaChannel);
      supabase.removeChannel(pedidosChannel);
    };
  }, [estacionActiva, estaciones, items]);

  const handleStatusChange = async (itemId: string, nuevoEstado: string) => {
    try {
      const updates: any = { estado: nuevoEstado };

      if (nuevoEstado === 'preparando') {
        updates.inicio_preparacion = new Date().toISOString();
      } else if (nuevoEstado === 'listo') {
        updates.fin_preparacion = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('cocina_items')
        .update(updates)
        .eq('id', itemId)
        .select();

      if (error) {
        console.error('Error en actualización:', error);
        // Mensajes de error más específicos
        if (error.code === 'PGRST116') {
          toast.error('No se encontró el item de cocina');
        } else if (error.code === '42501') {
          toast.error('No tienes permisos para actualizar este item');
        } else {
          toast.error(`Error: ${error.message}`);
        }
        throw error;
      }

      if (!data || data.length === 0) {
        toast.error('No se pudo actualizar el item');
        throw new Error('No se pudo actualizar el item');
      }

      toast.success(
        nuevoEstado === 'preparando' ? 'Preparación iniciada' : 'Item marcado como listo'
      );
    } catch (error: any) {
      console.error('Error updating status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadItems();
  };

  const itemsPendientes = items.filter((i) => i.estado === 'pendiente');
  const itemsPreparando = items.filter((i) => i.estado === 'preparando');
  const itemsListos = items.filter((i) => i.estado === 'listo');

  return (
    <div className="h-full flex flex-col bg-[#FDFCFB] overflow-hidden">
      {/* HEADER PREMIUM 2.0 */}
      <div className="flex-shrink-0 bg-white shadow-[0_1px_15px_rgba(0,0,0,0.05)] border-b border-gray-100 p-4 md:p-6 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
                Kitchen <span className="text-orange-600">Premium</span>
              </h1>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutDashboard className="w-3 h-3" />
                Control Operativo de Estaciones
              </p>
            </div>
          </div>

          {/* MASTER DASHBOARD DE CARGA */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 bg-gray-50/80 p-2 md:p-3 rounded-[2rem] border border-gray-100 shadow-inner">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-orange-100">
              <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">Pendientes</span>
              <span className="text-lg font-black text-orange-600 ml-1 leading-none">{itemsPendientes.length}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-blue-100">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">En Fuego</span>
              <span className="text-lg font-black text-blue-600 ml-1 leading-none">{itemsPreparando.length}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-emerald-100">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">Listos</span>
              <span className="text-lg font-black text-emerald-600 ml-1 leading-none">{itemsListos.length}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-12 h-12 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {estaciones.map((estacion) => (
              <button
                key={estacion.id}
                onClick={() => setEstacionActiva(estacion.id)}
                className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border ${estacionActiva === estacion.id
                  ? 'text-white shadow-xl -translate-y-0.5'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                  }`}
                style={{
                  backgroundColor: estacionActiva === estacion.id ? (estacion.color || '#f97316') : undefined,
                  borderColor: estacionActiva === estacion.id ? 'transparent' : undefined,
                }}
              >
                <div className={`w-2 h-2 rounded-full ${estacionActiva === estacion.id ? 'bg-white' : ''}`} />
                {estacion.nombre}
                {estacionActiva === estacion.id && <ChevronRight className="w-3 h-3 ml-1" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 min-h-0">
        <div className="max-w-[1600px] mx-auto h-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-[80px] h-[80px] border-[6px] border-orange-100 border-t-orange-600 rounded-full animate-spin shadow-inner" />
              <p className="text-lg font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Cocina...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* COLUMNA PENDIENTES */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                      Cola de Espera <span className="text-amber-600 underline">({itemsPendientes.length})</span>
                    </h2>
                  </div>
                </div>
                <div className="space-y-6">
                  {itemsPendientes.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-10 h-10 text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Estación Despejada</p>
                    </div>
                  ) : (
                    itemsPendientes.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* COLUMNA PREPARANDO */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <ChefHat className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                      En Preparación <span className="text-blue-600 underline">({itemsPreparando.length})</span>
                    </h2>
                  </div>
                </div>
                <div className="space-y-6">
                  {itemsPreparando.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ChefHat className="w-10 h-10 text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Fuegos Apagados</p>
                    </div>
                  ) : (
                    itemsPreparando.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* COLUMNA LISTOS */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                      Listos para Salida <span className="text-emerald-600 underline">({itemsListos.length})</span>
                    </h2>
                  </div>
                </div>
                <div className="space-y-6">
                  {itemsListos.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Sin Pendientes</p>
                    </div>
                  ) : (
                    itemsListos.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
