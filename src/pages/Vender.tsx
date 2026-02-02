import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, X, User, Package, CreditCard, ArrowRight, Tag, Grid3x3 as Grid3X3, List, Droplets, FileText, Save, Trash2, DollarSign, CreditCard as Edit, Truck, Home, MapPin, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { useProductosStore } from '../lib/store/productosStore';
import { useCartStore } from '../lib/store/cartStore';
import { useClientesStore } from '../lib/store/clientesStore';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { ClienteSelector } from '../components/ClienteSelector';
import { ClienteSelectorInline } from '../components/ClienteSelectorInline';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { SimplifiedProductList } from '../components/SimplifiedProductList';
import { SalsaSelector } from '../components/SalsaSelector';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { DiscountModal } from '../components/DiscountModal';
import { OrderSummaryModal } from '../components/OrderSummaryModal';
import { formatCurrency } from '../lib/utils/formatters';
import { CobroModal } from '../components/CobroModal';
import { TicketModal } from '../components/TicketModal';
import { SugerenciaComplementosModal } from '../components/SugerenciaComplementosModal';
import { TiempoEntregaModal } from '../components/TiempoEntregaModal';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';
import { useDebounce } from '../lib/hooks/useDebounce';
import { useKeyboardShortcuts } from '../lib/hooks/useKeyboardShortcuts';

// Componente para el Carrito Flotante en Móvil
const FloatingCartButton = ({ onClick }: { onClick: () => void }) => {
  const { getCarritoItemCount, getCarritoTotalConEnvio } = useCartStore();
  const itemCount = getCarritoItemCount();
  const total = getCarritoTotalConEnvio();

  if (itemCount === 0) return null;

  return (
    <div className="lg:hidden fixed bottom-4 right-4 z-40">
      <button
        onClick={onClick}
        className="flex items-center justify-center bg-pirateRed text-boneWhite rounded-full shadow-lg p-4 hover:bg-pirateRedDark transition-transform transform hover:scale-105"
      >
        <ShoppingCart className="w-6 h-6" />
        <span className="ml-2 font-bold">{itemCount}</span>
        <span className="mx-2 h-4 w-px bg-boneWhite/50"></span>
        <span className="font-bold">{formatCurrency(total)}</span>
      </button>
    </div>
  );
};

