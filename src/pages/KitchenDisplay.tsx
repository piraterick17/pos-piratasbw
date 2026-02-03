import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  TrendingUp,
  CreditCard,
  X,
  Eye,
  User,
  LayoutDashboard,
  Play,
  AlertTriangle,
  Home,
  ShoppingBag,
  Package,
  Clock,
  ChefHat,
  CheckCircle
} from 'lucide-react';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';

interface ProgresoPedido {
  total_items: number;
  items_listos: number;
  porcentaje_completado: number;
}

interface ItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: any;
}

const ItemsModal: React.FC<ItemsModalProps> = ({ isOpen, onClose, pedido }) => {
  if (!isOpen || !pedido) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pedido #{pedido.id}</h2>
            {pedido.cliente?.nombre && (
              <p className="text-sm text-gray-500 mt-1">{pedido.cliente.nombre}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Cliente Information */}
          {pedido.cliente && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <User className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {pedido.cliente.nombre}
                  </p>
                  {pedido.cliente.telefono && (
                    <p className="text-xs text-blue-700">{pedido.cliente.telefono}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tipo de entrega */}
          {pedido.tipo_entrega_nombre && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center">
                {pedido.tipo_entrega_nombre.toLowerCase().includes('domicilio') ? (
                  <Home className="w-5 h-5 text-purple-600 mr-2" />
                ) : (
                  <ShoppingBag className="w-5 h-5 text-purple-600 mr-2" />
                )}
                <p className="text-sm font-medium text-purple-900">
                  {pedido.tipo_entrega_nombre}
                </p>
              </div>
            </div>
          )}

          {/* Productos */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos:</h3>
            {pedido.detalles && pedido.detalles.length > 0 ? (
              <div className="space-y-3">
                {pedido.detalles.map((detalle: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {detalle.producto?.nombre || 'Producto'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Cantidad: <span className="font-medium">{detalle.cantidad}</span>
                        </p>
                        {detalle.salsas_seleccionadas && detalle.salsas_seleccionadas.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Salsas: {detalle.salsas_seleccionadas.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay productos en este pedido</p>
            )}
          </div>

          {/* Notas del pedido */}
          {pedido.notas && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-1">Notas del pedido:</p>
              <p className="text-sm text-yellow-900 whitespace-pre-wrap">{pedido.notas}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const getMinutosTranscurridos = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / 60000);
};

// Componente para una comanda individual
interface ComandaProps {
  pedido: any;
  onStatusChange: (pedidoId: number, nuevoEstadoId: number) => Promise<void>;
  estadosPedido: any[];
  onRegistrarPago?: (pedidoId: number) => void;
  onViewItems?: (pedido: any) => void;
}

const Comanda: React.FC<ComandaProps> = ({ pedido, onStatusChange, estadosPedido, onRegistrarPago, onViewItems }: ComandaProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoPedido | null>(null);

  useEffect(() => {
    const loadProgreso = async () => {
      try {
        const { data, error } = await supabase
          .rpc('obtener_progreso_pedido', { p_pedido_id: pedido.id });
        if (error) throw error;
        if (data && data.length > 0) {
          setProgreso(data[0]);
        }
      } catch (error) {
        console.error('Error loading progreso:', error);
      }
    };
    loadProgreso();

    const channel = supabase
      .channel(`progreso-pedido-${pedido.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cocina_items',
          filter: `pedido_id=eq.${pedido.id}`
        },
        () => {
          loadProgreso();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedido.id]);

  const minutosTranscurridos = getMinutosTranscurridos(pedido.insert_date);

  // Sistema de urgencia dinámico (Glow)
  const isLento = minutosTranscurridos >= 12 || (pedido.tiempo_entrega_minutos && minutosTranscurridos >= pedido.tiempo_entrega_minutos);
  const isAdvertencia = minutosTranscurridos >= 8 && !isLento;

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

  const getNextState = () => {
    if (pedido.estado_nombre === 'Pendiente') {
      return estadosPedido.find(e => e.nombre === 'En Preparación');
    } else if (pedido.estado_nombre === 'En Preparación') {
      return estadosPedido.find(e => e.nombre === 'Listo para Entrega');
    } else if (pedido.estado_nombre === 'En Reparto') {
      return estadosPedido.find(e => e.nombre === 'Completado');
    }
    return null;
  };

  const nextState = getNextState();

  const getButtonText = () => {
    if (pedido.estado_nombre === 'Pendiente') {
      return 'Empezar';
    } else if (pedido.estado_nombre === 'En Preparación') {
      return 'Listo';
    } else if (pedido.estado_nombre === 'En Reparto') {
      return 'Entregado';
    }
    return 'Avanzar';
  };

  const handleStatusChange = async () => {
    if (!nextState) return;
    setIsUpdating(true);
    try {
      await onStatusChange(pedido.id, nextState.id);
      toast.success(`Pedido #${pedido.id} movido a ${nextState.nombre}`);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('No se pudo actualizar el estado');
    } finally {
      setIsUpdating(false);
    }
  };

  const isDomicilio = pedido.tipo_entrega_nombre?.toLowerCase().includes('domicilio');

  return (
    <div className={`group relative bg-white/90 backdrop-blur-md rounded-2xl border-2 ${urgencyClass} p-4 md:p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isUpdating ? 'opacity-50 grayscale' : ''
      }`}>
      {/* Badge de Entrega */}
      <div className={`absolute -top-3 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 shadow-md border ${isDomicilio ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-amber-500 text-white border-amber-300'
        }`}>
        {isDomicilio ? <Home className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
        {pedido.tipo_entrega_nombre || 'Local'}
      </div>

      <div className="flex items-start justify-between mb-4 mt-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-xl text-gray-900 leading-none">
              #{pedido.id}
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded leading-none">
              {pedido.estado_nombre}
            </span>
          </div>
          {pedido.cliente_nombre && (
            <p className="text-xs font-bold text-gray-500 truncate">{pedido.cliente_nombre}</p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <div className={`flex items-center justify-end gap-1.5 ${timerColor}`}>
            <Clock className={`w-4 h-4 ${isLento ? 'animate-spin-slow' : ''}`} />
            <span className="font-black text-2xl tabular-nums leading-none tracking-tighter">{minutosTranscurridos}m</span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            {pedido.tiempo_entrega_minutos && (
              <span className="text-[10px] font-black text-gray-400">Prometido: {pedido.tiempo_entrega_minutos}m</span>
            )}
          </div>
        </div>
      </div>

      {/* Progreso de Cocina - High Visibility */}
      {progreso && progreso.total_items > 0 && (
        <div className="mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Estado de Cocina
            </span>
            <span className="text-[10px] font-black text-blue-900">
              {progreso.items_listos}/{progreso.total_items} listos
            </span>
          </div>
          <div className="w-full bg-blue-100/50 rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-1000 bg-gradient-to-r from-blue-500 to-indigo-600 ${progreso.porcentaje_completado === 100 ? 'from-emerald-500 to-green-600' : ''}`}
              style={{ width: `${progreso.porcentaje_completado}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de productos - Máxima Legibilidad */}
      <div className="mb-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Productos:</p>
        <ul className="space-y-2">
          {pedido.detalles?.map((detalle: any, index: number) => (
            <li key={index} className="flex items-baseline gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100 hover:bg-white transition-colors duration-200">
              <span className="text-xl font-black text-blue-600 leading-none">{detalle.cantidad}x</span>
              <span className="text-sm font-black text-gray-800 uppercase tracking-tight leading-none truncate">
                {detalle.producto?.nombre || 'Producto'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Notas destacadas */}
      {pedido.notas && (
        <div className="mb-4 p-3 bg-amber-50 rounded-xl border-l-4 border-amber-400 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Notas:</span>
          </div>
          <p className="text-xs font-bold text-amber-900 italic leading-tight truncate">{pedido.notas}</p>
        </div>
      )}

      <div className="mt-2 space-y-2">
        {pedido.estado_nombre === 'Listo para Entrega' ? (
          <button
            onClick={() => onRegistrarPago && onRegistrarPago(pedido.id)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            Completar Pedido
          </button>
        ) : nextState ? (
          <button
            onClick={handleStatusChange}
            disabled={isUpdating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 active:scale-95"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {getButtonText()}
              </>
            )}
          </button>
        ) : (
          <div className="w-full h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black uppercase tracking-widest text-[10px]">
            Sin Acciones Pendientes
          </div>
        )}
      </div>

      {/* Botón flotante para ver detalle */}
      {onViewItems && (
        <button
          onClick={() => onViewItems(pedido)}
          className="absolute top-2 right-2 p-2 text-gray-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
          title="Ver detalle completo"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* Efecto decorativo de urgencia */}
      {isLento && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500 rounded-b-2xl blur-[2px] opacity-50" />
      )}
    </div>
  );
};

export function KitchenDisplay() {
  const navigate = useNavigate();
  const {
    pedidos,
    estadosPedido,
    isLoading,
    fetchPedidosActivos,
    fetchEstadosPedido,
    updatePedidoStatus,
    subscribeToPedidosChanges,
    fetchPedidoDetalles
  } = usePedidosStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);

  useEffect(() => {
    fetchPedidosActivos();
    fetchEstadosPedido();

    // Suscribirse a cambios en pedidos
    const pedidosSubscription = subscribeToPedidosChanges();

    // Suscribirse a cambios en cocina_items para sincronización
    const cocinaChannel = supabase
      .channel('cocina-items-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cocina_items'
        },
        () => {
          // Recargar pedidos cuando cambian los items de cocina
          fetchPedidosActivos();
        }
      )
      .subscribe();

    // Función de limpieza para darse de baja de las suscripciones
    return () => {
      supabase.removeChannel(pedidosSubscription);
      supabase.removeChannel(cocinaChannel);
    };
  }, [fetchPedidosActivos, fetchEstadosPedido, subscribeToPedidosChanges]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPedidosActivos();
    setRefreshing(false);
  };

  const handleStatusChange = async (pedidoId: number, nuevoEstadoId: number) => {
    await updatePedidoStatus(pedidoId, nuevoEstadoId);
  };

  const handleRegistrarPago = (pedidoId: number) => {
    // [FIX] Usar navegación SPA suave en lugar de recarga forzada
    navigate(`/pedidos/${pedidoId}`);
  };

  const handleViewItems = async (pedido: any) => {
    try {
      await fetchPedidoDetalles(pedido.id);
      const pedidosStore = usePedidosStore.getState();
      if (pedidosStore.pedidoActual) {
        setSelectedPedido(pedidosStore.pedidoActual);
        setIsItemsModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading pedido details:', error);
    }
  };

  const handleCloseItemsModal = () => {
    setIsItemsModalOpen(false);
    setSelectedPedido(null);
  };

  // Filtrar pedidos por estado
  const pedidosPendientes = pedidos.filter(p => p.estado_nombre === 'Pendiente');
  const pedidosEnPreparacion = pedidos.filter(p => p.estado_nombre === 'En Preparación');
  const pedidosListos = pedidos.filter(p => p.estado_nombre === 'Listo para Entrega');
  const pedidosEnReparto = pedidos.filter(p => p.estado_nombre === 'En Reparto');

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
                Cocina <span className="text-orange-600">General</span>
              </h1>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutDashboard className="w-3 h-3" />
                Resumen de Pedidos Completos
              </p>
            </div>
          </div>

          {/* MASTER DASHBOARD DE CARGA */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 bg-gray-50/80 p-2 md:p-3 rounded-[2rem] border border-gray-100 shadow-inner">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-orange-100">
              <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">Espera</span>
              <span className="text-lg font-black text-orange-600 ml-1 leading-none">{pedidosPendientes.length}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-blue-100">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">En Fuego</span>
              <span className="text-lg font-black text-blue-600 ml-1 leading-none">{pedidosEnPreparacion.length}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-emerald-100">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">Listos</span>
              <span className="text-lg font-black text-emerald-600 ml-1 leading-none">{pedidosListos.length}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-12 h-12 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 min-h-0 no-scrollbar">
        <div className="max-w-[1600px] mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Comandas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Columna 1: Pedidos Pendientes */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                    Pendientes <span className="text-amber-600 underline">({pedidosPendientes.length})</span>
                  </h2>
                </div>
                <div className="space-y-6">
                  {pedidosPendientes.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-100 p-8 text-center">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">Sin pedidos en espera</p>
                    </div>
                  ) : (
                    pedidosPendientes.map(pedido => (
                      <Comanda
                        key={pedido.id}
                        pedido={pedido}
                        onStatusChange={handleStatusChange}
                        estadosPedido={estadosPedido}
                        onRegistrarPago={handleRegistrarPago}
                        onViewItems={handleViewItems}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Columna 2: En Preparación */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                    En Cocina <span className="text-blue-600 underline">({pedidosEnPreparacion.length})</span>
                  </h2>
                </div>
                <div className="space-y-6">
                  {pedidosEnPreparacion.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-100 p-8 text-center">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">Fuegos apagados</p>
                    </div>
                  ) : (
                    pedidosEnPreparacion.map(pedido => (
                      <Comanda
                        key={pedido.id}
                        pedido={pedido}
                        onStatusChange={handleStatusChange}
                        estadosPedido={estadosPedido}
                        onRegistrarPago={handleRegistrarPago}
                        onViewItems={handleViewItems}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Columna 3: Listos para Entrega */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                    Completados <span className="text-emerald-600 underline">({pedidosListos.length})</span>
                  </h2>
                </div>
                <div className="space-y-6">
                  {pedidosListos.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-100 p-8 text-center">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">Sin completados</p>
                    </div>
                  ) : (
                    pedidosListos.map(pedido => (
                      <Comanda
                        key={pedido.id}
                        pedido={pedido}
                        onStatusChange={handleStatusChange}
                        estadosPedido={estadosPedido}
                        onRegistrarPago={handleRegistrarPago}
                        onViewItems={handleViewItems}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Columna 4: En Reparto */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Home className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                    En Reparto <span className="text-indigo-600 underline">({pedidosEnReparto.length})</span>
                  </h2>
                </div>
                <div className="space-y-6">
                  {pedidosEnReparto.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-100 p-8 text-center">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">Sin repartos activos</p>
                    </div>
                  ) : (
                    pedidosEnReparto.map(pedido => (
                      <Comanda
                        key={pedido.id}
                        pedido={pedido}
                        onStatusChange={handleStatusChange}
                        estadosPedido={estadosPedido}
                        onRegistrarPago={handleRegistrarPago}
                        onViewItems={handleViewItems}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Items */}
      <ItemsModal
        isOpen={isItemsModalOpen}
        onClose={handleCloseItemsModal}
        pedido={selectedPedido}
      />
    </div>
  );
}