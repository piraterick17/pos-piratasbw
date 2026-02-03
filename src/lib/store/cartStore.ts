import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export interface CarritoItem {
  id: string; // Identificador único del ítem en el carrito
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  codigo?: string;
  imagen_url?: string;
  salsas_seleccionadas?: SalsaSeleccionada[];
  producto_original?: string; // Nombre original del producto sin salsas
}

export interface SalsaSeleccionada {
  id: number;
  nombre: string;
  precio?: number;
}

export interface ClienteSeleccionado {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  permite_credito?: boolean;
  saldo_actual?: number;
  direccion?: any;
}

export interface DireccionEnvio {
  calle: string;
  ciudad: string;
  referencias: string;
}

interface CartState {
  carrito: CarritoItem[];
  clienteSeleccionado: ClienteSeleccionado | null;
  notas: string;
  tipoEntregaId: number | null;
  editingOrderId: number | null; // <--- NUEVO: Para saber qué pedido estamos editando
  costoEnvio: number;
  direccionEnvio: DireccionEnvio | null;
  zonaEntregaId: number | null;
  notasEntrega: string;
  descuento: number;
  descuentoTipo: 'fijo' | 'porcentaje';
  lastRemovedItem: CarritoItem | null;
  ultimosItems: CarritoItem[];

  // Carrito actions
  addToCarrito: (producto: any, salsas?: any[]) => void;
  removeFromCarrito: (itemId: string) => void;
  updateCarritoQuantity: (itemId: string, cantidad: number) => void;
  clearCarrito: () => void;
  getCarritoTotal: () => number;
  getCarritoSubtotal: () => number;
  getCarritoTotalConDescuento: () => number;
  getCarritoTotalConEnvio: () => number;
  getCarritoItemCount: () => number;
  validateCartPrices: (productos: any[]) => Promise<void>;
  undoLastRemove: () => void;

  // Cliente selection
  setClienteSeleccionado: (cliente: ClienteSeleccionado | null) => void;
  clearClienteSeleccionado: () => void;

  // Notas actions
  setNotas: (notas: string) => void;

  // Entrega actions
  setTipoEntrega: (id: number | null) => void;
  setCostoEnvio: (costo: number) => void;
  setDireccionEnvio: (direccion: DireccionEnvio | null) => void;
  setZonaEntregaId: (id: number | null) => void;
  setNotasEntrega: (notas: string) => void;

  // Descuentos
  setDescuento: (monto: number, tipo: 'fijo' | 'porcentaje') => void;
  clearDescuento: () => void;

  // Cart item editing
  replaceCartItem: (oldItemId: string, newProduct: any, newSalsas: any[]) => void;
  cargarPedidoParaEditar: (pedido: any) => void;
  resetCartFull: () => void;
}

