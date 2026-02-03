import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useProductosStore } from '../lib/store/productosStore';
import { useCartStore } from '../lib/store/cartStore';
import { useClientesStore } from '../lib/store/clientesStore';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { useDebounce } from '../lib/hooks/useDebounce';
import { useKeyboardShortcuts } from '../lib/hooks/useKeyboardShortcuts';
import { supabase } from '../lib/supabase/client';

export const useVender = () => {
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
        resetCartFull,
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
    const [metricasVenta, setMetricasVenta] = useState({
        ofrecioAcompanamiento: false,
        aceptoAcompanamiento: false,
        ofrecioPostre: false,
        aceptoPostre: false,
    });

    // Bloquear scroll del body cuando el carrito móvil está abierto
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

    // Atajos de teclado
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

    // Inicialización de datos
    useEffect(() => {
        const loadData = async () => {
            try {
                await fetchProductos();
                fetchCategorias();
                fetchClientes();
                fetchTiposEntrega();
                fetchZonasEntrega();

                // Restaurar modo edición si existe en sessionStorage
                const editingOrderIdSession = sessionStorage.getItem('editing-order-id');
                if (editingOrderIdSession && carrito.length > 0 && !editingOrderId) {
                    useCartStore.setState({ editingOrderId: parseInt(editingOrderIdSession, 10) });
                }

                // Validar precios si no es edición
                if (carrito.length > 0 && !editingOrderId && !editingOrderIdSession) {
                    await useCartStore.getState().validateCartPrices(productos);
                }
            } catch (error) {
                console.error('Error durante inicialización:', error);
            }
        };
        loadData();
    }, []);

    // Guardar preferencia de vista
    useEffect(() => {
        localStorage.setItem('pos-view-preference', isSimplifiedView ? 'simplified' : 'grid');
    }, [isSimplifiedView]);

    const POS_CONFIG = {
        CATEGORIA_ACOMPANAMIENTO_ID: 39,
        CATEGORIA_POSTRE_ID: 53,
    };

    const verificarComplementos = () => {
        const categoriaIds = carrito.map(item => {
            const producto = productos.find(p => p.id === item.producto_id);
            return producto?.categoria_id;
        });

        return {
            faltaAcompanamiento: !categoriaIds.includes(POS_CONFIG.CATEGORIA_ACOMPANAMIENTO_ID),
            faltaPostre: !categoriaIds.includes(POS_CONFIG.CATEGORIA_POSTRE_ID)
        };
    };

    const validarCamposObligatorios = (): boolean => {
        const cartState = useCartStore.getState();

        if (!clienteSeleccionado) {
            toast.error('Debes seleccionar un cliente');
            return false;
        }

        if (!tipoEntregaId) {
            toast.error('Debes seleccionar un tipo de entrega');
            return false;
        }

        const tipoEntregaSeleccionado = tiposEntrega.find(t => t.id === tipoEntregaId);
        if (tipoEntregaSeleccionado?.requiere_direccion) {
            if (!cartState.direccionEnvio?.calle || cartState.direccionEnvio.calle.trim() === '') {
                toast.error('Debes ingresar la calle de entrega');
                return false;
            }
            if (!cartState.zonaEntregaId) {
                toast.error('Debes seleccionar una zona de entrega');
                return false;
            }
        }

        return true;
    };

    const handleSaveOrder = () => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }
        if (!validarCamposObligatorios()) return;

        const { faltaAcompanamiento, faltaPostre } = verificarComplementos();
        if (faltaAcompanamiento || faltaPostre) {
            setMetricasVenta({
                ofrecioAcompanamiento: faltaAcompanamiento,
                aceptoAcompanamiento: false,
                ofrecioPostre: faltaPostre,
                aceptoPostre: false,
            });
            setAccionPendiente('guardar');
            setIsSugerenciaComplementosOpen(true);
        } else {
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
        if (!validarCamposObligatorios()) return;

        const { faltaAcompanamiento, faltaPostre } = verificarComplementos();
        if (faltaAcompanamiento || faltaPostre) {
            setMetricasVenta({
                ofrecioAcompanamiento: faltaAcompanamiento,
                aceptoAcompanamiento: false,
                ofrecioPostre: faltaPostre,
                aceptoPostre: false,
            });
            setAccionPendiente('cobrar');
            setIsSugerenciaComplementosOpen(true);
        } else {
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
            setMetricasVenta(prev => ({
                ...prev,
                aceptoAcompanamiento: prev.ofrecioAcompanamiento,
                aceptoPostre: prev.ofrecioPostre,
            }));
            toast(
                'Agrega los complementos. Cuando termines, haz clic en el botón nuevamente',
                { icon: 'ℹ️' }
            );
        } else {
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
            await supabase.from('metricas_venta').insert([metrica]);
        } catch (error) {
            console.error('Error guardando métricas de venta:', error);
        }
    };

    const handleConfirmarTiempoEntrega = async (minutos: number) => {
        setIsTiempoEntregaModalOpen(false);
        setTiempoEntregaMinutos(minutos);

        try {
            const cartState = useCartStore.getState();
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

            const detalles = carrito.map(item => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio,
                subtotal: item.subtotal,
                salsas_seleccionadas: item.salsas_seleccionadas,
                nombre: item.producto_original || item.nombre,
            }));

            if (accionPendiente === 'guardar') {
                let pedidoResultado;
                if (editingOrderId) {
                    const resultado = await updatePedidoCompleto(editingOrderId, pedidoData as any, detalles);
                    pedidoResultado = resultado.pedido;
                    toast.success(`✏️ Pedido #${editingOrderId} actualizado`);
                } else {
                    const resultado = await createPedido({ ...pedidoData, estado: 'pendiente' } as any, detalles, 'pendiente');
                    pedidoResultado = resultado.pedido;
                    if (pedidoResultado.id) {
                        await guardarMetricasVenta(pedidoResultado.id, minutos);
                    }
                    toast.success('✨ Pedido creado');
                }

                resetCartFull();
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
                setPedidoParaCobro({
                    ...pedidoData,
                    id: editingOrderId || undefined,
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
            resetCartFull();
            toast.success('Pedido cancelado');
        }
    };

    const handleFinalizarVenta = async (pagos: any[], estadoFinal: 'completado' | 'pendiente', descuento: number = 0) => {
        try {
            if (!pedidoParaCobro) return;
            const { detalles, subtotal, total, ...pedidoData } = pedidoParaCobro;
            const resultado = await finalizarVentaCompleta(pedidoData, detalles, pagos, estadoFinal, descuento);

            if (tiempoEntregaMinutos && resultado.pedido.id) {
                await guardarMetricasVenta(resultado.pedido.id, tiempoEntregaMinutos);
            }

            resetCartFull();
            setIsCobroModalOpen(false);
            setMetricasVenta({
                ofrecioAcompanamiento: false,
                aceptoAcompanamiento: false,
                ofrecioPostre: false,
                aceptoPostre: false,
            });
            setTiempoEntregaMinutos(null);
            toast.success(`¡${pedidoParaCobro.id ? 'Venta Actualizada' : 'Venta Completada'}! #${resultado.pedido?.id}`);
        } catch (error: any) {
            toast.error(`Error: ${error.message || 'Desconocido'}`);
        }
    };

    const filteredProductos = useMemo(() => {
        return productos.filter(producto => {
            const matchesSearch = producto.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                producto.codigo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || producto.categoria_id?.toString() === selectedCategory;
            const isActive = producto.activo !== false;
            const isAvailable = producto.disponible_catalogo !== false;
            const isCategoryActive = (producto.categoria as any)?.active !== false;

            return matchesSearch && matchesCategory && isActive && isAvailable && isCategoryActive;
        });
    }, [productos, debouncedSearchTerm, selectedCategory]);

    const handleAddToCarrito = (producto: any) => {
        if (producto.requiere_salsas === true) {
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

    const handleEditCartItem = (cartItem: any) => {
        const productoOriginal = productos.find(p => p.id === cartItem.producto_id);
        if (productoOriginal) {
            setEditingCartItem(cartItem);
            setSelectedProductForSalsas(productoOriginal);
            setIsSalsaSelectorOpen(true);
        }
    };

    const handleCancelEdition = () => {
        if (window.confirm('¿Deseas cancelar la edición y limpiar el carrito?')) {
            resetCartFull();
            // No es necesario reload ya que resetCartFull limpia todo el estado de Zustand y sessionStorage
        }
    };

    const state = {
        productos: filteredProductos,
        categorias,
        productosLoading,
        searchTerm,
        selectedCategory,
        isSimplifiedView,
        isClienteSelectorOpen,
        isSalsaSelectorOpen,
        isCobroModalOpen,
        isTicketModalOpen,
        isCartModalOpen,
        isSugerenciaComplementosOpen,
        isTiempoEntregaModalOpen,
        isDiscountModalOpen,
        isOrderSummaryOpen,
        pedidoParaCobro,
        pedidoCreado,
        selectedProductForSalsas,
        editingCartItem,
        isSubmitting,
        clientes,
        clienteSeleccionado,
        tipoEntregaId,
        tiposEntrega,
        zonasEntrega,
        carrito,
        editingOrderId,
        descuento,
        descuentoTipo,
        costoEnvio,
        direccionEnvio,
        zonaEntregaId,
        notasEntrega,
        notas,
        metricasVenta
    };

    const actions = {
        setSearchTerm,
        setSelectedCategory,
        setIsSimplifiedView,
        setIsClienteSelectorOpen,
        setIsCartModalOpen,
        setIsDiscountModalOpen,
        setIsOrderSummaryOpen,
        setClienteSeleccionado,
        handleSaveOrder,
        handleCharge,
        handleConfirmarComplementos,
        handleConfirmarTiempoEntrega,
        handleClearCart,
        handleFinalizarVenta,
        handleAddToCarrito,
        handleConfirmSalsas,
        handleEditCartItem,
        handleCancelEdition,
        setIsSalsaSelectorOpen,
        setIsCobroModalOpen,
        setIsTicketModalOpen,
        setPedidoCreado,
        setIsSugerenciaComplementosOpen,
        setIsTiempoEntregaModalOpen,
        setTiempoEntregaMinutos,
        setAccionPendiente
    };

    return { ...state, ...actions };
};
