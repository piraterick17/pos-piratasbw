import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  User, 
  Package, 
  DollarSign, 
  Calendar, 
  FileText,
  Edit,
  Save,
  Plus,
  Minus,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  ShoppingCart,
  CreditCard,
  Receipt,
  Printer,
  Truck,
  MapPin,
  Home
} from 'lucide-react';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { useProductosStore } from '../lib/store/productosStore';
import { useClientesStore } from '../lib/store/clientesStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
import { ClienteSelector } from '../components/ClienteSelector';
import { CancellationModal } from '../components/CancellationModal';
import { CobroModal } from '../components/CobroModal';
import { TicketModal } from '../components/TicketModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';

interface PedidoDetalleProps {
  pedidoId: string;
}

export function PedidoDetalle({ pedidoId }: PedidoDetalleProps) {
  const { 
    pedidoActual, 
    estadosPedido,
    isLoading, 
    isSubmitting,
    fetchPedidoDetalles, 
    updatePedidoCompleto,
    finalizarPedido,
    getValidTransitions,
    updatePedidoStatus,
    registrarPago,
    clearPedidoActual 
  } = usePedidosStore();

  const { productos, fetchProductos } = useProductosStore();
  const { clientes, fetchClientes } = useClientesStore();

  // Estados para el modo de edición
  const [isEditing, setIsEditing] = useState(false);
  const [validTransitions, setValidTransitions] = useState<any[]>([]);
  const [isClienteSelectorOpen, setIsClienteSelectorOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isFinalizationConfirmOpen, setIsFinalizationConfirmOpen] = useState(false);
  const [pedidoParaTicket, setPedidoParaTicket] = useState<any>(null);
  
  // Estados para los datos editables
  const [editData, setEditData] = useState({
    cliente_id: '',
    notas: '',
    metodo_pago: '',
    descuentos: 0,
    impuestos: 0,
  });

  // Estados para la gestión de productos
  const [editingDetalles, setEditingDetalles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<any>(null);

  useEffect(() => {
    if (pedidoId && pedidoId !== 'nuevo') {
      fetchPedidoDetalles(Number(pedidoId));
      fetchProductos();
      fetchClientes();
    }
    
    return () => {
      clearPedidoActual();
    };
  }, [pedidoId, fetchPedidoDetalles, fetchProductos, fetchClientes, clearPedidoActual]);

  useEffect(() => {
    if (pedidoActual) {
      setEditData({
        cliente_id: pedidoActual.cliente_id || '',
        notas: pedidoActual.notas || '',
        metodo_pago: pedidoActual.metodo_pago || '',
        descuentos: pedidoActual.descuentos || 0,
        impuestos: pedidoActual.impuestos || 0,
      });

      setEditingDetalles(pedidoActual.detalles || []);
      
      // Buscar el cliente seleccionado
      if (pedidoActual.cliente_id) {
        const cliente = clientes.find(c => c.id === pedidoActual.cliente_id);
        setSelectedCliente(cliente || null);
      }

      // Obtener transiciones válidas
      if (pedidoActual.estado_id) {
        getValidTransitions(pedidoActual.estado_id).then(setValidTransitions);
      }
    }
  }, [pedidoActual, getValidTransitions, clientes]);

  const handleBackToPedidos = () => {
    window.location.hash = '#pedidos';
    window.location.reload();
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    // Restaurar datos originales
    if (pedidoActual) {
      setEditData({
        cliente_id: pedidoActual.cliente_id || '',
        notas: pedidoActual.notas || '',
        metodo_pago: pedidoActual.metodo_pago || '',
        descuentos: pedidoActual.descuentos || 0,
        impuestos: pedidoActual.impuestos || 0,
      });
      setEditingDetalles(pedidoActual.detalles || []);
    }
  };

  const handleSaveChanges = async () => {
    if (!pedidoActual?.id) return;

    try {
      // PREPARAR DATOS LIMPIOS PARA LA ACTUALIZACIÓN
      const nuevosDetallesLimpios = editingDetalles.map(detalle => ({
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        subtotal: detalle.cantidad * detalle.precio_unitario,
      }));

      await updatePedidoCompleto(pedidoActual.id, editData, nuevosDetallesLimpios);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleFinalizarVenta = () => {
    if (!pedidoActual?.id) return;
    setIsFinalizationConfirmOpen(true);
  };

  const handleConfirmFinalization = () => {
    setIsFinalizationConfirmOpen(false);
    setIsCobroModalOpen(true);
  };

  const handleRegistrarPago = async (pagos: any[], estadoFinal: 'completado' | 'pendiente') => {
    try {
      console.log('[PedidoDetalle - handleRegistrarPago] Pagos recibidos:', pagos);
      console.log('[PedidoDetalle - handleRegistrarPago] Estado final:', estadoFinal);
      console.log('[PedidoDetalle - handleRegistrarPago] Pedido actual:', pedidoActual);

      if (!pedidoActual?.id) {
        toast.error('No hay pedido para registrar el pago');
        return;
      }

      // Registrar cada pago individualmente
      for (const pago of pagos) {
        const pagoData = {
          pedido_id: pedidoActual.id,
          metodo_pago: pago.metodo_pago,
          monto: pago.monto,
        };

        console.log('[PedidoDetalle - handleRegistrarPago] Registrando pago:', pagoData);
        await registrarPago(pagoData);
      }

      setIsCobroModalOpen(false);

      // Verificar si el pedido está completamente pagado
      const { data: estaPagado, error } = await supabase
        .rpc('pedido_completamente_pagado', { pedido_id_param: pedidoActual.id });

      console.log('[PedidoDetalle - handleRegistrarPago] ¿Está pagado?', estaPagado);

      if (!error && estaPagado && estadoFinal === 'completado') {
        console.log('[PedidoDetalle - handleRegistrarPago] Finalizando pedido...');
        await finalizarPedido(pedidoActual.id);

        // Vuelve a cargar los detalles del pedido para obtener el estado "Completado"
        await fetchPedidoDetalles(pedidoActual.id);
        toast.success('Pago registrado y pedido finalizado automáticamente');
      } else {
        // Si no está completamente pagado, solo refresca los detalles para mostrar el nuevo pago
        await fetchPedidoDetalles(pedidoActual.id);
        toast.success(estadoFinal === 'pendiente' ? 'Pago parcial registrado' : 'Pago registrado exitosamente');
      }
    } catch (error: any) {
      console.error('[PedidoDetalle - handleRegistrarPago] Error:', error);
      toast.error(`Error al registrar pago: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleStatusChange = async (nuevoEstadoId: number, estadoNombre: string) => {
    if (!pedidoActual?.id) return;

    // Si es cancelación, abrir modal de justificación
    if (estadoNombre === 'Cancelado') {
      setIsCancellationModalOpen(true);
      return;
    }

    try {
      await updatePedidoStatus(pedidoActual.id, nuevoEstadoId);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleConfirmCancellation = async (justificacion: string) => {
    if (!pedidoActual?.id) return;

    try {
      const estadoCancelado = validTransitions.find(t => t.nombre === 'Cancelado');
      if (estadoCancelado) {
        await updatePedidoStatus(pedidoActual.id, estadoCancelado.id, justificacion);
      }
      setIsCancellationModalOpen(false);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleShowTicket = () => {
    if (pedidoActual) {
      setPedidoParaTicket(pedidoActual);
      setIsTicketModalOpen(true);
    }
  };

  // Funciones para gestión de productos en modo edición
  const handleAddProduct = (producto: any) => {
    const existingIndex = editingDetalles.findIndex(d => d.producto_id === producto.id);
    
    if (existingIndex >= 0) {
      // Si ya existe, incrementar cantidad
      const newDetalles = [...editingDetalles];
      newDetalles[existingIndex].cantidad += 1;
      newDetalles[existingIndex].subtotal = newDetalles[existingIndex].cantidad * newDetalles[existingIndex].precio_unitario;
      setEditingDetalles(newDetalles);
    } else {
      // Si no existe, añadir nuevo
      const precio = producto.precio_descuento && producto.precio_descuento > 0 
        ? producto.precio_descuento 
        : producto.precio_regular || producto.precio || 0;
      
      const nuevoDetalle = {
        producto_id: producto.id,
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio,
        producto: {
          nombre: producto.nombre,
          codigo: producto.codigo,
        }
      };
      
      setEditingDetalles([...editingDetalles, nuevoDetalle]);
    }
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveProduct(index);
      return;
    }
    
    const newDetalles = [...editingDetalles];
    newDetalles[index].cantidad = newQuantity;
    newDetalles[index].subtotal = newQuantity * newDetalles[index].precio_unitario;
    setEditingDetalles(newDetalles);
  };

  const handleRemoveProduct = (index: number) => {
    const newDetalles = editingDetalles.filter((_, i) => i !== index);
    setEditingDetalles(newDetalles);
  };

  const handleClienteSelect = (cliente: any) => {
    setSelectedCliente(cliente);
    setEditData({ ...editData, cliente_id: cliente?.id || '' });
    setIsClienteSelectorOpen(false);
  };

  // Filtrar productos para búsqueda
  const filteredProductos = productos.filter(producto => {
    if (!producto.activo || producto.disponible_catalogo === false) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      producto.nombre.toLowerCase().includes(searchLower) ||
      producto.codigo?.toLowerCase().includes(searchLower)
    );
  });

  // Calcular totales de pagos
  const totalPagado = pedidoActual?.pagos?.reduce((sum, pago) => sum + (pago.monto || 0), 0) || 0;
  const saldoPendiente = (pedidoActual?.total || 0) - totalPagado;

  // Determinar si se puede finalizar el pedido
  const canFinalize = pedidoActual && 
    pedidoActual.estado_nombre !== 'Completado' && 
    pedidoActual.estado_nombre !== 'Cancelado';

  const canEdit = pedidoActual && 
    (pedidoActual.estado_nombre === 'Pendiente' || pedidoActual.estado_nombre === 'En Preparación');

  // Determinar si mostrar el botón de finalizar venta
  const showFinalizarVenta = canFinalize;

  const metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'debito', label: 'Tarjeta de Débito' },
    { value: 'credito', label: 'Tarjeta de Crédito' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'credito_cliente', label: 'Crédito del Cliente' },
  ];

  if (isLoading) {
    return (
      <div className="overflow-y-auto h-full">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando pedido...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pedidoActual) {
    return (
      <div className="overflow-y-auto h-full">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pedido no encontrado</h3>
            <p className="text-gray-500 mb-4">El pedido que buscas no existe o ha sido eliminado.</p>
            <button
              onClick={handleBackToPedidos}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center py-3 md:py-4 space-y-3 md:space-y-0">
            <div className="flex items-center">
              <button
                onClick={handleBackToPedidos}
                className="mr-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver a Pedidos"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-600 mr-2 md:mr-3" />
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                  Pedido #{pedidoActual.id}
                </h1>
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: pedidoActual.estado_color || '#6B7280' }}
                >
                  {pedidoActual.estado_nombre || pedidoActual.estado}
                </span>
              </div>
            </div>
            
            <div className="flex items-center flex-wrap gap-2 justify-end">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleShowTicket}
                    className="inline-flex items-center justify-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
                    title="Ver/Imprimir Ticket"
                  >
                    <Printer className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Ver Ticket</span>
                  </button>

                  {canEdit && (
                    <button
                      onClick={handleStartEditing}
                      className="inline-flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm"
                      title="Editar pedido"
                    >
                      <Edit className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Editar</span>
                    </button>
                  )}

                  {showFinalizarVenta && (
                    <button
                      onClick={handleFinalizarVenta}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold shadow-md"
                      title="Finalizar venta y registrar pago"
                    >
                      <CreditCard className="w-4 h-4 md:mr-2" />
                      <span className="hidden sm:inline">Finalizar Venta</span>
                      <span className="sm:hidden">Finalizar</span>
                    </button>
                  )}

                  {/* Mostrar estado si ya está completado */}
                  {pedidoActual.estado_nombre === 'Completado' && (
                    <div className="inline-flex items-center px-3 md:px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm">
                      <CheckCircle className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Pedido Completado</span>
                    </div>
                  )}

                  {/* Mostrar si está cancelado */}
                  {pedidoActual.estado_nombre === 'Cancelado' && (
                    <div className="inline-flex items-center px-3 md:px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm">
                      <X className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Pedido Cancelado</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEditing}
                    className="inline-flex items-center px-3 md:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    <Save className="w-4 h-4 md:mr-2" />
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Estado y Información Básica */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Información del Cliente
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente
                  </label>
                  {isEditing ? (
                    <button
                      onClick={() => setIsClienteSelectorOpen(true)}
                      className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">
                          {selectedCliente ? selectedCliente.nombre : 'Seleccionar Cliente'}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">
                        {pedidoActual.cliente_nombre || 'Sin cliente'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Creación
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">
                      {pedidoActual.insert_date ? formatDate(pedidoActual.insert_date) : '-'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.metodo_pago}
                      onChange={(e) => setEditData({ ...editData, metodo_pago: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar método</option>
                      {metodosPago.map((metodo) => (
                        <option key={metodo.value} value={metodo.value}>
                          {metodo.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">
                        {pedidoActual.metodo_pago?.replace('_', ' ') || 'No especificado'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total
                  </label>
                  <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600 mr-3" />
                    <span className="text-blue-900 font-semibold text-lg">
                      {formatCurrency(pedidoActual.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                {isEditing ? (
                  <textarea
                    value={editData.notas}
                    onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notas adicionales sobre el pedido..."
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg min-h-[80px]">
                    <span className="text-gray-900">
                      {pedidoActual.notas || 'Sin observaciones'}
                    </span>
                  </div>
                )}
              </div>

              {/* Ajustes adicionales en modo edición */}
              {isEditing && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descuentos
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editData.descuentos}
                      onChange={(e) => setEditData({ ...editData, descuentos: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Impuestos
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editData.impuestos}
                      onChange={(e) => setEditData({ ...editData, impuestos: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta de Información de Entrega */}
            {pedidoActual.tipo_entrega_id && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Información de Entrega
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">{pedidoActual.tipo_entrega_nombre}</span>
                  </div>
                  {(pedidoActual.costo_envio || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Costo de Envío:</span>
                      <span className="font-medium">{formatCurrency(pedidoActual.costo_envio)}</span>
                    </div>
                  )}
                  {pedidoActual.direccion_envio && (
                    <div className="pt-2 border-t mt-2">
                      <p className="font-medium text-gray-900 flex items-center mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        Dirección:
                      </p>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-blue-900 font-medium">
                          {pedidoActual.direccion_envio.calle}
                          {pedidoActual.direccion_envio.ciudad && `, ${pedidoActual.direccion_envio.ciudad}`}
                        </p>
                        {pedidoActual.direccion_envio.referencias && (
                          <p className="text-blue-700 text-sm mt-1">
                            <strong>Referencias:</strong> {pedidoActual.direccion_envio.referencias}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {pedidoActual.notas_entrega && (
                    <div className="pt-2 border-t mt-2">
                      <p className="font-medium text-gray-900 flex items-center mb-2">
                        <Home className="w-4 h-4 mr-1" />
                        Notas de Entrega:
                      </p>
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-yellow-900">{pedidoActual.notas_entrega}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Productos del Pedido */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Productos
              </h2>
              
              {editingDetalles && editingDetalles.length > 0 ? (
                <div className="space-y-4">
                  {editingDetalles.map((detalle, index) => (
                    <div key={index} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-gray-50 rounded-lg space-y-4 md:space-y-0">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">
                            {detalle.producto?.nombre || 'Producto eliminado'}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(detalle.precio_unitario)} c/u
                          </p>
                          {detalle.producto?.codigo && (
                            <p className="text-xs text-gray-400">
                              Código: {detalle.producto.codigo}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between md:justify-end space-x-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(index, detalle.cantidad - 1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            
                            <span className="text-sm font-medium w-12 text-center">
                              {detalle.cantidad}
                            </span>
                            
                            <button
                              onClick={() => handleUpdateQuantity(index, detalle.cantidad + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleRemoveProduct(index)}
                              className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-full transition-colors ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Cantidad: {detalle.cantidad}
                            </p>
                          </div>
                        )}
                        
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(detalle.subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay productos en este pedido</p>
                </div>
              )}
            </div>

            {/* Búsqueda y adición de productos (solo en modo edición) */}
            {isEditing && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Añadir Productos
                </h2>
                
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {searchTerm && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {filteredProductos.slice(0, 12).map((producto) => (
                      <button
                        key={producto.id}
                        onClick={() => handleAddProduct(producto)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {producto.nombre}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(producto.precio_descuento || producto.precio_regular || 0)}
                        </p>
                        {producto.codigo && (
                          <p className="text-xs text-gray-400">{producto.codigo}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel Lateral */}
          <div className="space-y-6">
            {/* Resumen Financiero */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Financiero</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(pedidoActual.subtotal || 0)}</span>
                </div>
                
                {(pedidoActual.descuentos || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descuentos:</span>
                    <span className="text-red-600">-{formatCurrency(pedidoActual.descuentos || 0)}</span>
                  </div>
                )}
                
                {(pedidoActual.impuestos || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Impuestos:</span>
                    <span className="font-medium">{formatCurrency(pedidoActual.impuestos || 0)}</span>
                  </div>
                )}

                {(pedidoActual.costo_envio || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Costo de Envío:</span>
                    <span className="font-medium">{formatCurrency(pedidoActual.costo_envio || 0)}</span>
                  </div>
                )}
                
                <hr className="border-gray-200" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(pedidoActual.total || 0)}</span>
                </div>

                {/* Información de pagos */}
                {totalPagado > 0 && (
                  <>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Pagado:</span>
                      <span className="font-medium text-green-600">{formatCurrency(totalPagado)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saldo Pendiente:</span>
                      <span className={`font-medium ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(saldoPendiente)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Historial de Pagos */}
            {pedidoActual.pagos && pedidoActual.pagos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Receipt className="w-5 h-5 mr-2" />
                  Historial de Pagos
                </h3>
                
                <div className="space-y-3">
                  {pedidoActual.pagos.map((pago, index) => (
                    <div key={pago.id || index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {pago.metodo_pago?.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {pago.fecha_pago ? formatDate(pago.fecha_pago) : 'Fecha no disponible'}
                          </p>
                          {pago.observaciones && (
                            <p className="text-xs text-gray-400 mt-1">
                              {pago.observaciones}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(pago.monto)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transiciones de Estado Disponibles */}
            {validTransitions.length > 0 && !isEditing && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Estado</h3>
                
                <div className="space-y-2">
                  {validTransitions.map((transicion) => (
                    <button
                      key={transicion.id}
                      onClick={() => handleStatusChange(transicion.id, transicion.nombre)}
                      className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      style={{ borderColor: transicion.color_hex }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{transicion.nombre}</span>
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: transicion.color_hex }}
                        ></span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {transicion.descripcion}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Información Adicional */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Creado por:</span>
                  <span className="ml-2 font-medium">Sistema</span>
                </div>
                
                {pedidoActual.updated_at && (
                  <div>
                    <span className="text-gray-600">Última modificación:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(pedidoActual.updated_at)}
                    </span>
                  </div>
                )}

                {pedidoActual.fecha_finalizacion && (
                  <div>
                    <span className="text-gray-600">Fecha de finalización:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(pedidoActual.fecha_finalizacion)}
                    </span>
                  </div>
                )}
                
                <div>
                  <span className="text-gray-600">Productos:</span>
                  <span className="ml-2 font-medium">
                    {editingDetalles?.length || 0} items
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cliente Selector Modal */}
      <ClienteSelector
        isOpen={isClienteSelectorOpen}
        onClose={() => setIsClienteSelectorOpen(false)}
        clientes={clientes}
        onClienteSelect={handleClienteSelect}
      />

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        onConfirm={handleConfirmCancellation}
        isSubmitting={isSubmitting}
      />

      {/* Finalization Confirmation Modal */}
      <ConfirmationModal
        isOpen={isFinalizationConfirmOpen}
        onClose={() => setIsFinalizationConfirmOpen(false)}
        onConfirm={handleConfirmFinalization}
        title="¿Pirata, estás seguro de finalizar la orden?"
        message="Una vez finalizada, no podrás editarla después."
        confirmText="Sí, finalizar"
        cancelText="Cancelar"
        type="warning"
      />

      {/* Cobro Modal */}
      <CobroModal
        isOpen={isCobroModalOpen}
        onClose={() => setIsCobroModalOpen(false)}
        pedido={pedidoActual}
        onFinalizar={handleRegistrarPago}
        isSubmitting={isSubmitting}
      />

      {/* Ticket Modal */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setPedidoParaTicket(null);
        }}
        pedido={pedidoParaTicket}
      />
    </div>
  );
}