const getCartStorageKey = () => {
  try {
    // Get vendor ID from localStorage to isolate carts per vendor
    const vendorId = localStorage.getItem('vendor-id') || 'default';
    return `cart-storage-${vendorId}`;
  } catch {
    return 'cart-storage';
  }
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carrito: [],
      clienteSeleccionado: null,
      notas: '',
      tipoEntregaId: null,
      costoEnvio: 0,
      direccionEnvio: null,
      zonaEntregaId: null,
      notasEntrega: '',
      descuento: 0,
      descuentoTipo: 'fijo',
      lastRemovedItem: null,
      ultimosItems: [],
      editingOrderId: null, // <--- NUEVO: Inicializar en null

      validateCartPrices: async (productos: any[]) => {
        // Re-validate cart items against current product prices
        const state = get();
        let cartUpdated = false;

        const carritoActualizado = state.carrito.map(item => {
          const productoActual = productos.find(p => p.id === item.producto_id);
          if (!productoActual) {
            toast.error(`Producto ${item.nombre} ya no está disponible`);
            return null;
          }

          const precioBaseActual = productoActual.precio_descuento && productoActual.precio_descuento > 0
            ? productoActual.precio_descuento
            : productoActual.precio_regular || productoActual.precio || 0;

          const precioSalsas = item.salsas_seleccionadas?.reduce((sum: number, s: any) => sum + (s.precio || 0), 0) || 0;

          const precioTotalCorrecto = precioBaseActual + precioSalsas;

          if (precioTotalCorrecto !== item.precio) {
            toast(`Precio actualizado para ${item.nombre}: ${item.precio} → ${precioTotalCorrecto}`, { icon: '⚠️' });
            console.log(`[Cart] Ajustando precio de ${item.nombre}: ${item.precio} -> ${precioTotalCorrecto}`);
            cartUpdated = true;
            return {
              ...item,
              precio: precioTotalCorrecto,
              subtotal: precioTotalCorrecto * item.cantidad
            };
          }
          return item;
        }).filter(item => item !== null);

        if (cartUpdated) {
          set({ carrito: carritoActualizado });
          toast.success('Precios del carrito actualizados');
        }
      },

      addToCarrito: (producto, salsas = []) => {
        const carrito = get().carrito;

        // Generar un ID único basado en el producto y las salsas
        const itemId = `${producto.id}-${salsas.map(s => s.id).sort().join('-')}`;

        const existingItem = carrito.find(item => item.id === itemId);

        if (existingItem) {
          // Si ya existe, incrementar cantidad
          get().updateCarritoQuantity(itemId, existingItem.cantidad + 1);
        } else {
          // Si no existe, añadir nuevo item
          const precioProducto = producto.precio_descuento && producto.precio_descuento > 0
            ? producto.precio_descuento
            : producto.precio_regular || producto.precio || 0;

          // CORRECCIÓN: Calcular el costo total de las salsas
          const precioSalsas = salsas.reduce((total: number, s: any) => total + (s.precio || 0), 0);

          // El precio unitario final es: Producto + Salsas
          const precioFinal = precioProducto + precioSalsas;

          const nombreConSalsas = salsas.length > 0
            ? `${producto.nombre} (${salsas.map((s: any) => s.nombre).join(', ')})`
            : producto.nombre;

          const newItem: CarritoItem = {
            id: itemId,
            producto_id: producto.id,
            nombre: nombreConSalsas,
            precio: precioFinal,
            cantidad: 1,
            subtotal: precioFinal,
            codigo: producto.codigo,
            imagen_url: producto.imagenes_urls?.[0],
            salsas_seleccionadas: salsas,
            producto_original: producto.nombre,
          };

          set(state => ({
            carrito: [...state.carrito, newItem]
          }));

          toast.success(`${nombreConSalsas} añadido al carrito`);
        }
      },

      removeFromCarrito: (itemId) => {
        set(state => {
          const removedItem = state.carrito.find(item => item.id === itemId);
          return {
            carrito: state.carrito.filter(item => item.id !== itemId),
            lastRemovedItem: removedItem || null
          };
        });
      },

      undoLastRemove: () => {
        set(state => {
          if (state.lastRemovedItem) {
            return {
              carrito: [...state.carrito, state.lastRemovedItem],
              lastRemovedItem: null
            };
          }
          return state;
        });
      },

      updateCarritoQuantity: (itemId, cantidad) => {
        if (cantidad <= 0) {
          get().removeFromCarrito(itemId);
          return;
        }

        set(state => ({
          carrito: state.carrito.map(item =>
            item.id === itemId
              ? { ...item, cantidad, subtotal: item.precio * cantidad }
              : item
          )
        }));
      },

      clearCarrito: () => {
        set({
          carrito: [],
          clienteSeleccionado: null,
          notas: '',
          tipoEntregaId: null,
          costoEnvio: 0,
          direccionEnvio: null,
          zonaEntregaId: null,
          notasEntrega: '',
          descuento: 0,
          descuentoTipo: 'fijo'
        });
      },

      resetCartFull: () => {
        get().clearCarrito();
        set({ editingOrderId: null });
        try {
          sessionStorage.removeItem('editing-order-id');
        } catch (e) {
          console.warn('Error clearing sessionStorage:', e);
        }
      },

      getCarritoSubtotal: () => {
        const carrito = get().carrito;
        return carrito.reduce((total, item) => total + item.subtotal, 0);
      },

      getCarritoTotal: () => {
        return get().getCarritoSubtotal();
      },

      getCarritoTotalConDescuento: () => {
        const subtotal = get().getCarritoSubtotal();
        const { descuento, descuentoTipo } = get();

        if (descuentoTipo === 'porcentaje') {
          return subtotal - (subtotal * descuento / 100);
        }
        return Math.max(0, subtotal - descuento);
      },

      getCarritoTotalConEnvio: () => {
        return get().getCarritoTotalConDescuento() + get().costoEnvio;
      },

      getCarritoItemCount: () => {
        const carrito = get().carrito;
        return carrito.reduce((total, item) => total + item.cantidad, 0);
      },

      // Cliente selection
      setClienteSeleccionado: (cliente) => {
        set({ clienteSeleccionado: cliente });
      },

      clearClienteSeleccionado: () => {
        set({ clienteSeleccionado: null });
      },

      // Notas actions
      setNotas: (notas) => {
        set({ notas });
      },

      // Entrega actions
      setTipoEntrega: (id) => {
        set({ tipoEntregaId: id });
      },

      setCostoEnvio: (costo) => {
        set({ costoEnvio: costo });
      },

      setDireccionEnvio: (direccion) => {
        set({ direccionEnvio: direccion });
      },

      setZonaEntregaId: (id) => {
        set({ zonaEntregaId: id });
      },

      setNotasEntrega: (notas) => {
        set({ notasEntrega: notas });
      },

      replaceCartItem: (oldItemId, newProduct, newSalsas) => {
        set(state => {
          const newItemId = `${newProduct.id}-${newSalsas.map(s => s.id).sort().join('-')}`;
          const originalItem = state.carrito.find(item => item.id === oldItemId);
          const cantidad = originalItem?.cantidad || 1;

          const nombreConSalsas = newSalsas.length > 0
            ? `${newProduct.nombre} (${newSalsas.map(s => s.nombre).join(', ')})`
            : newProduct.nombre;

          const precioProducto = newProduct.precio_descuento && newProduct.precio_descuento > 0
            ? newProduct.precio_descuento
            : newProduct.precio_regular || newProduct.precio || 0;

          // CORRECCIÓN: Sumar costo de salsas al editar también
          const precioSalsas = newSalsas.reduce((total: number, s: any) => total + (s.precio || 0), 0);
          const precioFinal = precioProducto + precioSalsas;

          const updatedItem: CarritoItem = {
            id: newItemId,
            producto_id: newProduct.id,
            nombre: nombreConSalsas,
            precio: precioFinal,
            cantidad,
            subtotal: precioFinal * cantidad,
            codigo: newProduct.codigo,
            imagen_url: newProduct.imagenes_urls?.[0],
            salsas_seleccionadas: newSalsas,
            producto_original: newProduct.nombre,
          };

          const newCarrito = state.carrito.map(item =>
            item.id === oldItemId ? updatedItem : item
          );

          return { carrito: newCarrito };
        });
        toast.success('Producto actualizado en el carrito');
      },

      cargarPedidoParaEditar: (pedido: any) => {
        const logPrefix = `[CARGAR-PEDIDO-EDITAR-${pedido.id}]`;
        console.log(`\n${logPrefix} INICIANDO CARGA DE PEDIDO PARA EDICIÓN`);
        console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);

        try {
          // 1. Convertir los detalles del pedido al formato del carrito
          console.log(`${logPrefix} [A] Convertiendo detalles del pedido...`);
          console.log(`${logPrefix}    - Total de detalles a convertir: ${pedido.detalles?.length || 0}`);

          const itemsCarrito = pedido.detalles.map((d: any, idx: number) => {
            // --- CORRECCIÓN CRÍTICA (Paso 2): Obtener ID de forma segura (Raíz O Anidado) ---
            const realProductoId = d.producto_id || d.producto?.id;

            if (!realProductoId) {
              console.error(`${logPrefix} ❌ Error crítico: Detalle [${idx}] sin ID de producto`, d);
              return null; // Marcamos como null para filtrar después
            }

            const item = {
              // Usamos el ID real para generar el ID único del item en carrito
              id: `${realProductoId}-${Math.random().toString(36).substring(7)}`,
              producto_id: realProductoId, // Asignación segura
              nombre: d.producto?.nombre || d.nombre || 'Producto sin nombre',
              precio: d.precio_unitario,
              cantidad: d.cantidad,
              subtotal: d.cantidad * d.precio_unitario,
              imagen_url: d.producto?.imagenes_urls?.[0] || null,
              salsas_seleccionadas: d.salsas_seleccionadas || [],
              producto_original: d.producto?.nombre,
              codigo: d.producto?.codigo
            };

            console.log(`${logPrefix}    - Detalle [${idx}]:`, {
              producto_id: item.producto_id,
              nombre: item.nombre,
              cantidad: item.cantidad,
              precio: item.precio,
              subtotal: item.subtotal,
              salsasCount: item.salsas_seleccionadas.length
            });
            return item;
          }).filter((item: any) => item !== null); // <--- Filtramos los items corruptos

          // 2. Recuperación robusta del cliente
          let clienteRecuperado = null;

          // Intentamos reconstruir el cliente incluso si el objeto 'pedido.cliente' viene vacío
          if (pedido.cliente_id) {
            clienteRecuperado = {
              id: pedido.cliente_id,
              // Prioridad: 1. Objeto anidado, 2. Campos planos de la vista, 3. Valor por defecto
              nombre: pedido.cliente?.nombre || pedido.cliente_nombre || 'Cliente',
              telefono: pedido.cliente?.telefono || pedido.cliente_telefono || '',
              email: pedido.cliente?.email || '',
              permite_credito: pedido.cliente?.permite_credito || false,
              saldo_actual: pedido.cliente?.saldo_actual || 0,
              direccion: pedido.direccion_envio // Conservamos la dirección guardada en el pedido
            };
          }

          const stateData = {
            carrito: itemsCarrito,
            clienteSeleccionado: clienteRecuperado,
            tipoEntregaId: pedido.tipo_entrega_id,
            zonaEntregaId: pedido.zona_entrega_id,
            // Manejo seguro de dirección
            direccionEnvio: typeof pedido.direccion_envio === 'string'
              ? { calle: pedido.direccion_envio, ciudad: '', referencias: '' }
              : pedido.direccion_envio,
            notas: pedido.notas || '',
            notasEntrega: pedido.notas_entrega || '',
            costoEnvio: pedido.costo_envio || 0,
            descuento: pedido.descuentos || 0,
            descuentoTipo: 'fijo' as const,
            editingOrderId: pedido.id
          };

          console.log(`${logPrefix} [B] Llamando set() con nuevo estado...`);
          set(stateData);
          console.log(`${logPrefix} [B] ✓ Estado actualizado en Zustand`);

          // 3. Marcar en sessionStorage para indicar que estamos editando
          console.log(`${logPrefix} [C] Guardando en sessionStorage...`);
          try {
            sessionStorage.setItem('editing-order-id', pedido.id.toString());
            console.log(`${logPrefix} [C] ✓ sessionStorage['editing-order-id'] = '${pedido.id}'`);
          } catch (e) {
            console.error(`${logPrefix} [C] ❌ Error guardando sessionStorage:`, e);
          }

          console.log(`${logPrefix} [D] Mostrando toast...`);
          toast.success(`Editando pedido #${pedido.id}`);
          console.log(`${logPrefix} [D] ✓ Toast mostrado`);

          console.log(`${logPrefix} ✅ CARGA DE PEDIDO COMPLETADA\n`);
        } catch (error) {
          console.error(`${logPrefix} ❌ ERROR DURANTE CARGA:`, error);
          if (error instanceof Error) {
            console.error(`${logPrefix} Error message: ${error.message}`);
            console.error(`${logPrefix} Stack: ${error.stack}`);
          }
          throw error;
        }
      },

      setDescuento: (monto, tipo) => {
        set({ descuento: monto, descuentoTipo: tipo });
      },

      clearDescuento: () => {
        set({ descuento: 0, descuentoTipo: 'fijo' });
      },
    }),
    {
      name: getCartStorageKey(),
      partialize: (state) => ({
        carrito: state.carrito,
        clienteSeleccionado: state.clienteSeleccionado,
        notas: state.notas,
        tipoEntregaId: state.tipoEntregaId,
        costoEnvio: state.costoEnvio,
        direccionEnvio: state.direccionEnvio,
        zonaEntregaId: state.zonaEntregaId,
        notasEntrega: state.notasEntrega,
        descuento: state.descuento,
        descuentoTipo: state.descuentoTipo,
        editingOrderId: state.editingOrderId
      }),
    }
  )
);