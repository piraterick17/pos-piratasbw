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
import { usePedidosStore, type Pedido } from '../lib/store/pedidosStore';
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
                <div className="text-sm text-blue-700 text-center font-medium">
                  {progreso.porcentaje_completado}% completado
                </div>
              </div>
            </div>
          )}

          {/* Información de Pago */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Estado de Pago</h3>
            <div className={`p-4 rounded-lg border ${
              isPedidoPagado
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
             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
               <div className="flex items-center justify-between">
                 <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                   <ShoppingCart className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
                 </div>
                 <div className="ml-2 md:ml-4 flex-1">
                   <p className="text-xs md:text-sm font-medium text-gray-500">Total Activos</p>
                   <p className="text-lg md:text-2xl font-bold text-gray-900">{estadisticas.total}</p>
                   <p className="text-xs text-gray-500 mt-1">Monto en Juego</p>
                   <p className="text-sm md:text-base font-semibold text-blue-600">{formatCurrency(estadisticas.montoTotal)}</p>
                 </div>
               </div>
             </div>

             {topCategorias.length > 0 ? (
               <>
                 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                   <div className="flex items-center justify-between">
                     <div className="w-8 h-8 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                       <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
                     </div>
                     <div className="ml-2 md:ml-4 flex-1">
                       <div className="flex items-center justify-between">
                         <p className="text-xs md:text-sm font-medium text-gray-500 truncate">{topCategorias[0].nombre}</p>
                         <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">#1</span>
                       </div>
                       <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(topCategorias[0].monto)}</p>
                     </div>
                   </div>
                 </div>

                 {topCategorias[1] && (
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                     <div className="flex items-center justify-between">
                       <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                         <Package className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
                       </div>
                       <div className="ml-2 md:ml-4 flex-1">
                         <div className="flex items-center justify-between">
                           <p className="text-xs md:text-sm font-medium text-gray-500 truncate">{topCategorias[1].nombre}</p>
                           <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">#2</span>
                         </div>
                         <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(topCategorias[1].monto)}</p>
                       </div>
                     </div>
                   </div>
                 )}

                 {topCategorias[2] && (
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                     <div className="flex items-center justify-between">
                       <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                         <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-amber-600" />
                       </div>
                       <div className="ml-2 md:ml-4 flex-1">
                         <div className="flex items-center justify-between">
                           <p className="text-xs md:text-sm font-medium text-gray-500 truncate">{topCategorias[2].nombre}</p>
                           <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">#3</span>
                         </div>
                         <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(topCategorias[2].monto)}</p>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
            <div className="relative max-w-md">
              <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Preparación">En Preparación</option>
                <option value="Listo para Entrega">Listo para Entrega</option>
                <option value="En Reparto">En Reparto</option>
              </select>
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
                    className="bg-white rounded-lg shadow-sm border-l-4 border-gray-200 hover:shadow-md transition-all p-4"
                    style={{ borderLeftColor: estadoColor }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                      <div className="flex items-start md:items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Pedido #{pedido.id}
                                </h3>
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span>{getTimeElapsed(pedido.insert_date || '')}</span>
                                  <span className="mx-2">•</span>
                                  <span>{formatDate(pedido.insert_date || new Date())}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-900 truncate">
                                  {pedido.cliente_nombre || 'Sin cliente'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                {pedido.tipo_entrega_nombre?.toLowerCase().includes('domicilio') ? (
                                  <Home className="w-4 h-4 mr-2 text-gray-400" />
                                ) : (
                                  <ShoppingBag className="w-4 h-4 mr-2 text-gray-400" />
                                )}
                                <span className="text-sm text-gray-700 truncate">
                                  {pedido.tipo_entrega_nombre || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center col-span-2">
                                <DollarSign className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="text-base font-bold text-gray-900">
                                  {formatCurrency(pedido.total || 0)}
                                </span>
                              </div>
                            </div>

                            {/* Progreso de cocina inline */}
                            {progresoPedidos[pedido.id!] && progresoPedidos[pedido.id!].total_items > 0 && (
                              <div className="p-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-blue-900 flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Cocina
                                  </span>
                                  <span className="text-xs font-bold text-blue-900">
                                    {progresoPedidos[pedido.id!].items_listos}/{progresoPedidos[pedido.id!].total_items}
                                  </span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                      progresoPedidos[pedido.id!].porcentaje_completado === 100
                                        ? 'bg-green-600'
                                        : progresoPedidos[pedido.id!].porcentaje_completado >= 70
                                        ? 'bg-blue-600'
                                        : progresoPedidos[pedido.id!].porcentaje_completado >= 40
                                        ? 'bg-yellow-500'
                                        : 'bg-orange-500'
                                    }`}
                                    style={{ width: `${progresoPedidos[pedido.id!].porcentaje_completado}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
                        <div className="flex items-center justify-between md:justify-start">
                          <span className="text-sm text-gray-600 md:hidden">Estado:</span>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: estadoColor }}
                          >
                            {pedido.estado_nombre}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* --- INICIO CÓDIGO NUEVO: Botón Editar --- */}
                          {['Pendiente', 'En Preparación'].includes(pedido.estado_nombre || '') && (
<button
                              onClick={async (e) => {
                                e.stopPropagation();

                                try {
                                  toast.loading('Cargando pedido...', { id: 'loading-edit' });

                                  // 1. Fetch con la query corregida
                                  const pedidoCompleto = await usePedidosStore.getState().fetchPedidoDetalles(pedido.id!);

                                  if (!pedidoCompleto) return;

                                  // 2. Cargar en carrito
                                  useCartStore.getState().cargarPedidoParaEditar(pedidoCompleto);

                                  // 3. Navegar usando React Router (sin recarga de página)
                                  toast.success('Abriendo editor...', { id: 'loading-edit' });
                                  navigate('/vender');

                                } catch (error) {
                                  console.error('[EDITAR] Error:', error);
                                  toast.error('Error al intentar editar', { id: 'loading-edit' });
                                }
                              }}
                              className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors border border-transparent hover:border-yellow-200"
                              title="Editar Pedido"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          )}

{/* --- NUEVO: Botón Eliminar (Basura) --- */}
                          {/* Solo permitimos borrar si NO está completado/entregado para seguridad */}
                          {['Pendiente', 'Cancelado'].includes(pedido.estado_nombre || '') && (
                            <button
                              onClick={(e) => handleDeleteClick(pedido.id!, e)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-200"
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
                      
                            className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalle
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