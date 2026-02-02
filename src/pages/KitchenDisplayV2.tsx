import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, ChefHat, AlertTriangle, RefreshCw, Play, Check, TrendingUp } from 'lucide-react';
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

const getPrioridadColor = (prioridad: number) => {
  switch (prioridad) {
    case 5:
      return 'bg-red-100 border-red-500 text-red-900';
    case 4:
      return 'bg-orange-100 border-orange-500 text-orange-900';
    case 3:
      return 'bg-yellow-100 border-yellow-500 text-yellow-900';
    case 2:
      return 'bg-blue-100 border-blue-500 text-blue-900';
    default:
      return 'bg-gray-100 border-gray-500 text-gray-900';
  }
};

const getPrioridadIcon = (prioridad: number) => {
  if (prioridad >= 4) {
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  }
  return null;
};

const ItemCard: React.FC<{
  item: CocinaItem;
  onStatusChange: (itemId: string, nuevoEstado: string) => void;
  currentMinute: number;
}> = ({
  item,
  onStatusChange,
  currentMinute,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const minutosTranscurridos = item.inicio_preparacion
    ? getMinutosTranscurridos(item.inicio_preparacion)
    : getMinutosTranscurridos(item.created_at);

  const porcentajeCompletado = item.tiempo_estimado
    ? Math.min((minutosTranscurridos / item.tiempo_estimado) * 100, 100)
    : 0;

  const timerColor =
    porcentajeCompletado >= 90
      ? 'text-red-600'
      : porcentajeCompletado >= 70
      ? 'text-yellow-600'
      : 'text-green-600';

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

  return (
    <div
      className={`relative p-4 rounded-lg border-2 ${getPrioridadColor(
        item.prioridad
      )} shadow-md hover:shadow-lg transition-all cursor-pointer ${
        isUpdating ? 'opacity-50' : ''
      }`}
      onClick={handleClick}
    >
      {getPrioridadIcon(item.prioridad) && (
        <div className="absolute -top-2 -right-2">{getPrioridadIcon(item.prioridad)}</div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-lg">
            Pedido #{item.pedido.id}
          </p>
          {item.pedido.cliente && (
            <p className="text-sm text-gray-600">{item.pedido.cliente.nombre}</p>
          )}
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 ${timerColor}`}>
            <Clock className="w-4 h-4" />
            <span className="font-bold text-lg">{minutosTranscurridos}m</span>
          </div>
          {item.tiempo_estimado && (
            <p className="text-xs text-gray-500">de {item.tiempo_estimado}m</p>
          )}
        </div>
      </div>

      {item.tiempo_estimado && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                porcentajeCompletado >= 90
                  ? 'bg-red-600'
                  : porcentajeCompletado >= 70
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${porcentajeCompletado}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="mb-2">
        <span className="font-semibold text-lg">{item.detalle.cantidad}x </span>
        <span className="text-base">{item.detalle.producto.nombre}</span>
      </div>

      {/* Progreso del pedido completo */}
      {item.progreso && item.progreso.total_items > 0 && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-800 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Progreso del Pedido
            </span>
            <span className="text-xs font-bold text-blue-900">
              {item.progreso.items_listos}/{item.progreso.total_items} items
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${item.progreso.porcentaje_completado}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-700 text-center font-semibold">
            {item.progreso.porcentaje_completado}% completado
          </div>
        </div>
      )}

      {item.notas && (
        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
          <p className="font-medium text-yellow-800">Notas:</p>
          <p className="text-yellow-900">{item.notas}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-300">
        {item.estado === 'pendiente' && (
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md flex items-center justify-center gap-2 transition-colors">
            <Play className="w-4 h-4" />
            Iniciar Preparación
          </button>
        )}
        {item.estado === 'preparando' && (
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md flex items-center justify-center gap-2 transition-colors">
            <Check className="w-4 h-4" />
            Marcar como Listo
          </button>
        )}
        {item.estado === 'listo' && (
          <div className="w-full bg-green-100 text-green-800 py-2 rounded-md text-center font-medium">
            ✓ Listo para Entregar
          </div>
        )}
      </div>
    </div>
  );
};

export function KitchenDisplayV2() {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [items, setItems] = useState<CocinaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [estacionActiva, setEstacionActiva] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);

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
            cliente:clientes(nombre)
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
      setCurrentMinute((prev) => prev + 1);
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
          cliente:clientes(nombre)
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
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex-shrink-0 bg-white shadow-md p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
            <span className="hidden sm:inline">Sistema de Cocina por Estaciones</span>
            <span className="sm:hidden">Cocina por Estaciones</span>
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {estaciones.map((estacion) => (
            <button
              key={estacion.id}
              onClick={() => setEstacionActiva(estacion.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                estacionActiva === estacion.id
                  ? 'text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: estacionActiva === estacion.id ? estacion.color : undefined,
              }}
            >
              {estacion.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-2 text-gray-600">Cargando items...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  Pendientes ({itemsPendientes.length})
                </span>
              </div>
              <div className="space-y-4">
                {itemsPendientes.length === 0 ? (
                  <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                    No hay items pendientes
                  </div>
                ) : (
                  itemsPendientes.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                      currentMinute={currentMinute}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <ChefHat className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  En Preparación ({itemsPreparando.length})
                </span>
              </div>
              <div className="space-y-4">
                {itemsPreparando.length === 0 ? (
                  <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                    No hay items en preparación
                  </div>
                ) : (
                  itemsPreparando.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                      currentMinute={currentMinute}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Listos ({itemsListos.length})</span>
              </div>
              <div className="space-y-4">
                {itemsListos.length === 0 ? (
                  <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                    No hay items listos
                  </div>
                ) : (
                  itemsListos.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                      currentMinute={currentMinute}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
