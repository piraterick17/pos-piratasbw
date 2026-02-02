import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  ChefHat,
  ArrowRight,
  Package,
  Home,
  ShoppingBag,
  Calendar,
  RefreshCw,
  TrendingUp,
  CreditCard,
  X,
  Eye,
  User
} from 'lucide-react';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { formatDate } from '../lib/utils/formatters';
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

// Función para calcular el tiempo transcurrido en minutos
const getMinutosTranscurridos = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / 60000);
};

// Función para calcular el tiempo transcurrido
const getTimeElapsed = (dateString: string): string => {
  const diffMins = getMinutosTranscurridos(dateString);

  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins === 1) return 'hace 1 min';
  if (diffMins < 60) return `hace ${diffMins} mins`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return 'hace 1 hora';
  if (diffHours < 24) return `hace ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'hace 1 día';
  return `hace ${diffDays} días`;
};

// Función para determinar la urgencia del pedido
const getUrgencyLevel = (minutosTranscurridos: number, tiempoEntregaPrometido?: number): 'normal' | 'warning' | 'urgent' => {
  if (!tiempoEntregaPrometido) {
    if (minutosTranscurridos < 15) return 'normal';
    if (minutosTranscurridos < 25) return 'warning';
    return 'urgent';
  }

  const porcentajeTranscurrido = (minutosTranscurridos / tiempoEntregaPrometido) * 100;

  if (porcentajeTranscurrido < 70) return 'normal';
  if (porcentajeTranscurrido < 90) return 'warning';
  return 'urgent';
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progreso, setProgreso] = useState<ProgresoPedido | null>(null);

  // Actualizar el tiempo cada 30 segundos para mantener el timer actualizado
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Cargar progreso del pedido
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

    // Suscribirse a cambios en cocina_items para actualizar el progreso en tiempo real
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
  const urgencyLevel = getUrgencyLevel(minutosTranscurridos, pedido.tiempo_entrega_minutos);

  // Colores según nivel de urgencia
  const getUrgencyStyles = () => {
    switch (urgencyLevel) {
      case 'normal':
        return {
          border: 'border-green-300',
          bg: 'bg-green-50',
          timerBg: 'bg-green-100',
          timerText: 'text-green-800',
          timerIcon: 'text-green-600',
        };
      case 'warning':
        return {
          border: 'border-yellow-300',
          bg: 'bg-yellow-50',
          timerBg: 'bg-yellow-100',
          timerText: 'text-yellow-800',
          timerIcon: 'text-yellow-600',
        };
      case 'urgent':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50',
          timerBg: 'bg-red-100',
          timerText: 'text-red-800',
          timerIcon: 'text-red-600',
        };
    }
  };

  const styles = getUrgencyStyles();

  // Determinar el siguiente estado según el estado actual
  const getNextState = () => {
    if (pedido.estado_nombre === 'Pendiente') {
      return estadosPedido.find(e => e.nombre === 'En Preparación');
    } else if (pedido.estado_nombre === 'En Preparación') {
      return estadosPedido.find(e => e.nombre === 'Listo para Entrega');
    } else if (pedido.estado_nombre === 'Listo para Entrega') {
      // Cuando está listo, NO avanzar automáticamente
      // El usuario debe registrar el pago primero
      return null;
    } else if (pedido.estado_nombre === 'En Reparto') {
      return estadosPedido.find(e => e.nombre === 'Completado');
    }
    return null;
  };
  
  const nextState = getNextState();
  
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
  
  // Icono según tipo de entrega
  const getTipoEntregaIcon = () => {
    if (!pedido.tipo_entrega_nombre) return <Package className="w-4 h-4" />;
    
    if (pedido.tipo_entrega_nombre.toLowerCase().includes('domicilio')) {
      return <Home className="w-4 h-4" />;
    } else if (pedido.tipo_entrega_nombre.toLowerCase().includes('llevar')) {
      return <ShoppingBag className="w-4 h-4" />;
    } else {
      return <Package className="w-4 h-4" />;
    }
  };
  
  // Determinar el texto del botón según el estado
  const getButtonText = () => {
    if (pedido.estado_nombre === 'Pendiente') {
      return 'Empezar a Preparar';
    } else if (pedido.estado_nombre === 'En Preparación') {
      return 'Marcar como Listo';
    } else if (pedido.estado_nombre === 'En Reparto') {
      return 'Marcar Entregado';
    }
    return 'Cambiar Estado';
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 ${styles.border} p-4 mb-4 transition-all duration-300`}>
      {/* Timer Visual con Urgencia */}
      <div className={`${styles.timerBg} rounded-lg p-3 mb-4 flex items-center justify-between`}>
        <div className="flex items-center">
          <Clock className={`w-6 h-6 ${styles.timerIcon} mr-2`} />
          <div>
            <p className={`text-xs font-medium ${styles.timerText}`}>Tiempo Transcurrido</p>
            <p className={`text-2xl font-bold ${styles.timerText}`}>{minutosTranscurridos} min</p>
          </div>
        </div>
        {pedido.tiempo_entrega_minutos && (
          <div className="text-right">
            <p className={`text-xs font-medium ${styles.timerText}`}>Tiempo Prometido</p>
            <p className={`text-lg font-semibold ${styles.timerText}`}>{pedido.tiempo_entrega_minutos} min</p>
            <p className={`text-xs ${styles.timerText}`}>
              {Math.round((minutosTranscurridos / pedido.tiempo_entrega_minutos) * 100)}% transcurrido
            </p>
          </div>
        )}
      </div>

      {/* Encabezado de la comanda */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Pedido #{pedido.id}</h3>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{getTimeElapsed(pedido.insert_date)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onViewItems && (
            <button
              onClick={() => onViewItems(pedido)}
              className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
              title="Ver items del pedido"
            >
              <Eye className="w-4 h-4 text-blue-600" />
            </button>
          )}
          <div className="flex items-center">
            {getTipoEntregaIcon()}
            <span className="ml-1 text-sm font-medium">
              {pedido.tipo_entrega_nombre || 'Para consumir'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Cliente */}
      {pedido.cliente_nombre && (
        <div className="mb-3 p-2 bg-blue-50 rounded-md">
          <p className="text-sm font-medium text-blue-800">{pedido.cliente_nombre}</p>
        </div>
      )}
      
      {/* Progreso de Cocina */}
      {progreso && progreso.total_items > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-900 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              Estado de Cocina
            </span>
            <span className="text-sm font-bold text-blue-900">
              {progreso.items_listos}/{progreso.total_items} listos
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                progreso.porcentaje_completado === 100
                  ? 'bg-green-600'
                  : progreso.porcentaje_completado >= 70
                  ? 'bg-blue-600'
                  : progreso.porcentaje_completado >= 40
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${progreso.porcentaje_completado}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700">
              {progreso.porcentaje_completado}% completado
            </span>
            {progreso.porcentaje_completado === 100 && (
              <span className="text-xs font-bold text-green-700 animate-pulse">
                ✓ Listo para entregar
              </span>
            )}
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Productos:</h4>
        <ul className="space-y-2">
          {pedido.detalles?.map((detalle: any, index: number) => (
            <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <span className="font-bold text-gray-900 mr-2">{detalle.cantidad}x</span>
                <span className="text-gray-800">{detalle.producto?.nombre || 'Producto'}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Notas */}
      {pedido.notas && (
        <div className="mb-4 p-2 bg-yellow-50 rounded-md">
          <p className="text-xs font-medium text-yellow-800 mb-1">Notas:</p>
          <p className="text-sm text-yellow-900">{pedido.notas}</p>
        </div>
      )}
      
      {/* Botones de acción */}
      {pedido.estado_nombre === 'Listo para Entrega' ? (
        <button
          onClick={() => onRegistrarPago && onRegistrarPago(pedido.id)}
          className="w-full mt-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center transition-colors"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Registrar Pago y Completar
        </button>
      ) : nextState ? (
        <button
          onClick={handleStatusChange}
          disabled={isUpdating}
          className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              {getButtonText()}
            </>
          )}
        </button>
      ) : null}
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
  const [pedidoParaPago, setPedidoParaPago] = useState<number | null>(null);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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
    setIsLoadingDetails(true);
    try {
      await fetchPedidoDetalles(pedido.id);
      const pedidosStore = usePedidosStore.getState();
      if (pedidosStore.pedidoActual) {
        setSelectedPedido(pedidosStore.pedidoActual);
        setIsItemsModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading pedido details:', error);
    } finally {
      setIsLoadingDetails(false);
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 pb-2 sm:pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div className="flex items-center">
            <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-orange-600" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                Pantalla de Cocina (KDS)
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                Visualiza y gestiona los pedidos activos
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-gray-600">Cargando pedidos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Columna 1: Pedidos Pendientes */}
          <div>
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">Pedidos Pendientes ({pedidosPendientes.length})</span>
            </div>
            
            <div className="space-y-4">
              {pedidosPendientes.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                  <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay pedidos pendientes</p>
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
          <div>
            <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <ChefHat className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">En Preparación ({pedidosEnPreparacion.length})</span>
            </div>

            <div className="space-y-4">
              {pedidosEnPreparacion.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                  <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay pedidos en preparación</p>
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
          <div>
            <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Listos para Entrega ({pedidosListos.length})</span>
            </div>

            <div className="space-y-4">
              {pedidosListos.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay pedidos listos para entrega</p>
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
          <div>
            <div className="flex items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200 mb-4">
              <Home className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="text-indigo-800 font-medium">En Reparto ({pedidosEnReparto.length})</span>
            </div>

            <div className="space-y-4">
              {pedidosEnReparto.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                  <Home className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No hay pedidos en reparto</p>
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

      {/* Modal de Items */}
      <ItemsModal
        isOpen={isItemsModalOpen}
        onClose={handleCloseItemsModal}
        pedido={selectedPedido}
      />
    </div>
  );
}