import { useEffect } from 'react';
import {
    ShoppingCart,
    X,
    User,
    Home,
    Package,
    Minus,
    Plus,
    Edit,
    RotateCcw,
    Save,
    DollarSign,
    Trash2
} from 'lucide-react';
import { useCartStore } from '../../lib/store/cartStore';
import { usePedidosStore } from '../../lib/store/pedidosStore';
import { formatCurrency } from '../../lib/utils/formatters';
import { ProgressIndicator } from '../ProgressIndicator';

interface PedidoActivoProps {
    onClose?: () => void;
    onOpenClienteSelector: () => void;
    onEditItem: (item: any) => void;
    onSaveOrder: () => void;
    onCharge: () => void;
    onClearCart: () => void;
    onOpenDiscountModal: () => void;
}

export const PedidoActivo = ({
    onClose,
    onOpenClienteSelector,
    onEditItem,
    onSaveOrder,
    onCharge,
    onClearCart,
    onOpenDiscountModal,
}: PedidoActivoProps) => {
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
        editingOrderId,
    } = useCartStore();

    const { tiposEntrega, zonasEntrega, isSubmitting } = usePedidosStore();

    const tipoEntregaSeleccionado = tiposEntrega.find(t => t.id === tipoEntregaId);
    const subtotal = getCarritoSubtotal();

    // Lógica de sincronización de dirección y costos
    useEffect(() => {
        if (!tipoEntregaId) return;
        if (!tipoEntregaSeleccionado) return;

        if (tipoEntregaSeleccionado.requiere_direccion) {
            if (clienteSeleccionado?.direccion && !direccionEnvio) {
                const dir = clienteSeleccionado.direccion;
                setDireccionEnvio({
                    calle: typeof dir === 'string' ? dir : dir.calle || '',
                    ciudad: typeof dir === 'object' ? dir.ciudad || '' : '',
                    referencias: typeof dir === 'object' ? dir.referencias || '' : ''
                });
            }
        } else {
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
        <div className="bg-white lg:rounded-2xl rounded-t-3xl shadow-xl lg:border border-gray-100 flex flex-col h-full overflow-hidden transition-all duration-300">
            <div className={`p-3 md:p-5 border-b border-gray-200/20 flex justify-between items-center flex-shrink-0 transition-all duration-700 ${editingOrderId
                ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[0_4px_20px_rgba(245,158,11,0.3)]'
                : 'bg-gradient-to-br from-pirateRed via-pirateRed to-pirateRedDark shadow-[0_4px_20px_rgba(184,28,28,0.3)]'
                }`}>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                            <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-black text-white tracking-tight">
                            {editingOrderId ? `Pedido #${editingOrderId}` : 'Nuevo Pedido'}
                        </h2>
                    </div>
                    {editingOrderId && (
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            <span className="text-[9px] font-black tracking-[0.2em] text-white/90 uppercase">
                                Modo Edición
                            </span>
                        </div>
                    )}
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-2 text-white hover:bg-white/20 rounded-xl transition-colors">
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
                    {/* Cliente Info */}
                    <div className="p-3 border-b bg-gray-50/50">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center min-w-0 flex-1">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl border border-gray-200 flex items-center justify-center flex-shrink-0 mr-3 shadow-sm">
                                    <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] md:text-xs font-black text-gray-900 truncate">
                                        {clienteSeleccionado ? clienteSeleccionado.nombre : 'Público General'}
                                    </p>
                                    {clienteSeleccionado && (
                                        <p className="text-[9px] md:text-[10px] font-medium text-gray-500">
                                            {clienteSeleccionado.telefono || 'Sin registro'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onOpenClienteSelector}
                                className="text-[9px] md:text-[10px] font-black bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300 border border-blue-100 flex-shrink-0"
                            >
                                {clienteSeleccionado ? 'Cambiar' : 'Asignar'}
                            </button>
                        </div>
                    </div>

                    <div className="p-2.5 border-b bg-gray-50">
                        <div className="grid grid-cols-4 gap-1.5">
                            {tiposEntrega.map((tipo) => (
                                <button
                                    key={tipo.id}
                                    onClick={() => setTipoEntrega(tipo.id)}
                                    className={`p-1.5 border rounded-lg text-[10px] text-center transition-all ${tipoEntregaId === tipo.id
                                        ? 'border-pirateRed bg-pirateRed text-white font-black shadow-sm scale-[1.02]'
                                        : 'border-gray-200 bg-white text-gray-500 font-bold'
                                        }`}
                                >
                                    {tipo.nombre}
                                </button>
                            ))}
                        </div>
                    </div>

                    {tipoEntregaSeleccionado?.requiere_direccion && (
                        <div className="p-2.5 sm:p-3 border-b bg-gray-50 space-y-2">
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
                        <div className="p-3 space-y-3">
                            {carrito.map((item) => (
                                <div key={item.id} className="group relative flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-pirateRed/10 transition-all duration-300">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-lg md:rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                                        {item.imagen_url ? (
                                            <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <Package className="w-4 h-4 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] md:text-xs font-black text-gray-900 truncate leading-tight mb-0.5">{item.nombre}</h4>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-gray-400">{formatCurrency(item.precio)}</p>
                                            <span className="w-1 h-1 bg-gray-200 rounded-full md:block hidden"></span>
                                            <p className="text-[10px] font-black text-pirateRed md:text-gray-900">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                        <div className="flex items-center p-0.5 bg-gray-100 rounded-lg">
                                            <button
                                                onClick={() => updateCarritoQuantity(item.id, item.cantidad - 1)}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white hover:text-pirateRed rounded-md transition-all active:scale-90"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-[10px] font-black w-5 text-center text-gray-900">{item.cantidad}</span>
                                            <button
                                                onClick={() => updateCarritoQuantity(item.id, item.cantidad + 1)}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white hover:text-pirateRed rounded-md transition-all active:scale-90"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                            {item.salsas_seleccionadas && item.salsas_seleccionadas.length > 0 && (
                                                <button onClick={() => onEditItem(item)} className="p-1 te-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Personalizar">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button onClick={() => removeFromCarrito(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {carrito.length > 0 && (
                        <div className="p-2.5 border-t bg-gray-50">
                            <textarea
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                rows={1}
                                className="w-full p-2 border border-gray-200 rounded-lg text-[11px] focus:ring-1 focus:ring-pirateRed focus:border-pirateRed bg-white"
                                placeholder="Notas/Observaciones del pedido..."
                            />
                        </div>
                    )}
                </div>
            </div>

            {carrito.length > 0 && (
                <div className="flex-shrink-0 p-3 md:p-5 border-t bg-gray-50/80 backdrop-blur-sm space-y-2.5 md:space-y-4 rounded-b-2xl">
                    <div className="space-y-1.5 md:space-y-2.5">
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                            <span className="font-bold text-gray-400 uppercase tracking-widest">Subtotal</span>
                            <span className="font-black text-gray-900">{formatCurrency(getCarritoSubtotal())}</span>
                        </div>
                        {descuento > 0 && (
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                                <span className="font-bold text-green-500 uppercase tracking-widest">Descuento</span>
                                <span className="text-green-600 font-black">-{formatCurrency(descuentoTipo === 'porcentaje' ? getCarritoSubtotal() * descuento / 100 : descuento)}</span>
                            </div>
                        )}
                        {tipoEntregaId && tipoEntregaSeleccionado?.tiene_costo_asociado && (
                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                                <span className="font-bold text-gray-400 uppercase tracking-widest">Costo Envío</span>
                                {costoEnvio > 0 ? (
                                    <span className="font-black text-gray-900">{formatCurrency(costoEnvio)}</span>
                                ) : (
                                    <span className="font-black text-green-500 uppercase tracking-widest">Gratis</span>
                                )}
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-gray-200">
                            <span className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest">Total</span>
                            <span className="text-lg md:text-2xl font-black text-pirateRed">{formatCurrency(getCarritoTotalConEnvio())}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onOpenDiscountModal}
                            className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                        >
                            {descuento > 0 ? `-$${descuento.toFixed(0)}` : 'Descuento'}
                        </button>
                        {lastRemovedItem && (
                            <button
                                onClick={undoLastRemove}
                                className="flex-1 bg-white border border-gray-200 text-blue-600 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Deshacer
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onSaveOrder}
                            disabled={isSubmitting || !clienteSeleccionado || !tipoEntregaId || carrito.length === 0}
                            className="group relative bg-gray-800 text-white py-2.5 sm:py-3 rounded-2xl hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-black transition-all shadow-xl active:scale-95"
                        >
                            <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                            <span className="text-xs uppercase tracking-widest">{isSubmitting ? '...' : 'Guardar'}</span>
                        </button>
                        <button
                            onClick={onCharge}
                            disabled={isSubmitting || !clienteSeleccionado || !tipoEntregaId || carrito.length === 0}
                            className="group relative bg-pirateRed text-white py-2.5 sm:py-3 rounded-2xl hover:bg-pirateRedDark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-black transition-all shadow-xl shadow-pirateRed/20 active:scale-95"
                        >
                            <DollarSign className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                            <span className="text-xs uppercase tracking-widest">Cobrar</span>
                        </button>
                    </div>

                    <button
                        onClick={onClearCart}
                        className="w-full text-gray-400 hover:text-red-500 py-1 text-[9px] font-bold uppercase tracking-[0.3em] transition-colors"
                    >
                        Cancelar Pedido
                    </button>
                </div>
            )}
        </div>
    );
};
