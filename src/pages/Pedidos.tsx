import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Filter,
  Package,
  Clock,
  CheckCircle,
  User,
  DollarSign,
  Calendar,
  Eye,
  ArrowRight,
  X,
  Printer,
  Home,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Edit,
  Trash2
} from 'lucide-react';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { supabase } from '../lib/supabase/client';
import { useCartStore } from '../lib/store/cartStore';
import { ClienteDetalleModal } from '../components/ClienteDetalleModal';
import { TicketModal } from '../components/TicketModal';
import { CobroModal } from '../components/CobroModal';
import { formatCurrency, formatDate, getTimeElapsed } from '../lib/utils/formatters';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface ProgresoPedido {
  total_items: number;
  items_listos: number;
  porcentaje_completado: number;
}

interface PedidoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: any;
  onShowTicket: () => void;
  onProcessPayment: () => void;
  progreso?: ProgresoPedido | null;
}

const PedidoDetalleModal: React.FC<PedidoDetalleModalProps> = ({ isOpen, onClose, pedido, onShowTicket, onProcessPayment, progreso }) => {
  if (!isOpen || !pedido) return null;

  const totalPagado = pedido.pagos?.reduce((sum: number, pago: any) => sum + (pago.monto || 0), 0) || 0;
  const saldoPendiente = (pedido.total || 0) - totalPagado;
  const isPedidoPagado = saldoPendiente <= 0.01;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pedido #{pedido.id}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(pedido.insert_date || new Date())}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              {pedido.cliente && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Cliente</label>
                  <div className="mt-1 flex items-center p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{pedido.cliente.nombre}</p>
                      {pedido.cliente.telefono && (
                        <p className="text-xs text-gray-500">{pedido.cliente.telefono}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {pedido.tipo_entrega_nombre && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo de Entrega</label>
                  <div className="mt-1 flex items-center p-3 bg-gray-50 rounded-lg">
                    {pedido.tipo_entrega_nombre.toLowerCase().includes('domicilio') ? (
                      <Home className="w-5 h-5 text-gray-400 mr-3" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-gray-400 mr-3" />
                    )}
                    <span className="text-gray-900">{pedido.tipo_entrega_nombre}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(pedido.subtotal || 0)}</span>
                </div>
                {(pedido.descuentos || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descuentos:</span>
                    <span className="text-red-600">-{formatCurrency(pedido.descuentos || 0)}</span>
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(pedido.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos</h3>
            {pedido.detalles && pedido.detalles.length > 0 ? (
              <div className="space-y-3">
                {pedido.detalles.map((detalle: any, index: number) => {
                  const tieneExtras = detalle.salsas_seleccionadas && detalle.salsas_seleccionadas.length > 0;
                  const precioBase = detalle.precio_unitario_original || 0;
                  const precioFinal = detalle.precio_unitario || 0;

                  return (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {detalle.producto?.nombre || 'Producto'}
                            </h4>
                            <p className="text-sm text-gray-500">Cantidad: {detalle.cantidad}</p>
                            {tieneExtras && precioBase > 0 && precioBase !== precioFinal && (
                              <p className="text-xs text-gray-500">
                                {formatCurrency(precioBase)} + {formatCurrency(precioFinal - precioBase)} extras
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(detalle.subtotal)}
                        </span>
                      </div>
                      {tieneExtras && (
                        <div className="ml-14 text-sm text-gray-600">
                          {detalle.salsas_seleccionadas.map((salsa: any, idx: number) => (
                            <span key={idx}>
                              + {salsa.nombre}
                              {Number(salsa.precio) > 0 && (
                                <span className="font-medium text-blue-600"> (+{formatCurrency(salsa.precio)})</span>
                              )}
                              {idx < detalle.salsas_seleccionadas.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay productos</p>
            )}
          </div>

          {/* Progreso de Cocina */}
          {progreso && progreso.total_items > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Progreso de Cocina</h3>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Items preparados
                  </span>
                  <span className="text-sm font-bold text-blue-900">
                    {progreso.items_listos}/{progreso.total_items}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${progreso.porcentaje_completado === 100
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
                <div className="text-sm text-blue-700 text-center font-medium">
                  {progreso.porcentaje_completado}% completado
                </div>
              </div>
            </div>
          )}

          {/* Información de Pago */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Estado de Pago</h3>
            <div className={`p-4 rounded-lg border ${isPedidoPagado
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
              }`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total del pedido:</span>
                  <span className="font-semibold">{formatCurrency(pedido.total || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Total pagado:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(totalPagado)}</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between font-bold text-base">
                  <span>Saldo pendiente:</span>
                  <span className={isPedidoPagado ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(saldoPendiente)}
                  </span>
                </div>
              </div>
              {isPedidoPagado && (
                <div className="mt-3 flex items-center justify-center text-green-700">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Pedido pagado completamente</span>
                </div>
              )}
            </div>
          </div>

          {pedido.notas && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-1">Observaciones:</p>
              <p className="text-sm text-yellow-900">{pedido.notas}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {!isPedidoPagado && (
            <button
              onClick={onProcessPayment}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Registrar Cobro
            </button>
          )}
          <button
            onClick={onShowTicket}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Ver Ticket
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export function Pedidos() {
  const navigate = useNavigate();

  const {
    pedidos,
    estadosPedido,
    isLoading,
    fetchPedidosActivos,
    fetchEstadosPedido,
    subscribeToPedidosChanges,
    fetchPedidoDetalles,
    softDeletePedido
  } = usePedidosStore();

  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pedidoToDelete, setPedidoToDelete] = useState<number | null>(null);
  const [pedidoParaTicket, setPedidoParaTicket] = useState<any>(null);
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [pedidoParaCobro, setPedidoParaCobro] = useState<any>(null);
  const [progresoPedidos, setProgresoPedidos] = useState<{ [key: string]: ProgresoPedido }>({});

  useEffect(() => {
    fetchPedidosActivos();
    fetchEstadosPedido();

    const subscription = subscribeToPedidosChanges();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchPedidosActivos, fetchEstadosPedido, subscribeToPedidosChanges]);

  // Cargar progreso de todos los pedidos
  useEffect(() => {
    const loadAllProgreso = async () => {
      for (const pedido of pedidos) {
        if (pedido.id) {
          try {
            const { data, error } = await supabase
              .rpc('obtener_progreso_pedido', { p_pedido_id: pedido.id });

            if (!error && data && data.length > 0) {
              setProgresoPedidos(prev => ({
                ...prev,
                [pedido.id!]: data[0]
              }));
            }
          } catch (error) {
            console.error('Error loading progreso:', error);
          }
        }
      }
    };

    if (pedidos.length > 0) {
      loadAllProgreso();

      // Suscribirse a cambios en cocina_items para todos los pedidos
      const channel = supabase
        .channel('progreso-pedidos-all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cocina_items'
          },
          () => {
            loadAllProgreso();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [pedidos]);

  const handleProcessPayment = async (pagos: any[], estadoFinal: 'completado' | 'pendiente') => {
    if (!pedidoParaCobro) return;

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      // Registrar los pagos
      for (const pago of pagos) {
        const { error: pagoError } = await supabase
          .from('pagos')
          .insert({
            pedido_id: pedidoParaCobro.id,
            metodo_pago: pago.metodo_pago,
            monto: pago.monto,
            cobrado_por_usuario_id: user?.id
          });

        if (pagoError) throw pagoError;
      }

      // Actualizar estado del pedido si está completado
      if (estadoFinal === 'completado') {
        const { data: completadoEstado } = await supabase
          .from('pedido_estados')
          .select('id')
          .eq('nombre', 'Completado')
          .single();

        if (completadoEstado) {
          const { error: updateError } = await supabase
            .from('pedidos')
            .update({ estado_id: completadoEstado.id })
            .eq('id', pedidoParaCobro.id);

          if (updateError) throw updateError;
        }
      }

      toast.success('Pago registrado correctamente');
      setIsCobroModalOpen(false);
      setPedidoParaCobro(null);

      // Recargar detalles del pedido
      await fetchPedidoDetalles(pedidoParaCobro.id);
      const pedidosStore = usePedidosStore.getState();
      if (pedidosStore.pedidoActual) {
        setSelectedPedido(pedidosStore.pedidoActual);
      }

      // Refrescar lista de pedidos
      await fetchPedidosActivos();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Error al procesar el pago');
    }
  };

  const filteredPedidos = pedidos.filter(pedido => {
    const matchesEstado = !selectedEstado || pedido.estado_nombre === selectedEstado;
    return matchesEstado;
  });

  const estadisticas = {
    total: pedidos.length,
    montoTotal: pedidos.reduce((sum, p) => sum + (Number(p.total) || 0), 0),
  };

  const categoriasRevenue: { [key: string]: number } = {};
  pedidos.forEach(pedido => {
    (pedido.detalles || []).forEach((detalle: any) => {
      const categoriaNombre = detalle?.producto?.categoria?.nombre || 'Sin categoría';
      const subtotal = Number(detalle?.subtotal) || 0;
      categoriasRevenue[categoriaNombre] = (categoriasRevenue[categoriaNombre] || 0) + subtotal;
    });
  });

  const topCategorias = Object.entries(categoriasRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([nombre, monto], index) => ({ nombre, monto, posicion: index + 1 }));
  const handleDeleteClick = (pedidoId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Para que no se abra el detalle del pedido al dar click en borrar
    setPedidoToDelete(pedidoId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (pedidoToDelete) {
      await softDeletePedido(pedidoToDelete);
      setIsDeleteModalOpen(false);
      setPedidoToDelete(null);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4 md:p-6 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                  <ShoppingCart className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div className="ml-3 md:ml-6 flex-1">
                  <p className="text-[10px] md:text-xs font-black text-blue-600/60 uppercase tracking-widest mb-1">Total Activos</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl md:text-3xl font-black text-gray-900 leading-none">{estadisticas.total}</p>
                    <p className="text-[10px] md:text-xs font-medium text-gray-400">pedidos</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs md:text-sm font-black text-blue-600 italic">{formatCurrency(estadisticas.montoTotal)}</p>
                  </div>
                </div>
              </div>
            </div>

            {topCategorias.length > 0 ? (
              <>
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4 md:p-6 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-200">
                      <TrendingUp className="w-5 h-5 md:w-7 md:h-7 text-white" />
                    </div>
                    <div className="ml-3 md:ml-6 flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] md:text-xs font-black text-green-600/60 uppercase tracking-widest truncate">{topCategorias[0].nombre}</p>
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-full ring-1 ring-green-200">#1</span>
                      </div>
                      <p className="text-lg md:text-2xl font-black text-gray-900 truncate">{formatCurrency(topCategorias[0].monto)}</p>
                    </div>
                  </div>
                </div>

                {topCategorias[1] && (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4 md:p-6 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
                        <Package className="w-5 h-5 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="ml-3 md:ml-6 flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] md:text-xs font-black text-indigo-600/60 uppercase tracking-widest truncate">{topCategorias[1].nombre}</p>
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-full ring-1 ring-indigo-200">#2</span>
                        </div>
                        <p className="text-lg md:text-2xl font-black text-gray-900 truncate">{formatCurrency(topCategorias[1].monto)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {topCategorias[2] && (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4 md:p-6 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-200">
                        <DollarSign className="w-5 h-5 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="ml-3 md:ml-6 flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] md:text-xs font-black text-amber-600/60 uppercase tracking-widest truncate">{topCategorias[2].nombre}</p>
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full ring-1 ring-amber-200">#3</span>
                        </div>
                        <p className="text-lg md:text-2xl font-black text-gray-900 truncate">{formatCurrency(topCategorias[2].monto)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 md:w-6 md:h-6 text-gray-400" />
                    </div>
                    <div className="ml-2 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-400">Sin datos</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 md:w-6 md:h-6 text-gray-400" />
                    </div>
                    <div className="ml-2 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-400">Sin datos</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 md:w-6 md:h-6 text-gray-400" />
                    </div>
                    <div className="ml-2 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-400">Sin datos</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4 md:mb-6">
            <div className="relative max-w-sm">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium appearance-none"
              >
                <option value="">Filtrar todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Preparación">En Preparación</option>
                <option value="Listo para Entrega">Listo para Entrega</option>
                <option value="En Reparto">En Reparto</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-4 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando pedidos...</span>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos activos</h3>
              <p className="text-gray-500">Los pedidos aparecerán aquí cuando se creen nuevos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPedidos.map((pedido) => {
                const estadoColor = estadosPedido.find(e => e.id === pedido.estado_id)?.color_hex || '#6B7280';
                return (
                  <div
                    key={pedido.id}
                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-500/10 transition-all duration-300 overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row md:items-stretch overflow-hidden">
                      {/* Barra Lateral de Estado */}
                      <div
                        className="w-full md:w-2 h-2 md:h-auto"
                        style={{ backgroundColor: estadoColor }}
                      />

                      <div className="flex-1 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                          <div className="hidden md:flex w-14 h-14 bg-gray-50 rounded-2xl items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                            <Package className="w-7 h-7 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-gray-900">Pedido #{pedido.id}</h3>
                              <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm"
                                style={{ backgroundColor: estadoColor }}
                              >
                                {pedido.estado_nombre}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 font-medium">
                              <div className="flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                {getTimeElapsed(pedido.insert_date || '')}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                {formatDate(pedido.insert_date || new Date())}
                              </div>
                            </div>

                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="flex items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                                <User className="w-4 h-4 mr-2 text-blue-500/70" />
                                <span className="text-xs font-bold text-gray-700 truncate">
                                  {pedido.cliente_nombre || 'Sin cliente'}
                                </span>
                              </div>
                              <div className="flex items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                                {pedido.tipo_entrega_nombre?.toLowerCase().includes('domicilio') ? (
                                  <Home className="w-4 h-4 mr-2 text-emerald-500/70" />
                                ) : (
                                  <ShoppingBag className="w-4 h-4 mr-2 text-amber-500/70" />
                                )}
                                <span className="text-xs font-bold text-gray-700 truncate">
                                  {pedido.tipo_entrega_nombre || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center bg-blue-50/30 p-2 rounded-xl border border-blue-100/30">
                                <DollarSign className="w-4 h-4 mr-1.5 text-blue-600" />
                                <span className="text-sm font-black text-blue-700">
                                  {formatCurrency(pedido.total || 0)}
                                </span>
                              </div>
                            </div>

                            {/* Progreso de cocina inline Premium */}
                            {progresoPedidos[pedido.id!] && progresoPedidos[pedido.id!].total_items > 0 && (
                              <div className="mt-2 p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="relative">
                                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                      <div className="absolute inset-0 animate-ping opacity-20 w-3.5 h-3.5 bg-blue-400 rounded-full" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Progreso Cocina</span>
                                  </div>
                                  <span className="text-[10px] font-black text-blue-700">
                                    {progresoPedidos[pedido.id!].items_listos} de {progresoPedidos[pedido.id!].total_items} listos
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${progresoPedidos[pedido.id!].porcentaje_completado === 100
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                      }`}
                                    style={{ width: `${progresoPedidos[pedido.id!].porcentaje_completado}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col md:flex-row items-center gap-2 flex-shrink-0 md:pl-4 md:border-l border-gray-100">
                          {['Pendiente', 'En Preparación'].includes(pedido.estado_nombre || '') && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  toast.loading('Cargando pedido...', { id: 'loading-edit' });
                                  const pedidoCompleto = await usePedidosStore.getState().fetchPedidoDetalles(pedido.id!);
                                  if (!pedidoCompleto) return;
                                  useCartStore.getState().cargarPedidoParaEditar(pedidoCompleto);
                                  toast.success('Abriendo editor...', { id: 'loading-edit' });
                                  navigate('/vender');
                                } catch (error) {
                                  toast.error('Error al editar', { id: 'loading-edit' });
                                }
                              }}
                              className="p-2.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-200 active:scale-95 shadow-sm bg-white"
                              title="Editar Pedido"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          )}

                          {['Pendiente', 'Cancelado'].includes(pedido.estado_nombre || '') && (
                            <button
                              onClick={(e) => handleDeleteClick(pedido.id!, e)}
                              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200 active:scale-95 shadow-sm bg-white"
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              await fetchPedidoDetalles(pedido.id!);
                              const pedidosStore = usePedidosStore.getState();
                              if (pedidosStore.pedidoActual) {
                                setSelectedPedido(pedidosStore.pedidoActual);
                                setIsPedidoModalOpen(true);
                              }
                            }}
                            className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 group/btn"
                          >
                            <Eye className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                            Detalle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ClienteDetalleModal
        isOpen={isClienteModalOpen}
        onClose={() => {
          setIsClienteModalOpen(false);
          setSelectedClienteId('');
        }}
        clienteId={selectedClienteId}
      />

      <PedidoDetalleModal
        isOpen={isPedidoModalOpen}
        onClose={() => {
          setIsPedidoModalOpen(false);
          setSelectedPedido(null);
        }}
        pedido={selectedPedido}
        progreso={selectedPedido?.id ? progresoPedidos[selectedPedido.id] : null}
        onShowTicket={() => {
          setPedidoParaTicket(selectedPedido);
          setIsPedidoModalOpen(false);
          setIsTicketModalOpen(true);
        }}
        onProcessPayment={() => {
          setPedidoParaCobro(selectedPedido);
          setIsPedidoModalOpen(false);
          setIsCobroModalOpen(true);
        }}
      />

      <CobroModal
        isOpen={isCobroModalOpen}
        onClose={() => {
          setIsCobroModalOpen(false);
          setPedidoParaCobro(null);
        }}
        pedido={pedidoParaCobro}
        onFinalizar={handleProcessPayment}
      />

      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setPedidoParaTicket(null);
        }}
        pedido={pedidoParaTicket}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPedidoToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Pedido"
        message="¿Estás seguro de que deseas eliminar este pedido? Esta acción lo moverá a la papelera, pero no borrará los datos permanentemente."
      />
    </>
  );
}