// Componente dedicado para el Pedido Activo (Carrito)
const PedidoActivo = ({
  onClose,
  onOpenClienteSelector,
  onEditItem,
  onSaveOrder,
  onCharge,
  onClearCart,
  onOpenDiscountModal,
}: {
  onClose?: () => void;
  onOpenClienteSelector: () => void;
  onEditItem: (item: any) => void;
  onSaveOrder: () => void;
  onCharge: () => void;
  onClearCart: () => void;
  onOpenDiscountModal: () => void;
}) => {
  const {
    carrito,
    clienteSeleccionado,
    notas,
    tipoEntregaId,
    costoEnvio,
    direccionEnvio,
    zonaEntregaId,
    notasEntrega,
    descuento,
    descuentoTipo,
    lastRemovedItem,
    updateCarritoQuantity,
    removeFromCarrito,
    getCarritoSubtotal,
    getCarritoTotalConEnvio,
    setNotas,
    setTipoEntrega,
    setCostoEnvio,
    setDireccionEnvio,
    setZonaEntregaId,
    setNotasEntrega,
    undoLastRemove,
  } = useCartStore();
  const { tiposEntrega, zonasEntrega, isSubmitting } = usePedidosStore();

  const tipoEntregaSeleccionado = tiposEntrega.find(t => t.id === tipoEntregaId);
  const subtotal = getCarritoSubtotal();

// PEGA ESTE BLOQUE NUEVO EN SU LUGAR:
  useEffect(() => {
    // 1. Si no hay ID de tipo seleccionado, no hacemos nada
    if (!tipoEntregaId) return;

    // 2. ¡PROTECCIÓN! Si hay ID pero la lista de tipos aún no cargó (es undefined),
    // NO borramos nada. Esperamos a que cargue.
    if (!tipoEntregaSeleccionado) return;

    // 3. Lógica normal: Solo actuamos si ya tenemos la información del tipo de entrega
    if (tipoEntregaSeleccionado.requiere_direccion) {
      // Si requiere dirección y tenemos una del cliente pero ninguna en el envío, la precargamos
      if (clienteSeleccionado?.direccion && !direccionEnvio) {
        const dir = clienteSeleccionado.direccion;
        setDireccionEnvio({
          calle: typeof dir === 'string' ? dir : dir.calle || '',
          ciudad: typeof dir === 'object' ? dir.ciudad || '' : '',
          referencias: typeof dir === 'object' ? dir.referencias || '' : ''
        });
      }
    } else {
      // Solo limpiamos si estamos 100% seguros de que este tipo NO lleva dirección
      setDireccionEnvio(null);
      setCostoEnvio(0);
      setZonaEntregaId(null);
    }
  }, [tipoEntregaId, tipoEntregaSeleccionado, clienteSeleccionado, setCostoEnvio, setDireccionEnvio, setZonaEntregaId, direccionEnvio]);

  useEffect(() => {
    if (zonaEntregaId) {
      const zona = zonasEntrega.find(z => z.id === zonaEntregaId);
      if (zona) {
        const esEnvioGratis = zona.monto_minimo_envio_gratis && subtotal >= zona.monto_minimo_envio_gratis;
        setCostoEnvio(esEnvioGratis ? 0 : zona.costo);
      }
    } else if (!tipoEntregaSeleccionado?.requiere_direccion) {
      setCostoEnvio(0);
    }
  }, [zonaEntregaId, subtotal, zonasEntrega, setCostoEnvio, tipoEntregaSeleccionado]);

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pirateRed to-pirateRedDark flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-bold text-boneWhite flex items-center">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Pedido Activo
        </h2>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-boneWhite hover:bg-white/20 rounded-full">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-shrink-0">
        <ProgressIndicator
          clienteSeleccionado={clienteSeleccionado}
          tipoEntregaId={tipoEntregaId}
          carritoCount={carrito.length}
          direccionCompleta={tipoEntregaSeleccionado?.requiere_direccion ? !!(direccionEnvio?.calle && zonaEntregaId) : true}
          isComplete={!!clienteSeleccionado && !!tipoEntregaId && carrito.length > 0 && (tipoEntregaSeleccionado?.requiere_direccion ? !!(direccionEnvio?.calle && zonaEntregaId) : true)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          <div className="p-3 border-b bg-gray-50">
                {/* Reemplazamos ClienteSelectorInline por este bloque funcional */}
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                   <div className="flex items-center overflow-hidden">
                     <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mr-2">
                       <User className="w-4 h-4 text-gray-500" />
                     </div>
                     <div className="min-w-0">
                       <p className="text-xs font-semibold text-gray-900 truncate">
                         {clienteSeleccionado ? clienteSeleccionado.nombre : 'Público General'}
                       </p>
                       {clienteSeleccionado && (
                         <p className="text-[10px] text-gray-500 truncate">
                           {clienteSeleccionado.telefono || 'Sin teléfono'}
                         </p>
                       )}
                     </div>
                   </div>
                   <button 
                     onClick={onOpenClienteSelector}
                     className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors flex-shrink-0 ml-2 font-medium"
                   >
                     {clienteSeleccionado ? 'Cambiar' : 'Seleccionar'}
                   </button>
                </div>
              </div>
          </div>

          <div className="p-3 border-b bg-gray-50">
            <label className="text-xs font-medium text-gray-700 flex items-center mb-2">
              <Truck className="w-3 h-3 mr-1" />
              Tipo de Entrega
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {tiposEntrega.map((tipo) => (
                <button
                  key={tipo.id}
                  onClick={() => setTipoEntrega(tipo.id)}
                  className={`p-1.5 border rounded text-[10px] text-center transition-colors ${
                    tipoEntregaId === tipo.id
                      ? 'border-pirateRed bg-pirateRed text-white font-medium'
                      : 'border-gray-300 hover:border-pirateRed bg-white'
                  }`}
                >
                  {tipo.nombre}
                </button>
              ))}
            </div>
          </div>

          {tipoEntregaSeleccionado?.requiere_direccion && (
            <div className="p-3 border-b bg-gray-50 space-y-2">
              <h4 className="text-xs font-medium text-gray-700 flex items-center">
                <Home className="w-3 h-3 mr-1" />
                Dirección
              </h4>
              <input
                type="text"
                value={direccionEnvio?.calle || ''}
                onChange={(e) => setDireccionEnvio({
                  calle: e.target.value,
                  ciudad: direccionEnvio?.ciudad || '',
                  referencias: direccionEnvio?.referencias || ''
                })}
                className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
                placeholder="Calle y número"
              />
              <select
                value={zonaEntregaId || ''}
                onChange={(e) => setZonaEntregaId(Number(e.target.value))}
                className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
              >
                <option value="">Seleccionar zona</option>
                {zonasEntrega.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre} ({formatCurrency(z.costo)})
                  </option>
                ))}
              </select>

              {costoEnvio === 0 && zonaEntregaId && tipoEntregaSeleccionado?.requiere_direccion && (
                <div className="p-1.5 bg-green-100 border border-green-200 rounded text-center">
                  <p className="text-[10px] font-semibold text-green-800">Envío gratis</p>
                </div>
              )}

              <input
                type="text"
                value={notasEntrega || ''}
                onChange={(e) => setNotasEntrega(e.target.value)}
                className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
                placeholder="Notas de entrega..."
              />
            </div>
          )}

          {carrito.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">El carrito está vacío</p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-2">
            {carrito.map((item) => (
              <div key={item.id} className="flex items-center space-x-2 p-2 bg-boneWhite rounded-lg border border-gray-200">
                <div className="w-10 h-10 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.imagen_url ? (
                    <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-pirateRedDark truncate">{item.nombre}</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500">{formatCurrency(item.precio)} c/u</p>
                    <p className="text-xs font-bold text-pirateRed">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => updateCarritoQuantity(item.id, item.cantidad - 1)}
                      className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded-full hover:bg-pirateRed hover:text-boneWhite transition-colors"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-xs font-bold w-6 text-center text-pirateRedDark">{item.cantidad}</span>
                    <button
                      onClick={() => updateCarritoQuantity(item.id, item.cantidad + 1)}
                      className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded-full hover:bg-pirateRed hover:text-boneWhite transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-1">
                    {item.salsas_seleccionadas && item.salsas_seleccionadas.length > 0 && (
                      <button onClick={() => onEditItem(item)} className="w-5 h-5 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar">
                        <Edit className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <button onClick={() => removeFromCarrito(item.id)} className="w-5 h-5 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-full transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

          </div>
          )}

          {carrito.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <label className="text-xs font-medium text-gray-700 flex items-center mb-1">
                <FileText className="w-3 h-3 mr-1" />
                Notas del Pedido
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
                placeholder="Observaciones del pedido..."
              />
            </div>
          )}
        </div>
      </div>

      {carrito.length > 0 && (
        <div className="flex-shrink-0 p-3 border-t bg-white space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(getCarritoSubtotal())}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-green-700">Descuento:</span>
                <span className="text-green-700 font-bold">-{formatCurrency(descuentoTipo === 'porcentaje' ? getCarritoSubtotal() * descuento / 100 : descuento)}</span>
              </div>
            )}
            {tipoEntregaId && tipoEntregaSeleccionado?.tiene_costo_asociado && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Envío:</span>
                {costoEnvio > 0 ? (
                  <span className="font-medium">{formatCurrency(costoEnvio)}</span>
                ) : (
                  <span className="font-medium text-green-600">GRATIS</span>
                )}
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-1">
              <span>Total:</span>
              <span className="text-pirateRed">{formatCurrency(getCarritoTotalConEnvio())}</span>
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={onOpenDiscountModal} // <--- CAMBIAR POR ESTO
              className="flex-1 bg-yellow-500 text-white py-1.5 rounded text-xs hover:bg-yellow-600 transition-colors"
              title="Aplicar descuento"
            >
              ${descuento > 0 ? descuento.toFixed(0) : 'Descuento'}
            </button>
            {lastRemovedItem && (
              <button
                onClick={undoLastRemove}
                className="flex-1 bg-blue-500 text-white py-1.5 rounded text-xs hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                title="Deshacer última eliminación"
              >
                <RotateCcw className="w-3 h-3" />
                Deshacer
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onSaveOrder}
              disabled={isSubmitting || !clienteSeleccionado || !tipoEntregaId || carrito.length === 0}
              className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold transition-colors text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              {isSubmitting ? '...' : 'Guardar'}
            </button>
            <button
              onClick={onCharge}
              disabled={isSubmitting || !clienteSeleccionado || !tipoEntregaId || carrito.length === 0}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold transition-colors text-xs"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Cobrar
            </button>
            <button
              onClick={onClearCart}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 flex items-center justify-center font-semibold transition-colors text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Vender() {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  const { 
    productos, 
    categorias, 
    isLoading: productosLoading, 
    fetchProductos, 
    fetchCategorias 
  } = useProductosStore();

  const {
    carrito,
    clienteSeleccionado,
    setClienteSeleccionado,
    addToCarrito,
    replaceCartItem,
    clearCarrito,
    tipoEntregaId,
    costoEnvio,
    descuento,
    descuentoTipo,
    direccionEnvio,
    zonaEntregaId,
    notasEntrega,
    notas,
    editingOrderId
  } = useCartStore();

  const { clientes, fetchClientes } = useClientesStore();

  const { 
    createPedido, 
    updatePedidoCompleto,
    finalizarVentaCompleta, 
    tiposEntrega, 
    zonasEntrega, 
    fetchTiposEntrega, 
    fetchZonasEntrega, 
    isSubmitting 
  } = usePedidosStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isClienteSelectorOpen, setIsClienteSelectorOpen] = useState(false);
  const [isSalsaSelectorOpen, setIsSalsaSelectorOpen] = useState(false);
  const [selectedProductForSalsas, setSelectedProductForSalsas] = useState<any>(null);
  const [editingCartItem, setEditingCartItem] = useState<any | null>(null);
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [pedidoParaCobro, setPedidoParaCobro] = useState<any>(null);
  const [pedidoCreado, setPedidoCreado] = useState<any>(null);
  const [isSimplifiedView, setIsSimplifiedView] = useState(() => {
    const saved = localStorage.getItem('pos-view-preference');
    return saved === 'simplified';
  });
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isSugerenciaComplementosOpen, setIsSugerenciaComplementosOpen] = useState(false);
  const [isTiempoEntregaModalOpen, setIsTiempoEntregaModalOpen] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<'guardar' | 'cobrar' | null>(null);
  const [tiempoEntregaMinutos, setTiempoEntregaMinutos] = useState<number | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [metricasVenta, setMetricasVenta] = useState<{
    ofrecioAcompanamiento: boolean;
    aceptoAcompanamiento: boolean;
    ofrecioPostre: boolean;
    aceptoPostre: boolean;
  }>({
    ofrecioAcompanamiento: false,
    aceptoAcompanamiento: false,
    ofrecioPostre: false,
    aceptoPostre: false,
  });
  // AGREGA ESTO: Efecto para bloquear el scroll del fondo cuando el carrito móvil está abierto
useEffect(() => {
  if (isCartModalOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }
  return () => {
    document.body.style.overflow = 'unset';
  };
}, [isCartModalOpen]);

  // Atajos de teclado para Speed Mode
  const shortcuts = [
    {
      key: 'd',
      callback: () => {
        if (carrito.length > 0) {
          setIsDiscountModalOpen(true);
          toast.success('💰 Descuento - D');
        }
      }
    },
    {
      key: 'Enter',
      callback: () => {
        if (carrito.length > 0 && clienteSeleccionado && tipoEntregaId) {
          handleSaveOrder();
        }
      }
    },
    {
      key: 'z',
      alt: true,
      callback: () => {
        const state = useCartStore.getState();
        if (state.lastRemovedItem) {
          state.undoLastRemove();
          toast.success('↩️ Ítem restaurado - Alt+Z');
        }
      }
    }
  ];

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    const loadData = async () => {
      const vendInitStart = performance.now();
      const logPrefix = '[VENDER-INIT]';

      console.log(`\n${'='.repeat(70)}`);
      console.log(`${logPrefix} INICIALIZANDO PÁGINA VENDER`);
      console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
      console.log(`${'='.repeat(70)}`);

      try {
        // Cargar datos maestros
        console.log(`${logPrefix} [1] Cargando datos maestros (productos, categorías, clientes, etc)...`);
        const dataStart = performance.now();
        await fetchProductos();
        fetchCategorias();
        fetchClientes();
        fetchTiposEntrega();
        fetchZonasEntrega();
        const dataDuration = performance.now() - dataStart;
        console.log(`${logPrefix} [1] ✓ Datos maestros cargados en ${dataDuration.toFixed(2)}ms`);

        // Restaurar editingOrderId desde sessionStorage si fue perdido por recarga
        console.log(`${logPrefix} [2] Verificando sessionStorage para editingOrderId...`);
        const editingOrderIdSession = sessionStorage.getItem('editing-order-id');
        console.log(`${logPrefix} [2] sessionStorage['editing-order-id']:`, editingOrderIdSession);

        if (editingOrderIdSession) {
          console.log(`${logPrefix} [3] SessionStorage tiene valor - intentando restaurar estado...`);
          const cartStore = useCartStore.getState();
          const cartState = cartStore.carrito;

          console.log(`${logPrefix} [3] Estado actual del carrito:`, {
            carritoItems: cartState.length,
            editingOrderId: cartStore.editingOrderId,
            clienteSeleccionado: cartStore.clienteSeleccionado?.nombre
          });

          // Si hay carrito pero no hay editingOrderId en Zustand, restaurarlo
          if (cartState.length > 0 && !cartStore.editingOrderId) {
            console.log(`${logPrefix} [3] Carrito tiene items pero NO tiene editingOrderId - restaurando...`);
            const pedidoId = parseInt(editingOrderIdSession, 10);
            useCartStore.setState({ editingOrderId: pedidoId });
            console.log(`${logPrefix} [3] ✓ editingOrderId restaurado: ${pedidoId}`);
          } else if (cartState.length > 0 && cartStore.editingOrderId) {
            console.log(`${logPrefix} [3] ✓ editingOrderId ya estaba en Zustand: ${cartStore.editingOrderId}`);
          } else {
            console.log(`${logPrefix} [3] ⚠️ Carrito vacío o sin cliente - no restaurando`);
          }
        } else {
          console.log(`${logPrefix} [3] SessionStorage vacío - NO es edición`);
        }

        // Validate cart prices SOLO si NO estamos en modo edición
        // Esto evita toasts de "producto no disponible" durante la edición
        console.log(`${logPrefix} [4] Verificando si debe validar precios...`);
        const cartStore = useCartStore.getState();
        const finalEditingId = cartStore.editingOrderId;
        const carritoHayItems = cartStore.carrito.length > 0;

        console.log(`${logPrefix} [4] Validación:`, {
          carritoItems: carritoHayItems,
          editingOrderId: finalEditingId,
          sessionStorageValue: editingOrderIdSession,
          deberiaMostrarValidacion: carritoHayItems && !finalEditingId && !editingOrderIdSession
        });

        if (carritoHayItems && !finalEditingId && !editingOrderIdSession) {
          console.log(`${logPrefix} [4] → VALIDANDO PRECIOS (no es edición)`);
          const valStart = performance.now();
          await cartStore.validateCartPrices(productos);
          const valDuration = performance.now() - valStart;
          console.log(`${logPrefix} [4] ✓ Validación completada en ${valDuration.toFixed(2)}ms`);
        } else if (carritoHayItems && (finalEditingId || editingOrderIdSession)) {
          console.log(`${logPrefix} [4] → SALTANDO VALIDACIÓN (es modo edición)`);
          console.log(`${logPrefix} [4] ✓ Modo edición detectado - validación deshabilitada`);
        } else {
          console.log(`${logPrefix} [4] → No hay items en carrito - saltando validación`);
        }

        const vendInitDuration = performance.now() - vendInitStart;
        console.log(`\n${logPrefix} ✅ INICIALIZACIÓN COMPLETADA EN ${vendInitDuration.toFixed(2)}ms`);
        console.log(`${'='.repeat(70)}\n`);

      } catch (error) {
        const errorDuration = performance.now() - vendInitStart;
        console.error(`\n${logPrefix} ❌ ERROR DURANTE INICIALIZACIÓN (después de ${errorDuration.toFixed(2)}ms)`);
        console.error(`${logPrefix} Error:`, error);
        if (error instanceof Error) {
          console.error(`${logPrefix} Message: ${error.message}`);
          console.error(`${logPrefix} Stack: ${error.stack}`);
        }
        console.error(`${'='.repeat(70)}\n`);
      }
    };

    loadData();
  }, []);

  // Guardar preferencia de vista
  useEffect(() => {
    localStorage.setItem('pos-view-preference', isSimplifiedView ? 'simplified' : 'grid');
  }, [isSimplifiedView]);

  // IDs de categorías de complementos
  const CATEGORIA_ACOMPANAMIENTO_ID = 39;
  const CATEGORIA_POSTRE_ID = 53;

  // Verificar si faltan complementos en el carrito
  const verificarComplementos = () => {
    const categoriaIds = carrito.map(item => {
      const producto = productos.find(p => p.id === item.producto_id);
      return producto?.categoria_id;
    });

    const tieneAcompanamiento = categoriaIds.includes(CATEGORIA_ACOMPANAMIENTO_ID);
    const tienePostre = categoriaIds.includes(CATEGORIA_POSTRE_ID);

    return {
      faltaAcompanamiento: !tieneAcompanamiento,
      faltaPostre: !tienePostre
    };
  };

  // Validar campos obligatorios
  const validarCamposObligatorios = (): boolean => {
    const cartState = useCartStore.getState();

    console.log('[Validación] Estado del carrito:', {
      cliente: clienteSeleccionado?.nombre || 'Sin cliente',
      tipoEntregaId,
      direccionEnvio: cartState.direccionEnvio,
      zonaEntregaId: cartState.zonaEntregaId,
      carritoItems: carrito.length
    });

    if (!clienteSeleccionado) {
      console.error('[Validación] Error: Cliente no seleccionado');
      toast.error('Debes seleccionar un cliente');
      return false;
    }

    if (!tipoEntregaId) {
      console.error('[Validación] Error: Tipo de entrega no seleccionado');
      toast.error('Debes seleccionar un tipo de entrega');
      return false;
    }

    // Validar campos específicos para entrega a domicilio
    const tipoEntregaSeleccionado = tiposEntrega.find(t => t.id === tipoEntregaId);
    console.log('[Validación] Tipo de entrega:', {
      nombre: tipoEntregaSeleccionado?.nombre,
      requiere_direccion: tipoEntregaSeleccionado?.requiere_direccion
    });

    if (tipoEntregaSeleccionado?.requiere_direccion) {
      if (!cartState.direccionEnvio?.calle || cartState.direccionEnvio.calle.trim() === '') {
        console.error('[Validación] Error: Calle vacía');
        toast.error('Debes ingresar la calle de entrega');
        return false;
      }

      if (!cartState.zonaEntregaId) {
        console.error('[Validación] Error: Zona no seleccionada');
        toast.error('Debes seleccionar una zona de entrega');
        return false;
      }

      console.log('[Validación] ✓ Dirección válida:', {
        calle: cartState.direccionEnvio.calle,
        zonaId: cartState.zonaEntregaId,
        zona: zonasEntrega.find(z => z.id === cartState.zonaEntregaId)?.nombre
      });
    }

    console.log('[Validación] ✓ Todos los campos obligatorios completos');
    return true;
  };

  const handleSaveOrder = () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    // Validar campos obligatorios
    if (!validarCamposObligatorios()) {
      return;
    }

    // Verificar si faltan complementos
    const { faltaAcompanamiento, faltaPostre } = verificarComplementos();

    if (faltaAcompanamiento || faltaPostre) {
      // Registrar que se mostró el modal (se preguntó al vendedor)
      setMetricasVenta({
        ofrecioAcompanamiento: faltaAcompanamiento,
        aceptoAcompanamiento: false,
        ofrecioPostre: faltaPostre,
        aceptoPostre: false,
      });
      setAccionPendiente('guardar');
      setIsSugerenciaComplementosOpen(true);
    } else {
      // Si ya tienen complementos, marcar como aceptados
      setMetricasVenta({
        ofrecioAcompanamiento: false,
        aceptoAcompanamiento: true,
        ofrecioPostre: false,
        aceptoPostre: true,
      });
      setAccionPendiente('guardar');
      setIsTiempoEntregaModalOpen(true);
    }
  };

  const handleCharge = () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    // Validar campos obligatorios
    if (!validarCamposObligatorios()) {
      return;
    }

    // Verificar si faltan complementos
    const { faltaAcompanamiento, faltaPostre } = verificarComplementos();

    if (faltaAcompanamiento || faltaPostre) {
      // Registrar que se mostró el modal (se preguntó al vendedor)
      setMetricasVenta({
        ofrecioAcompanamiento: faltaAcompanamiento,
        aceptoAcompanamiento: false,
        ofrecioPostre: faltaPostre,
        aceptoPostre: false,
      });
      setAccionPendiente('cobrar');
      setIsSugerenciaComplementosOpen(true);
    } else {
      // Si ya tienen complementos, marcar como aceptados
      setMetricasVenta({
        ofrecioAcompanamiento: false,
        aceptoAcompanamiento: true,
        ofrecioPostre: false,
        aceptoPostre: true,
      });
      setAccionPendiente('cobrar');
      setIsTiempoEntregaModalOpen(true);
    }
  };

  const handleConfirmarComplementos = (agregarComplementos: boolean) => {
    setIsSugerenciaComplementosOpen(false);

    if (agregarComplementos) {
      // El vendedor va a agregar complementos (aceptó)
      setMetricasVenta(prev => ({
        ...prev,
        aceptoAcompanamiento: prev.ofrecioAcompanamiento,
        aceptoPostre: prev.ofrecioPostre,
      }));

      // Mantener el carrito abierto para que el usuario agregue productos
      toast.info('Agrega los complementos. Cuando termines, haz clic en el botón nuevamente');
    } else {
      // El vendedor confirmó que el cliente no quiere complementos (rechazó)
      // Las métricas ya están correctas (ofrecio: true, acepto: false)
      // Continuar con el proceso: solicitar tiempo de entrega
      setIsTiempoEntregaModalOpen(true);
    }
  };

  const guardarMetricasVenta = async (pedidoId: number, tiempoEntrega: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const metrica = {
        pedido_id: pedidoId,
        vendedor_id: user?.id || null,
        ofrecio_acompanamiento: metricasVenta.ofrecioAcompanamiento,
        acepto_acompanamiento: metricasVenta.aceptoAcompanamiento,
        ofrecio_postre: metricasVenta.ofrecioPostre,
        acepto_postre: metricasVenta.aceptoPostre,
        tiempo_entrega_prometido: tiempoEntrega,
        fecha_hora: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('metricas_venta')
        .insert([metrica]);

      if (error) {
        console.error('Error guardando métricas:', error);
      }
    } catch (error) {
      console.error('Error guardando métricas de venta:', error);
    }
  };

const handleConfirmarTiempoEntrega = async (minutos: number) => {
    setIsTiempoEntregaModalOpen(false);
    setTiempoEntregaMinutos(minutos);

    try {
      const cartState = useCartStore.getState();
      
      // 1. CÁLCULOS (Conservamos tu lógica de descuentos)
      const subtotalCalc = cartState.getCarritoSubtotal();
      let descuentoValor = 0;

      if (cartState.descuento > 0) {
        if (cartState.descuentoTipo === 'porcentaje') {
          descuentoValor = (subtotalCalc * cartState.descuento) / 100;
        } else {
          descuentoValor = cartState.descuento;
        }
      }

      const totalCalc = Math.max(0, subtotalCalc - descuentoValor + (cartState.costoEnvio || 0));
      
      const pedidoData = {
        cliente_id: clienteSeleccionado?.id || null,
        notas: cartState.notas || '',
        tipo_entrega_id: cartState.tipoEntregaId || null,
        costo_envio: cartState.costoEnvio || 0,
        direccion_envio: cartState.direccionEnvio || null,
        zona_entrega_id: cartState.zonaEntregaId || null,
        notas_entrega: cartState.notasEntrega || '',
        tiempo_entrega_minutos: minutos || null,
        subtotal: subtotalCalc,
        descuentos: descuentoValor,
        total: totalCalc
      };

      // ===== DEBUG: LOGS DETALLADOS DEL CARRITO =====
      console.log('🔍 [VENDER] Carrito completo antes de procesar:', carrito);
      console.log('🔍 [VENDER] Total items en carrito:', carrito.length);
      carrito.forEach((item, idx) => {
        console.log(`🔍 [VENDER] Item[${idx}]:`, {
          id: item.id,
          producto_id: item.producto_id,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
          producto_id_type: typeof item.producto_id,
          producto_id_is_number: typeof item.producto_id === 'number',
          producto_id_is_valid: !!(item.producto_id && typeof item.producto_id === 'number')
        });
      });

      const detalles = carrito
        .filter(item => {
          const isValid = item.producto_id && typeof item.producto_id === 'number';
          if (!isValid) {
            console.error('❌ [VENDER] Item del carrito INVÁLIDO:', {
              item,
              producto_id: item.producto_id,
              type: typeof item.producto_id
            });
            toast.error(`Error: Item "${item.nombre}" no tiene producto_id válido`);
            return false;
          }
          console.log(`✅ [VENDER] Item válido: ${item.nombre} (producto_id: ${item.producto_id})`);
          return true;
        })
        .map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          subtotal: item.subtotal,
          salsas_seleccionadas: item.salsas_seleccionadas,
          nombre: item.producto_original || item.nombre,
        }));

      console.log('🔍 [VENDER] Detalles procesados:', detalles);
      console.log('🔍 [VENDER] IDs de productos:', detalles.map(d => d.producto_id));

      if (detalles.length === 0) {
        toast.error('No hay productos válidos en el carrito');
        return;
      }

      // 2. DECISIÓN CLAVE: ¿Crear o Actualizar?
      if (accionPendiente === 'guardar') {
        let pedidoResultado;

        // === AQUÍ ESTÁ EL CAMBIO ===
        if (editingOrderId) {
            // MODO EDICIÓN: Actualizamos el existente
            console.log('📝 Actualizando pedido:', editingOrderId);
            const resultado = await updatePedidoCompleto(editingOrderId, pedidoData, detalles);
            pedidoResultado = resultado.pedido;
            toast.success(`✏️ Pedido #${editingOrderId} actualizado correctamente`);
        } else {
            // MODO CREACIÓN: Creamos uno nuevo
            console.log('✨ Creando pedido nuevo');
            const resultado = await createPedido(pedidoData, detalles, 'pendiente');
            pedidoResultado = resultado.pedido;

            // Las métricas solo se guardan para ventas nuevas
            await guardarMetricasVenta(pedidoResultado.id, minutos);
            toast.success('✨ Pedido creado correctamente');
        }
        // ==========================

        useCartStore.getState().clearCarrito();
        setPedidoCreado(pedidoResultado);
        setIsTicketModalOpen(true);
        setAccionPendiente(null);

        setMetricasVenta({
          ofrecioAcompanamiento: false,
          aceptoAcompanamiento: false,
          ofrecioPostre: false,
          aceptoPostre: false,
        });

      } else if (accionPendiente === 'cobrar') {
        // Para cobrar, pasamos el ID si estamos editando, para que sepa qué actualizar
        setPedidoParaCobro({
          ...pedidoData,
          id: editingOrderId || undefined, // Importante para el cobro
          detalles,
          subtotal: subtotalCalc,
          total: totalCalc,
          descuentos: descuentoValor,
          cliente_saldo_actual: clienteSeleccionado?.saldo_actual || 0
        });
        setIsCobroModalOpen(true);
        setAccionPendiente(null);
      }
    } catch (error) {
      console.error(error);
      setAccionPendiente(null);
    }
  };

  const handleClearCart = () => {
    if (carrito.length === 0) return;
    
    if (window.confirm('¿Estás seguro de que quieres cancelar el pedido actual?')) {
      useCartStore.getState().clearCarrito();
      toast.success('Pedido cancelado');
    }
  };

  const handleFinalizarVenta = async (pagos: any[], estadoFinal: 'completado' | 'pendiente', descuento: number = 0) => {
    try {
      console.log('[handleFinalizarVenta] Iniciando con pedidoParaCobro:', pedidoParaCobro);
      console.log('[handleFinalizarVenta] Pagos:', pagos);
      console.log('[handleFinalizarVenta] Estado final:', estadoFinal);
      console.log('[handleFinalizarVenta] Descuento:', descuento);

      if (!pedidoParaCobro) {
        toast.error('No hay pedido para cobrar');
        return;
      }

      // Usar el pedidoParaCobro que ya tiene tiempo_entrega_minutos
      const { detalles, subtotal, total, ...pedidoData } = pedidoParaCobro;

      if (!detalles || detalles.length === 0) {
        toast.error('El pedido no tiene productos');
        return;
      }

      console.log('[handleFinalizarVenta] Pedido data:', pedidoData);
      console.log('[handleFinalizarVenta] Detalles:', detalles);

      const resultado = await finalizarVentaCompleta(pedidoData, detalles, pagos, estadoFinal, descuento);

      console.log('[handleFinalizarVenta] Resultado:', resultado);

      // Guardar métricas de venta
      if (tiempoEntregaMinutos) {
        await guardarMetricasVenta(resultado.pedido.id, tiempoEntregaMinutos);
      }

      useCartStore.getState().clearCarrito();
      setIsCobroModalOpen(false);

      // Resetear métricas para el próximo pedido
      setMetricasVenta({
        ofrecioAcompanamiento: false,
        aceptoAcompanamiento: false,
        ofrecioPostre: false,
        aceptoPostre: false,
      });
      setTiempoEntregaMinutos(null);

      // Toast de éxito mejorado con confetti
      const pedidoNum = resultado.pedido?.numero_pedido || resultado.pedido?.id;
      const esEdicion = pedidoParaCobro.id;
      toast.success(
        (t) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{esEdicion ? '✏️' : '🎉'}</span>
              <strong>{esEdicion ? '¡Pedido Actualizado!' : '¡Venta Completada!'}</strong>
            </div>
            <p className="text-sm">Pedido #{pedidoNum}</p>
            <p className="text-xs opacity-80">Total: ${resultado.pedido?.total || '0'}</p>
          </div>
        ),
        { duration: 4000 }
      );
    } catch (error: any) {
      console.error('[handleFinalizarVenta] Error:', error);
      toast.error(`Error al finalizar venta: ${error.message || 'Error desconocido'}`);
    }
  };

  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         producto.codigo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || producto.categoria_id?.toString() === selectedCategory;
    const isActive = producto.activo !== false;
    const isAvailable = producto.disponible_catalogo !== false;

    // Filtrar productos cuya categoría esté activa
    const isCategoryActive = producto.categoria?.active !== false;

    return matchesSearch && matchesCategory && isActive && isAvailable && isCategoryActive;
  });

  const necesitaSalsas = (producto: any): boolean => {
    return producto.requiere_salsas === true;
  };

  const handleAddToCarrito = (producto: any) => {
    if (necesitaSalsas(producto)) {
      setSelectedProductForSalsas(producto);
      setIsSalsaSelectorOpen(true);
    } else {
      addToCarrito(producto);
    }
  };

  const handleConfirmSalsas = (salsasSeleccionadas: any[]) => {
    if (editingCartItem) {
      replaceCartItem(editingCartItem.id, selectedProductForSalsas, salsasSeleccionadas);
    } else if (selectedProductForSalsas) {
      addToCarrito(selectedProductForSalsas, salsasSeleccionadas);
    }
    setIsSalsaSelectorOpen(false);
    setSelectedProductForSalsas(null);
    setEditingCartItem(null);
  };

  const handleEditItem = (cartItem: any) => {
    const productoOriginal = productos.find(p => p.id === cartItem.producto_id);
    if (productoOriginal) {
      setEditingCartItem(cartItem);
      setSelectedProductForSalsas(productoOriginal);
      setIsSalsaSelectorOpen(true);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row lg:gap-8">
        {/* --- Columna Izquierda: Productos --- */}
        <div className="flex-1 lg:flex-[2] flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8">
{editingOrderId && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3 mb-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900">Editando Pedido #{editingOrderId}</p>
                    <p className="text-xs text-amber-700">Los cambios actualizarán el pedido existente</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('¿Deseas cancelar la edición y limpiar el carrito?')) {
                      // 1. Limpiar Store
                      clearCarrito();
                      // 2. Limpiar SessionStorage explícitamente
                      sessionStorage.removeItem('editing-order-id');
                      // 3. Recargar para limpiar cualquier estado residual en memoria
                      window.location.reload();
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-sm font-medium transition-colors"
                >
                  Cancelar Edición
                </button>
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 md:mb-6">
              <div className="flex flex-col space-y-3 sm:space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 gap-2 md:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-4">
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                    <button
                      onClick={() => setIsSimplifiedView(false)}
                      className={`flex-1 sm:flex-none flex items-center justify-center px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        !isSimplifiedView
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span>Colección</span>
                    </button>
                    <button
                      onClick={() => setIsSimplifiedView(true)}
                      className={`flex-1 sm:flex-none flex items-center justify-center px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        isSimplifiedView
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span>Lista</span>
                    </button>
                  </div>

                  <div className="text-xs sm:text-sm text-gray-500 flex items-center justify-center sm:justify-start">
                    <Package className="w-4 h-4 mr-1" />
                    {filteredProductos.length} productos
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-4">
            {!isSimplifiedView && (
              <div className="bg-white rounded-lg shadow-md border border-gray-300 p-4 mb-6">
                <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
                  <button 
                    onClick={() => setSelectedCategory('')} 
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-sm ${
                      selectedCategory === ''
                        ? 'bg-pirateRed text-boneWhite shadow-md' 
                        : 'bg-boneWhite text-pirateRed border border-pirateRed border-opacity-30 hover:bg-pirateRed hover:bg-opacity-10'
                    }`}
                  >
                    Todos
                  </button>
                  {categorias.map((categoria) => (
                    <button 
                      key={categoria.id} 
                      onClick={() => setSelectedCategory(categoria.id.toString())} 
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-sm ${
                        selectedCategory === categoria.id.toString()
                          ? 'bg-pirateRed text-boneWhite shadow-md' 
                          : 'bg-boneWhite text-pirateRed border border-pirateRed border-opacity-30 hover:bg-pirateRed hover:bg-opacity-10'
                      }`}
                    >
                      <Tag className="w-4 h-4 mr-1 inline" />
                      {categoria.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSimplifiedView ? (
              <SimplifiedProductList 
                productos={filteredProductos} 
                carrito={carrito} 
                onAddToCarrito={handleAddToCarrito} 
                onUpdateQuantity={useCartStore.getState().updateCarritoQuantity} 
                onRemoveFromCarrito={useCartStore.getState().removeFromCarrito} 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
                {productosLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pirateRed"></div>
                    <span className="ml-2 text-gray-600">Cargando productos...</span>
                  </div>
                ) : filteredProductos.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos disponibles</h3>
                    <p className="text-gray-500">
                      {searchTerm || selectedCategory 
                        ? 'No se encontraron productos con los filtros aplicados.' 
                        : 'No hay productos activos en el catálogo.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProductos.map((producto) => {
                      const precio = producto.precio_descuento && producto.precio_descuento > 0 ? producto.precio_descuento : producto.precio_regular || producto.precio || 0;
                      const enCarrito = carrito.find(item => item.producto_id === producto.id);

                      return (
                        <div 
                          key={producto.id} 
                          className={`bg-boneWhite rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer border-2 relative ${
                            enCarrito ? 'border-pirateRed bg-pirateRed bg-opacity-5 shadow-md' : 'border-gray-200 hover:border-pirateRed hover:bg-pirateRed hover:bg-opacity-5'
                          }`} 
                          onClick={() => handleAddToCarrito(producto)}
                        >
                          <div className="aspect-square bg-white rounded-lg mb-3 flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
                            {producto.imagenes_urls && producto.imagenes_urls[0] ? (
                              <img src={producto.imagenes_urls[0]} alt={producto.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-8 h-8 text-gray-400" />
                            )}
                          </div>

                          <div className="space-y-2">
                            <h3 className="font-semibold text-pirateRedDark text-sm line-clamp-2 leading-tight">
                              {producto.nombre}
                            </h3>
                            <div className="flex items-center justify-between">
                              <div>
                                {producto.precio_descuento && producto.precio_descuento > 0 ? (
                                  <div>
                                    <span className="text-sm font-bold text-green-600">{formatCurrency(producto.precio_descuento)}</span>
                                    <div className="text-xs text-gray-500 line-through">{formatCurrency(producto.precio_regular)}</div>
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-pirateRedDark">{formatCurrency(precio)}</span>
                                )}
                              </div>
                              {enCarrito && (
                                <span className="bg-pirateRed text-boneWhite text-xs px-2 py-1 rounded-full min-w-[24px] text-center font-semibold shadow-sm">
                                  {enCarrito.cantidad}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Columna Derecha: Pedido Activo (Solo visible en escritorio) --- */}
        <div className="hidden lg:block lg:flex-[1] lg:max-w-sm">
          <div className="sticky top-0 p-4 sm:p-6 lg:p-8" style={{ height: 'calc(100vh - 2rem)' }}>
            <div className="h-full">
              <PedidoActivo
                onOpenClienteSelector={() => setIsClienteSelectorOpen(true)}
                onEditItem={handleEditItem}
                onSaveOrder={handleSaveOrder}
                onCharge={handleCharge}
                onClearCart={handleClearCart}
                onOpenDiscountModal={() => setIsDiscountModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante para móvil */}
      <FloatingCartButton onClick={() => setIsCartModalOpen(true)} />

      {/* Modal del carrito para móvil */}
      {isCartModalOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsCartModalOpen(false)}>
          <div className="fixed inset-x-0 bottom-0 bg-gray-50 rounded-t-2xl shadow-2xl h-[85dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <PedidoActivo
              onClose={() => setIsCartModalOpen(false)}
              onOpenClienteSelector={() => setIsClienteSelectorOpen(true)}
              onEditItem={handleEditItem}
              onSaveOrder={handleSaveOrder}
              onCharge={handleCharge}
              onClearCart={handleClearCart}
              onOpenDiscountModal={() => setIsDiscountModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Modales */}
      <ClienteSelector 
        isOpen={isClienteSelectorOpen} 
        onClose={() => setIsClienteSelectorOpen(false)} 
        clientes={clientes} 
        onClienteSelect={(cliente) => { 
          setClienteSeleccionado(cliente); 
          setIsClienteSelectorOpen(false); 
        }} 
      />
      
      <SalsaSelector 
        isOpen={isSalsaSelectorOpen} 
        onClose={() => { 
          setIsSalsaSelectorOpen(false); 
          setSelectedProductForSalsas(null); 
          setEditingCartItem(null); 
        }} 
        producto={selectedProductForSalsas} 
        onConfirm={handleConfirmSalsas} 
        initialSelection={editingCartItem?.salsas_seleccionadas || []} 
      />
      
      <ConfirmationModal 
        isOpen={isConfirmationModalOpen} 
        onClose={() => setIsConfirmationModalOpen(false)} 
        onConfirm={() => {}} 
        title="Confirmación" 
        message="¿Estás seguro?" 
      />
      
      <CobroModal
        isOpen={isCobroModalOpen}
        onClose={() => setIsCobroModalOpen(false)}
        pedido={pedidoParaCobro}
        onFinalizar={handleFinalizarVenta}
        isSubmitting={isSubmitting}
        cliente={clienteSeleccionado}
        tipoEntrega={tiposEntrega.find(t => t.id === tipoEntregaId)}
      />

      <SugerenciaComplementosModal
        isOpen={isSugerenciaComplementosOpen}
        onClose={() => {
          setIsSugerenciaComplementosOpen(false);
          setAccionPendiente(null);
        }}
        onConfirmar={handleConfirmarComplementos}
        faltaAcompanamiento={verificarComplementos().faltaAcompanamiento}
        faltaPostre={verificarComplementos().faltaPostre}
      />

      <TiempoEntregaModal
        isOpen={isTiempoEntregaModalOpen}
        onClose={() => {
          setIsTiempoEntregaModalOpen(false);
          setAccionPendiente(null);
        }}
        onConfirmar={handleConfirmarTiempoEntrega}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        subtotal={useCartStore.getState().getCarritoSubtotal()}
      />

      <OrderSummaryModal
        isOpen={isOrderSummaryOpen}
        onClose={() => setIsOrderSummaryOpen(false)}
        onConfirm={() => {
          setIsOrderSummaryOpen(false);
          handleSaveOrder();
        }}
        cliente={clienteSeleccionado}
        tipoEntrega={tiposEntrega.find(t => t.id === tipoEntregaId)}
        items={carrito}
        subtotal={useCartStore.getState().getCarritoSubtotal()}
        descuento={descuento}
        descuentoTipo={descuentoTipo}
        costoEnvio={costoEnvio}
        direccion={direccionEnvio}
        zonaEntrega={zonasEntrega.find(z => z.id === zonaEntregaId)}
        notasEntrega={notasEntrega}
        notas={notas}
      />

      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setPedidoCreado(null);
        }}
        pedido={pedidoCreado}
      />
    </>
  );
}