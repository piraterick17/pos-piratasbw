import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';
import { queryCache } from '../utils/queryCache';

export interface TipoEntrega {
  id: number;
  nombre: string;
  descripcion?: string;
  requiere_direccion: boolean;
  tiene_costo_asociado: boolean;
  created_at?: string;
}

export interface ZonaEntrega {
  id: number;
  nombre: string;
  costo: number;
  monto_minimo_envio_gratis?: number;
  localidades_incluidas?: string[];
  activa?: boolean;
  created_at?: string;
}

export interface EstadoPedido {
  id: number;
  nombre: string;
  descripcion: string;
  color_hex: string;
}

export interface DetallePedido {
  id?: number;
  pedido_id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  precio_unitario_original?: number;
  descuento_aplicado?: number;
  subtotal: number;
  salsas_seleccionadas?: any[];
  deleted_at?: string;
  producto?: {
    nombre: string;
    codigo?: string;
    imagenes_urls?: string[];
    categoria_id?: number;
    categoria?: {
      id: number;
      nombre: string;
    };
  };
}

export interface Pago {
  id?: number;
  pedido_id: number;
  metodo_pago: string;
  monto: number;
  fecha_pago?: string;
  cobrado_por_usuario_id?: string;
  observaciones?: string;
}

export interface Ticket {
  id?: number;
  pedido_id: number;
  numero_ticket: string;
  datos_pedido_snapshot?: any;
  created_at?: string;
}

export interface Pedido {
  id?: number;
  cliente_id?: string;
  estado: string; // Mantenemos como string para compatibilidad
  estado_id?: number;
  metodo_pago?: string;
  subtotal?: number;
  descuentos?: number;
  impuestos?: number;
  total?: number;
  notas?: string;
  deleted_at?: string;
  insert_date?: string;
  updated_at?: string;
  fecha_finalizacion?: string;
  cobrado_por_usuario_id?: string;
  // Nuevos campos de entrega
  tipo_entrega_id?: number;
  zona_entrega_id?: number;
  costo_envio?: number;
  direccion_envio?: any;
  notas_entrega?: string;
  fecha_listo_para_entrega?: string;
  fecha_en_ruta?: string;
  fecha_entregado?: string;
  // Campos de vista
  estado_nombre?: string;
  estado_descripcion?: string;
  estado_color?: string;
  cliente?: {
    nombre: string;
    telefono?: string;
  };
  cliente_nombre?: string;
  cliente_telefono?: string;
  tipo_entrega_nombre?: string;
  detalles?: DetallePedido[];
  pagos?: Pago[];
  ticket?: Ticket;
}

interface PedidosState {
  pedidos: Pedido[];
  pedidoActual: Pedido | null;
  estadosPedido: EstadoPedido[];
  tiposEntrega: TipoEntrega[];
  zonasEntrega: ZonaEntrega[];
  pedidosParaEntrega: Pedido[];
  showDeleted: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Pedido actions
  fetchPedidos: (includeDeleted?: boolean) => Promise<void>;
  fetchPedidosActivos: () => Promise<void>;
  fetchPedidosFinalizados: () => Promise<void>;
  fetchPedidosConDetalles: () => Promise<void>;
  fetchPedidoById: (id: number) => Promise<void>;
  fetchPedidoDetalles: (id: number) => Promise<void>;
  fetchEstadosPedido: () => Promise<void>;
  fetchTiposEntrega: () => Promise<void>;
  fetchZonasEntrega: (includeInactive?: boolean) => Promise<void>;
  fetchPedidosParaEntrega: () => Promise<void>;
  getValidTransitions: (currentEstadoId: number) => Promise<EstadoPedido[]>;
  createPedido: (pedido: Omit<Pedido, 'id'>, detalles: any[], estado: 'pendiente' | 'completado') => Promise<{ pedido: Pedido; ticket: Ticket }>;
  updatePedidoCompleto: (pedidoId: number, datosPedido: Partial<Pedido>, nuevosDetalles: DetallePedido[]) => Promise<{ pedido: Pedido; ticket: Ticket }>;
  updatePedidoStatus: (pedidoId: number, nuevoEstadoId: number, justificacion?: string) => Promise<void>;
  updatePedidoTimestamp: (pedidoId: number, campo: 'fecha_listo_para_entrega' | 'fecha_en_ruta' | 'fecha_entregado') => Promise<void>;
  registrarPago: (pagoData: Omit<Pago, 'id'>) => Promise<void>;
  finalizarPedido: (pedidoId: number) => Promise<void>;
  finalizarVentaCompleta: (pedido: Omit<Pedido, 'id'>, detalles: any[], pagos: any[], estado: 'pendiente' | 'completado', descuento?: number) => Promise<{ pedido: Pedido; ticket: Ticket }>;
  generarTicket: (pedidoId: number) => Promise<Ticket>;
  softDeletePedido: (id: number) => Promise<void>;
  restorePedido: (id: number) => Promise<void>;
  deletePedido: (id: number) => Promise<void>;
  
  // Zonas de entrega actions
  createZona: (zonaData: Omit<ZonaEntrega, 'id'>) => Promise<ZonaEntrega>;
  updateZona: (id: number, zonaData: Partial<ZonaEntrega>) => Promise<ZonaEntrega>;
  
  // Utility actions
  clearPedidoActual: () => void;
  setShowDeleted: (show: boolean) => void;
  
  // Realtime subscription
  subscribeToPedidosChanges: () => any;
}

/**
 * ============================================================================
 * FUNCIÓN AUXILIAR: PROCESAMIENTO CENTRALIZADO CON AUTO-SANACIÓN DE PRECIOS
 * ============================================================================
 *
 * Esta función es la ÚNICA FUENTE DE VERDAD para calcular precios en pedidos.
 * Se usa tanto en creación como en edición para garantizar consistencia total.
 *
 * ARQUITECTURA DE PRECIOS:
 * - precio_unitario = Precio FINAL (Base del producto + Extras/Salsas)
 * - precio_unitario_original = Precio BASE del producto (sin extras)
 * - subtotal = precio_unitario * cantidad
 * - granTotal = Suma de todos los subtotales
 *
 * SISTEMA DE AUTO-SANACIÓN:
 * - PRIORIDAD 1: Usa precios frescos del catálogo (BD) pasados en preciosReales
 * - PRIORIDAD 2: Fallback a precio_unitario del item (carrito nuevo)
 * - EVITA usar precio_unitario_original (puede estar corrupto en BD)
 *
 * @param items - Array de items del carrito/pedido con estructura:
 *   - producto_id: ID del producto
 *   - cantidad: Cantidad del producto
 *   - precio_unitario: Precio que viene del carrito (fallback)
 *   - salsas_seleccionadas: Array de salsas con {id, nombre, precio}
 *
 * @param preciosReales - Mapa de precios frescos de BD: { producto_id: precio }
 *   Este mapa es obtenido por createPedido/updatePedidoCompleto directamente
 *   desde la tabla productos antes de llamar esta función
 *
 * @returns {Object} Objeto con:
 *   - detallesProcesados: Array de detalles con precios correctos
 *   - granTotal: Total general del pedido
 */
function procesarCalculosFinancieros(items: any[], preciosReales: Record<number, number> = {}): { detallesProcesados: any[]; granTotal: number; } {
  console.log('[CALC] 🧮 Iniciando procesamiento con Precios Frescos...');
  let granTotal = 0;

  const detallesProcesados = items.map((item) => {
    // 1. SANACIÓN BLINDADA: Usar Precio Fresco de BD si existe
    // Si no existe (ej: producto borrado), usar fallback del item
    const precioBaseReal = preciosReales[item.producto_id] !== undefined 
      ? Number(preciosReales[item.producto_id]) 
      : Number(item.precio_unitario);

    // 2. EXTRAS
    let salsas = item.salsas_seleccionadas;
    if (typeof salsas === 'string') { try { salsas = JSON.parse(salsas); } catch (e) { salsas = []; } }
    
    const costoExtras = Array.isArray(salsas)
      ? salsas.reduce((sum: number, s: any) => sum + (Number(s.precio) || 0), 0)
      : 0;

    // 3. CÁLCULO FINAL (79 + 10 = 89)
    const precioFinal = precioBaseReal + costoExtras;
    const subtotal = precioFinal * Number(item.cantidad);
    granTotal += subtotal;

    // 4. RETORNO LIMPIO (Sin ...item para evitar error 400)
    return {
      producto_id: item.producto_id,
      cantidad: Number(item.cantidad),
      precio_unitario: precioFinal,             // 89
      precio_unitario_original: precioBaseReal, // 79
      subtotal: subtotal,
      salsas_seleccionadas: Array.isArray(salsas) ? salsas : []
    };
  });

  return { detallesProcesados, granTotal };
}

export const usePedidosStore = create<PedidosState>((set, get) => ({
  pedidos: [],
  pedidoActual: null,
  estadosPedido: [],
  tiposEntrega: [],
  zonasEntrega: [],
  pedidosParaEntrega: [],
  showDeleted: false,
  isLoading: false,
  isSubmitting: false,

  fetchPedidos: async (includeDeleted = false) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('pedidos_vista')
        .select('*')
        .order('insert_date', { ascending: false });

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ pedidos: data || [] });
    } catch (error: any) {
      console.error('Error fetching pedidos:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPedidosActivos: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('pedidos_vista')
        .select('*, detalles:detalles_pedido(*, producto:productos(nombre, codigo, categoria_id, categoria:categorias(id, nombre)))')
        .is('deleted_at', null)
        .in('estado_nombre', ['Pendiente', 'En Preparación', 'Listo para Entrega', 'En Reparto'])
        .order('insert_date', { ascending: false });

      if (error) throw error;
      set({ pedidos: data || [] });
    } catch (error: any) {
      console.error('Error fetching active pedidos:', error);
      toast.error('Error al cargar los pedidos activos');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPedidosFinalizados: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('pedidos_vista')
        .select('*')
        .is('deleted_at', null)
        .in('estado_nombre', ['Completado', 'Cancelado', 'En Reparto'])
        .order('insert_date', { ascending: false });

      if (error) throw error;
      set({ pedidos: data || [] });
    } catch (error: any) {
      console.error('Error fetching finalized pedidos:', error);
      toast.error('Error al cargar las transacciones');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPedidosConDetalles: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('pedidos_vista')
        .select(`
          *,
          detalles:detalles_pedido(
            *,
            producto:productos(
              nombre,
              categoria_id,
              categoria:categorias(nombre)
            )
          ),
          pagos:pagos(*)
        `)
        .is('deleted_at', null)
        .order('insert_date', { ascending: false });

      if (error) throw error;
      set({ pedidos: data || [] });
    } catch (error: any) {
      console.error('Error fetching pedidos con detalles:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPedidoById: async (id: number) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('pedidos_vista')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ pedidoActual: data });
    } catch (error: any) {
      console.error('Error fetching pedido:', error);
      toast.error('Error al cargar pedido');
      set({ pedidoActual: null });
    } finally {
      set({ isLoading: false });
    }
  },

fetchPedidoDetalles: async (id: number) => {
    if (!id) return null;
    set({ isLoading: true });
    try {
      console.log(`[Store] Fetching detalles para pedido #${id}...`);

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email, direccion, saldo_actual, permite_credito),
          pagos(*)
        `)
        .eq('id', id)
        .single();

      if (pedidoError) throw pedidoError;

      const { data: detalles, error: detallesError } = await supabase
        .from('detalles_pedido')
        .select(`
          id, cantidad, precio_unitario, subtotal, salsas_seleccionadas,
          producto:productos(
            id, nombre, codigo, precio, precio_regular, precio_descuento, imagenes_urls,
            categoria:categorias(id, nombre)
          )
        `)
        .eq('pedido_id', id)
        .is('deleted_at', null)
        .order('id', { ascending: true });

      if (detallesError) throw detallesError;

      const pedidoCompleto = {
        ...pedido,
        detalles: detalles || []
      };

      console.log(`[Store] Pedido #${id} cargado con ${detalles?.length || 0} detalles`);
      set({ pedidoActual: pedidoCompleto });
      return pedidoCompleto;
    } catch (error) {
      console.error('Error fetching pedido detalles:', error);
      toast.error('Error al cargar detalles');
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchEstadosPedido: async () => {
    try {
      const cacheKey = 'pedido_estados';
      const cached = queryCache.get<EstadoPedido[]>(cacheKey);

      if (cached) {
        set({ estadosPedido: cached });
        return;
      }

      const { data, error } = await supabase
        .from('pedido_estados')
        .select('*')
        .order('id');

      if (error) throw error;

      queryCache.set(cacheKey, data || [], 10 * 60 * 1000);
      set({ estadosPedido: data || [] });
    } catch (error: any) {
      toast.error('Error al cargar estados de pedido');
    }
  },

  fetchTiposEntrega: async () => {
    try {
      const cacheKey = 'tipos_entrega';
      const cached = queryCache.get<TipoEntrega[]>(cacheKey);

      if (cached) {
        set({ tiposEntrega: cached });
        return;
      }

      const { data, error } = await supabase
        .from('tipos_entrega')
        .select('*')
        .order('id');

      if (error) throw error;

      queryCache.set(cacheKey, data || [], 10 * 60 * 1000);
      set({ tiposEntrega: data || [] });
    } catch (error: any) {
      toast.error('Error al cargar tipos de entrega');
    }
  },

  fetchZonasEntrega: async (includeInactive = false) => {
    try {
      let query = supabase.from('zonas_entrega').select('*');
      if (!includeInactive) {
        query = query.eq('activa', true);
      }
      const { data, error } = await query.order('nombre');

      if (error) throw error;
      set({ zonasEntrega: data || [] });
    } catch (error: any) {
      console.error('Error fetching zonas entrega:', error);
      toast.error('Error al cargar zonas de entrega');
    }
  },

  fetchPedidosParaEntrega: async () => {
    set({ isLoading: true });
    try {
      const { data: tipoEntrega, error: tipoError } = await supabase
        .from('tipos_entrega')
        .select('id')
        .eq('nombre', 'A domicilio')
        .single();

      if (tipoError) {
        toast.error("Error al buscar tipo de entrega 'A domicilio'");
        return;
      }

      const { data, error } = await supabase
        .from('pedidos_vista')
        .select('*')
        .eq('tipo_entrega_id', tipoEntrega.id)
        .is('fecha_entregado', null)
        .is('deleted_at', null)
        .order('insert_date', { ascending: true });
      
      if (error) throw error;
      set({ pedidosParaEntrega: data || [] });
    } catch (error: any) {
      console.error('Error fetching pedidos para entrega:', error);
      toast.error('Error al cargar entregas pendientes');
    } finally {
      set({ isLoading: false });
    }
  },


fetchPedidosByDateRange: async (fechaInicio: string, fechaFin: string) => {
     set({ isLoading: true });
     try {
       // NOTA: fechaInicio y fechaFin ya deben venir con la hora exacta (ISO string)
       // desde el componente para manejar la zona horaria correctamente.
       
       const { data, error } = await supabase
         .from('pedidos_vista')
         .select(`
           *,
           detalles:detalles_pedido(
             *,
             producto:productos(nombre, categoria_id, categoria:categorias(id, nombre))
           ),
           pagos:pagos(*)
         `)
         .gte('insert_date', fechaInicio)
         .lte('insert_date', fechaFin)
         .is('deleted_at', null)
         .order('insert_date', { ascending: false });
 
       if (error) throw error;
       
       set({ pedidos: data || [] });
       return data || [];
     } catch (error: any) {
       console.error('Error fetching pedidos by date range:', error);
       toast.error('Error al cargar transacciones');
       return [];
     } finally {
       set({ isLoading: false });
     }
   },

  updatePedidoTimestamp: async (pedidoId, campo) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ [campo]: new Date().toISOString() })
        .eq('id', pedidoId);

      if (error) throw error;
      
      toast.success('Estado de entrega actualizado');
      get().fetchPedidosParaEntrega();
    } catch (error: any) {
      console.error('Error updating pedido timestamp:', error);
      toast.error(`Error al actualizar estado: ${error.message}`);
    }
  },

  getValidTransitions: async (currentEstadoId: number) => {
    try {
      const { data, error } = await supabase
        .from('estado_transiciones')
        .select(`
          estado_destino:estado_destino_id(
            id,
            nombre,
            descripcion,
            color_hex
          )
        `)
        .eq('estado_origen_id', currentEstadoId);

      if (error) throw error;
      
      const validStates = data
        ?.map(item => item.estado_destino)
        .filter(Boolean) as EstadoPedido[];

      return validStates;
    } catch (error: any) {
      console.error('Error getting valid transitions:', error);
      return []; // Devuelve un array vacío en caso de error
    }
  },

  generarTicket: async (pedidoId: number) => {
    try {
      // Obtener datos completos del pedido
      const { data: pedidoCompleto, error: pedidoError } = await supabase
        .from('pedidos_vista')
        .select('*')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) throw pedidoError;

      // Obtener detalles del pedido
      const { data: detalles, error: detallesError } = await supabase
        .from('detalles_pedido')
        .select(`
          *,
          producto:productos(nombre, codigo, imagenes_urls)
        `)
        .eq('pedido_id', pedidoId)
        .is('deleted_at', null);

      if (detallesError) throw detallesError;

      // Crear snapshot de datos
      const snapshot = {
        pedido: pedidoCompleto,
        detalles: detalles || [],
        fecha_generacion: new Date().toISOString()
      };

      // Generar número de ticket único
      const numeroTicket = `TKT-${pedidoId}-${Date.now()}`;

      // Verificar si ya existe un ticket para este pedido
      const { data: ticketExistente } = await supabase
        .from('tickets')
        .select('id')
        .eq('pedido_id', pedidoId)
        .maybeSingle();

      let ticket;
      if (ticketExistente) {
        // Actualizar ticket existente
        const { data, error } = await supabase
          .from('tickets')
          .update({
            datos_pedido_snapshot: snapshot,
            created_at: new Date().toISOString()
          })
          .eq('pedido_id', pedidoId)
          .select()
          .single();

        if (error) throw error;
        ticket = data;
      } else {
        // Crear nuevo ticket
        const { data, error } = await supabase
          .from('tickets')
          .insert({
            pedido_id: pedidoId,
            numero_ticket: numeroTicket,
            datos_pedido_snapshot: snapshot
          })
          .select()
          .single();

        if (error) throw error;
        ticket = data;
      }

      return ticket;
    } catch (error: any) {
      console.error('Error generando ticket:', error);
      toast.error('Error al generar ticket');
      throw error;
    }
  },

createPedido: async (pedido, detalles, estado) => {
  set({ isSubmitting: true });
  try {
    console.log('[Pedido] Iniciando creación de pedido:', {
      cliente_id: pedido.cliente_id,
      tipo_entrega_id: pedido.tipo_entrega_id,
      total_items: detalles.length,
      estado_destino: estado
    });

    // Validate that customer exists
    if (pedido.cliente_id) {
      const { data: clienteExiste, error: clienteError } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', pedido.cliente_id)
        .maybeSingle();

      if (clienteError || !clienteExiste) {
        console.error('[Pedido] Error: Cliente no existe', pedido.cliente_id);
        throw new Error('El cliente seleccionado ya no existe. Por favor, selecciona otro cliente.');
      }
      console.log('[Pedido] ✓ Cliente validado');
    }

    const { data: estadoData, error: estadoError } = await supabase
      .from('pedido_estados')
      .select('id')
      .eq('nombre', estado === 'completado' ? 'Completado' : 'Pendiente')
      .single();

    if (estadoError) {
      console.error('[Pedido] Error al obtener estado:', estadoError);
      throw estadoError;
    }
    console.log('[Pedido] ✓ Estado obtenido:', estadoData.id);

// === PASO 1: LIMPIEZA DEL OBJETO ===
// Quitamos detalles, nombres extra y el objeto cliente completo (si viene)
const {
  detalles: _,
  tipo_entrega_nombre: __,
  cliente: ___,
  ...pedidoSinDetalles
} = pedido;

// === PASO 2: OBTENER PRECIOS REALES (FRESCOS) DE BD ===
const idsProductos = detalles.map(d => d.producto_id);
console.log('[Pedido] Obteniendo precios frescos para productos:', idsProductos);

const { data: productosData, error: preciosError } = await supabase
  .from('productos')
  .select('id, precio, precio_regular, precio_descuento')
  .in('id', idsProductos);

if (preciosError) {
  console.error('[Pedido] Error al obtener precios:', preciosError);
  throw preciosError;
}

// Crear mapa de acceso rápido con precio efectivo: { 568: 79, ... }
// Prioridad: precio_descuento > precio_regular > precio
const mapaPrecios: Record<number, number> = {};
productosData?.forEach(p => {
  const precioEfectivo = (p.precio_descuento && Number(p.precio_descuento) > 0)
    ? Number(p.precio_descuento)
    : (p.precio_regular && Number(p.precio_regular) > 0)
      ? Number(p.precio_regular)
      : Number(p.precio || 0);

  mapaPrecios[p.id] = precioEfectivo;
  console.log(`[Pedido] Producto ${p.id}: precio=${p.precio}, regular=${p.precio_regular}, descuento=${p.precio_descuento} => efectivo=${precioEfectivo}`);
});
console.log('[Pedido] Mapa de precios frescos:', mapaPrecios);

// === PASO 3: PROCESAMIENTO FINANCIERO CENTRALIZADO ===
// Usamos la función auxiliar que garantiza cálculos correctos con precios frescos
const { detallesProcesados, granTotal } = procesarCalculosFinancieros(detalles, mapaPrecios);

// Calcular el total final con descuentos, impuestos y envío
const descuentos = pedido.descuentos || 0;
const impuestos = pedido.impuestos || 0;
const costoEnvio = pedido.costo_envio || 0;
const totalFinal = granTotal - descuentos + impuestos + costoEnvio;

console.log(`[Pedido] 💰 Totales: Subtotal=${granTotal} - Desc=${descuentos} + Imp=${impuestos} + Envío=${costoEnvio} = Total=${totalFinal}`);

// === PASO 3: CONSTRUIR PAYLOAD PARA BD ===
const pedidoData = {
  ...pedidoSinDetalles,
  subtotal: granTotal,
  descuentos: descuentos,
  impuestos: impuestos,
  costo_envio: costoEnvio,
  total: totalFinal,
  estado,
  estado_id: estadoData.id
};

    console.log('[Pedido] Datos a insertar:', {
      ...pedidoData,
      detalles_count: detalles.length
    });

    const { data: nuevoPedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([pedidoData])
      .select()
      .single();

    if (pedidoError) {
      console.error('[Pedido] Error al insertar pedido:', pedidoError);
      throw pedidoError;
    }
    console.log('[Pedido] ✓ Pedido creado exitosamente:', nuevoPedido.id);

  // === PASO 4: INSERTAR DETALLES PROCESADOS ===
    if (detallesProcesados.length > 0) {
      console.log(`[Pedido] Insertando ${detallesProcesados.length} detalles procesados...`);

      // Agregar el pedido_id a cada detalle procesado
      const detallesConPedidoId = detallesProcesados.map(detalle => ({
        pedido_id: nuevoPedido.id,
        ...detalle
      }));

      console.log('[Pedido] IDs de productos a insertar:', detallesConPedidoId.map(d => d.producto_id));

      const { error: detallesError } = await supabase
        .from('detalles_pedido')
        .insert(detallesConPedidoId);

      if (detallesError) {
        console.error('[Pedido] Error al insertar detalles:', detallesError);
        throw detallesError;
      }
      console.log('[Pedido] ✓ Detalles insertados correctamente');
    }

    
    if (estado === 'completado') {
      console.log('[Pedido] Finalizando pedido...');
      await get().finalizarPedido(nuevoPedido.id);
      console.log('[Pedido] ✓ Pedido finalizado');
    }

    console.log('[Pedido] Generando ticket...');
    const ticket = await get().generarTicket(nuevoPedido.id);
    console.log('[Pedido] ✓ Ticket generado');

    // Recargar el pedido completo desde la base de datos con todos los detalles
    console.log('[Pedido] Recargando pedido completo...');
    const { data: pedidoCompleto, error: fetchError } = await supabase
      .from('pedidos_vista')
      .select('*')
      .eq('id', nuevoPedido.id)
      .single();

    if (fetchError) {
      console.error('[Pedido] Error al recargar pedido:', fetchError);
      throw fetchError;
    }

    // Obtener los detalles con los productos completos
    const { data: detallesCompletos, error: detallesError } = await supabase
      .from('detalles_pedido')
      .select(`
        *,
        producto:productos(nombre, codigo, imagenes_urls)
      `)
      .eq('pedido_id', nuevoPedido.id)
      .is('deleted_at', null);

    if (detallesError) {
      console.error('[Pedido] Error al obtener detalles completos:', detallesError);
      throw detallesError;
    }

    const pedidoConDetalles = {
      ...pedidoCompleto,
      detalles: detallesCompletos || [],
      ticket
    };

    console.log('[Pedido] ✓ Pedido completo recargado:', {
      id: pedidoConDetalles.id,
      total: pedidoConDetalles.total,
      items: detallesCompletos?.length
    });

    console.log('[Pedido] Actualizando lista de pedidos activos...');
    await get().fetchPedidosActivos();
    console.log('[Pedido] ✓ Lista actualizada');

    const mensaje = estado === 'completado'
      ? 'Venta finalizada exitosamente'
      : 'Pedido guardado exitosamente';

    console.log('[Pedido] ✓✓✓ PROCESO COMPLETADO EXITOSAMENTE ✓✓✓');
    toast.success(mensaje);

    return { pedido: pedidoConDetalles, ticket };
  } catch (error: any) {
    console.error('[Pedido] ❌ ERROR EN CREACIÓN DE PEDIDO:', {
      error: error,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    });

    // Mensaje de error más específico según el tipo
    if (error?.code === '23502') {
      toast.error('Error de base de datos: campo obligatorio faltante');
    } else if (error?.code === '23503') {
      toast.error('Error de referencia: registro relacionado no existe');
    } else if (error?.message?.includes('Cliente')) {
      toast.error(error.message);
    } else {
      toast.error('Error al crear pedido. Ver consola para detalles.');
    }

    throw error;
  } finally {
    set({ isSubmitting: false });
  }
},

  updatePedidoCompleto: async (pedidoId, datosPedido, nuevosDetalles) => {
    const logPrefix = `[UPDATE-PEDIDO-${pedidoId}]`;
    const updateStart = performance.now();
    set({ isSubmitting: true });

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${logPrefix} INICIANDO ACTUALIZACIÓN DE PEDIDO`);
    console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
    console.log(`${logPrefix} Detalles a procesar: ${nuevosDetalles.length}`);
    console.log(`${logPrefix} Datos del pedido:`, datosPedido);
    console.log(`${'='.repeat(70)}`);

try {
      // 1. LIMPIEZA PROFUNDA (Deep Clean)
      // Borramos todo rastro anterior para evitar conflictos de duplicados y fantasmas.
      console.log(`${logPrefix} [1] Iniciando limpieza profunda del pedido...`);

      // A. Primero: Limpiar items de cocina (para evitar error de FK)
      // Usamos try/catch silencioso por si la tabla no tiene datos o triggers complejos
      try {
        await supabase.from('cocina_items').delete().eq('pedido_id', pedidoId);
      } catch (e) {
        console.warn(`${logPrefix} [1.A] Aviso al limpiar cocina (no crítico):`, e);
      }

      // B. Segundo: BORRADO TOTAL de detalles (Hard Delete)
      // IMPORTANTE: .eq('pedido_id', pedidoId) borra TODO, sin importar si estaba soft-deleted o no.
      const { error: deleteError } = await supabase
        .from('detalles_pedido')
        .delete()
        .eq('pedido_id', pedidoId);

      if (deleteError) {
        console.error(`${logPrefix} [1.B] ❌ Error crítico limpiando detalles:`, deleteError);
        throw deleteError;
      }
      console.log(`${logPrefix} [1] ✓ Limpieza completada: Detalles antiguos eliminados.`);

      // 2. OBTENER PRECIOS REALES (FRESCOS) DE BD
      console.log(`${logPrefix} [2] Obteniendo precios frescos de BD...`);

      // ===== DEBUG: LOGS DETALLADOS DE LOS DETALLES RECIBIDOS =====
      console.log(`${logPrefix} [2] 🔍 Total detalles recibidos:`, nuevosDetalles.length);
      console.log(`${logPrefix} [2] 🔍 Detalles completos:`, JSON.stringify(nuevosDetalles, null, 2));

      nuevosDetalles.forEach((d: any, idx: number) => {
        console.log(`${logPrefix} [2] 🔍 Detalle[${idx}]:`, {
          producto_id: d.producto_id,
          producto_id_type: typeof d.producto_id,
          producto_id_is_number: typeof d.producto_id === 'number',
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          nombre: d.nombre,
          full_object: d
        });
      });

      // CRÍTICO: Filtrar detalles sin producto_id válido
      const detallesValidos = nuevosDetalles.filter((d: any, idx: number) => {
        const isValid = d.producto_id && typeof d.producto_id === 'number';
        if (!isValid) {
          console.error(`${logPrefix} [2] ❌ Detalle[${idx}] INVÁLIDO:`, {
            producto_id: d.producto_id,
            type: typeof d.producto_id,
            full_object: d
          });
          return false;
        }
        console.log(`${logPrefix} [2] ✅ Detalle[${idx}] válido (producto_id: ${d.producto_id})`);
        return true;
      });

      console.log(`${logPrefix} [2] 📊 Detalles válidos: ${detallesValidos.length} de ${nuevosDetalles.length}`);

      if (detallesValidos.length === 0) {
        console.error(`${logPrefix} [2] 💥 NO HAY DETALLES VÁLIDOS`);
        throw new Error('No hay detalles válidos con producto_id para actualizar');
      }

      if (detallesValidos.length < nuevosDetalles.length) {
        console.warn(`${logPrefix} [2] ⚠️ Se filtraron ${nuevosDetalles.length - detallesValidos.length} detalles inválidos`);
      }

      const idsProductos = detallesValidos.map(d => d.producto_id);
      console.log(`${logPrefix} [2] 🎯 IDs de productos válidos que se usarán en la query:`, idsProductos);
      console.log(`${logPrefix} [2] 🎯 IDs tipos:`, idsProductos.map(id => typeof id));

      const { data: productosData, error: preciosError} = await supabase
        .from('productos')
        .select('id, precio, precio_regular, precio_descuento')
        .in('id', idsProductos);

      if (preciosError) {
        console.error(`${logPrefix} [2] ❌ Error al obtener precios:`, preciosError);
        throw preciosError;
      }

      // Crear mapa de acceso rápido con precio efectivo: { 568: 79, ... }
      // Prioridad: precio_descuento > precio_regular > precio
      const mapaPrecios: Record<number, number> = {};
      productosData?.forEach(p => {
        const precioEfectivo = (p.precio_descuento && Number(p.precio_descuento) > 0)
          ? Number(p.precio_descuento)
          : (p.precio_regular && Number(p.precio_regular) > 0)
            ? Number(p.precio_regular)
            : Number(p.precio || 0);

        mapaPrecios[p.id] = precioEfectivo;
        console.log(`${logPrefix} [2] Producto ${p.id}: precio=${p.precio}, regular=${p.precio_regular}, descuento=${p.precio_descuento} => efectivo=${precioEfectivo}`);
      });
      console.log(`${logPrefix} [2] ✓ Mapa de precios frescos:`, mapaPrecios);

      // 3. PROCESAMIENTO FINANCIERO CENTRALIZADO (igual que en createPedido)
      console.log(`${logPrefix} [3] Usando procesamiento financiero centralizado...`);
      console.log(`${logPrefix} [3] 🎯 Procesando ${detallesValidos.length} detalles válidos`);
      const { detallesProcesados, granTotal } = procesarCalculosFinancieros(detallesValidos, mapaPrecios);

      if (detallesProcesados.length > 0) {
        console.log(`${logPrefix} [3] Preparando ${detallesProcesados.length} detalles procesados para insertar...`);

        // Agregar el pedido_id a cada detalle procesado
        const detallesParaInsertar = detallesProcesados.map(detalle => ({
          pedido_id: pedidoId,
          ...detalle
        }));

        console.log(`${logPrefix} [3] Ejecutando insert de ${detallesParaInsertar.length} detalles...`);
        const insertStart = performance.now();

        const { error: insertError } = await supabase
          .from('detalles_pedido')
          .insert(detallesParaInsertar);

        const insertDuration = performance.now() - insertStart;
        if (insertError) {
          console.error(`${logPrefix} [3] ❌ Error en insert:`, insertError);
          throw insertError;
        }
        console.log(`${logPrefix} [3] ✓ Insert completado en ${insertDuration.toFixed(2)}ms`);
      } else {
        console.log(`${logPrefix} [3] ℹ️ No hay detalles nuevos para insertar`);
      }

      // 4. Calcular totales finales usando el granTotal de la función centralizada
      console.log(`${logPrefix} [4] Calculando totales finales...`);
      const descuentos = datosPedido.descuentos || 0;
      const impuestos = datosPedido.impuestos || 0;
      const costoEnvio = datosPedido.costo_envio || 0;
      const nuevoTotal = granTotal - descuentos + impuestos + costoEnvio;

      console.log(`${logPrefix} [4] 💰 Totales:`, {
        subtotalAnterior: datosPedido.subtotal,
        nuevoSubtotal: granTotal,
        descuentos: descuentos,
        impuestos: impuestos,
        costoEnvio: costoEnvio,
        totalAnterior: datosPedido.total,
        nuevoTotal: nuevoTotal
      });

      // Sanitizar datos del pedido: eliminar campos undefined y convertir a null
      const datosPedidoSanitizados = Object.entries(datosPedido).reduce((acc, [key, value]) => {
        // Si el valor es undefined, lo convertimos a null
        // Si es un número válido (incluso 0), lo mantenemos
        // Si es string vacío y el campo termina en _id, lo convertimos a null
        if (value === undefined) {
          acc[key] = null;
        } else if (typeof value === 'string' && value.trim() === '' && key.endsWith('_id')) {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      const datosPedidoFinal = {
        ...datosPedidoSanitizados,
        subtotal: granTotal,
        total: nuevoTotal,
        updated_at: new Date().toISOString()
      };

      console.log(`${logPrefix} [4] ✓ Totales calculados con función centralizada`);
      console.log(`${logPrefix} [4] Datos sanitizados:`, {
        cliente_id: datosPedidoFinal.cliente_id,
        zona_entrega_id: datosPedidoFinal.zona_entrega_id,
        tipo_entrega_id: datosPedidoFinal.tipo_entrega_id
      });

      // 5. Actualizar pedido principal
      console.log(`${logPrefix} [5] Actualizando registro principal del pedido...`);
      const updatePedidoStart = performance.now();

      const { error: updatePedidoError } = await supabase
        .from('pedidos')
        .update(datosPedidoFinal)
        .eq('id', pedidoId);

      const updatePedidoDuration = performance.now() - updatePedidoStart;
      if (updatePedidoError) {
        console.error(`${logPrefix} [5] ❌ Error actualizando pedido:`, updatePedidoError);
        throw updatePedidoError;
      }
      console.log(`${logPrefix} [5] ✓ Pedido actualizado en ${updatePedidoDuration.toFixed(2)}ms`);

      // 6. Generar/actualizar ticket
      console.log(`${logPrefix} [6] Generando/actualizando ticket...`);
      const ticketStart = performance.now();
      const ticket = await get().generarTicket(pedidoId);
      const ticketDuration = performance.now() - ticketStart;
      console.log(`${logPrefix} [6] ✓ Ticket generado en ${ticketDuration.toFixed(2)}ms`);

      // 7. Refrescar los datos desde la BD para asegurar consistencia
      console.log(`${logPrefix} [7] Refrescando datos desde BD...`);
      const refreshStart = performance.now();
      await get().fetchPedidoDetalles(pedidoId);
      const pedidoActualizado = get().pedidoActual;
      const refreshDuration = performance.now() - refreshStart;

      if (!pedidoActualizado) {
        console.error(`${logPrefix} [7] ❌ pedidoActual es null después del fetch`);
        throw new Error('No se pudo recuperar el pedido actualizado');
      }

      console.log(`${logPrefix} [7] ✓ Datos refrescados en ${refreshDuration.toFixed(2)}ms`);
      console.log(`${logPrefix} [7]   Pedido recuperado:`, {
        id: pedidoActualizado.id,
        total: pedidoActualizado.total,
        detallesCount: pedidoActualizado.detalles?.length,
        estado: pedidoActualizado.estado_nombre
      });

      toast.success('Pedido actualizado exitosamente');

      const totalDuration = performance.now() - updateStart;
      console.log(`\n${logPrefix} ✅ ACTUALIZACIÓN COMPLETADA EN ${totalDuration.toFixed(2)}ms`);
      console.log(`${'='.repeat(70)}\n`);

      return { pedido: pedidoActualizado, ticket };

    } catch (error: any) {
      const errorDuration = performance.now() - updateStart;
      console.error(`\n${logPrefix} ❌ ERROR DESPUÉS DE ${errorDuration.toFixed(2)}ms`);
      console.error(`${logPrefix} Error object:`, error);
      if (error instanceof Error) {
        console.error(`${logPrefix} Error message: ${error.message}`);
        console.error(`${logPrefix} Stack: ${error.stack}`);
      }
      console.error(`${'='.repeat(70)}\n`);
      toast.error(`No se pudo actualizar el pedido: ${error.message || 'Error desconocido'}`);
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updatePedidoStatus: async (pedidoId, nuevoEstadoId, justificacion) => {
    try {
      // 1. Obtener el estado actual del pedido
      const { data: pedidoActual, error: pedidoError } = await supabase
        .from('pedidos')
        .select('estado_id, notas')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) throw pedidoError;

      // 2. Obtener el nombre del nuevo estado
      const { data: estadoData, error: estadoError } = await supabase
        .from('pedido_estados')
        .select('nombre')
        .eq('id', nuevoEstadoId)
        .single();

      if (estadoError) throw estadoError;

      // 3. Preparar las notas (añadir justificación si es cancelación)
      let nuevasNotas = pedidoActual.notas || '';
      if (estadoData.nombre === 'Cancelado' && justificacion) {
        const timestamp = new Date().toLocaleString('es-ES');
        const motivoCancelacion = `\n[CANCELADO - ${timestamp}]: ${justificacion}`;
        nuevasNotas += motivoCancelacion;
      }

      // 4. Actualizar el estado del pedido
      const { error } = await supabase
        .from('pedidos')
        .update({
          estado_id: nuevoEstadoId,
          estado: estadoData.nombre.toLowerCase(),
          notas: nuevasNotas
        })
        .eq('id', pedidoId);

      if (error) throw error;

      // 5. Si cambiamos a completado, finalizar el pedido
      if (estadoData.nombre === 'Completado') {
        await get().finalizarPedido(pedidoId);
      }

      // 6. Actualizar timestamp según el estado
      if (estadoData.nombre === 'Listo para Entrega') {
        await get().updatePedidoTimestamp(pedidoId, 'fecha_listo_para_entrega');
      } else if (estadoData.nombre === 'En Reparto') {
        await get().updatePedidoTimestamp(pedidoId, 'fecha_en_ruta');
      } else if (estadoData.nombre === 'Completado') {
        await get().updatePedidoTimestamp(pedidoId, 'fecha_entregado');
      }

      // Refresh pedidos list
      await get().fetchPedidosActivos();

      toast.success(`Estado cambiado a '${estadoData.nombre}' exitosamente`);
    } catch (error: any) {
      console.error('Error updating pedido status:', error);
      toast.error('Error al actualizar estado del pedido');
      throw error;
    }
  },

  registrarPago: async (pagoData) => {
    set({ isSubmitting: true });
    try {
      // 1. Registrar el pago
      const { data: nuevoPago, error: pagoError } = await supabase
        .from('pagos')
        .insert([{
          ...pagoData,
          cobrado_por_usuario_id: pagoData.cobrado_por_usuario_id || (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (pagoError) throw pagoError;

      toast.success('Pago registrado exitosamente');

      // 2. Refrescar datos del pedido actual si es el mismo
      if (get().pedidoActual?.id === pagoData.pedido_id) {
        await get().fetchPedidoDetalles(pagoData.pedido_id);
      }

    } catch (error: any) {
      console.error('Error registrando pago:', error);
      toast.error('Error al registrar el pago');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  finalizarPedido: async (pedidoId) => {
    try {
      // 1. Obtener usuario actual y total del pedido
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No autorizado: usuario no identificado');
      }

      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select('total')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) throw pedidoError;

      if (!pedidoData?.total || pedidoData.total <= 0) {
        throw new Error('Monto total inválido para finalizar la venta');
      }

      // 2. Llamar a la función RPC que maneja todo de forma atómica
      const { data, error: rpcError } = await supabase.rpc('finalizar_venta_segura', {
        p_pedido_id: pedidoId,
        p_usuario_id: user.id,
        p_monto_total: pedidoData.total
      });

      if (rpcError) {
        throw new Error(`Error en RPC: ${rpcError.message}`);
      }

      // === [FIX] ACTUALIZAR ESTADO VISUAL A 'COMPLETADO' ===
      // Esto hace que desaparezca de la pantalla de cocina
      const { data: estadoCompletado } = await supabase
        .from('pedido_estados')
        .select('id')
        .eq('nombre', 'Completado')
        .single();

      if (estadoCompletado) {
        await supabase.from('pedidos').update({
          estado_id: estadoCompletado.id,
          estado: 'completado',
          fecha_entregado: new Date().toISOString()
        }).eq('id', pedidoId);
      }
      // ====================================================

      toast.success('Pedido finalizado exitosamente');

      // Refrescar listas
      get().fetchPedidosActivos();
    } catch (error: any) {
      console.error('Error finalizing pedido:', error);
      toast.error(`Error al finalizar pedido: ${error.message}`);
      throw error;
    }
  },

  finalizarVentaCompleta: async (pedido, detalles, pagos, estado, descuento = 0) => {
    set({ isSubmitting: true });
    try {

      // Validar datos básicos
      if (!pedido.tipo_entrega_id) {
        throw new Error('El tipo de entrega es requerido');
      }

      // Validar que haya detalles
      if (!detalles || detalles.length === 0) {
        throw new Error('El pedido debe tener al menos un producto');
      }

      // 1. Crear el pedido siempre como 'Pendiente' primero para obtener un ID
      const pedidoConDescuento = { ...pedido, descuentos: descuento };
      const resultadoCreacion = await get().createPedido(pedidoConDescuento, detalles, 'pendiente');
      const pedidoCreado = resultadoCreacion.pedido;

      if (!pedidoCreado || !pedidoCreado.id) {
        throw new Error('No se pudo crear el pedido inicial - ID no disponible');
      }


      // 2. Si hay pagos, registrarlos
      if (pagos && pagos.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const pagosParaInsertar = pagos.map(p => ({
          pedido_id: pedidoCreado.id,
          metodo_pago: p.metodo_pago,
          monto: p.monto,
          cobrado_por_usuario_id: user?.id
        }));
        const { error: pagoError } = await supabase.from('pagos').insert(pagosParaInsertar);
        if (pagoError) {
          throw new Error(`Error al registrar pagos: ${pagoError.message}`);
        }

        // Handle customer credit payments
        const pagosCreditoCliente = pagos.filter(p => p.metodo_pago === 'credito_cliente');
        if (pagosCreditoCliente.length > 0) {
          const montoTotalCredito = pagosCreditoCliente.reduce((sum: number, p: any) => sum + p.monto, 0);

          // Update customer balance
          const { error: updateError } = await supabase
            .from('clientes')
            .update({ saldo_actual: supabase.sql`saldo_actual - ${montoTotalCredito}` })
            .eq('id', pedido.cliente_id);

          if (updateError) {
            throw new Error(`Error al actualizar saldo del cliente: ${updateError.message}`);
          }

          // Record credit movement
          const movimiento = {
            cliente_id: pedido.cliente_id,
            pedido_id: pedidoCreado.id,
            tipo_movimiento: 'debit',
            monto: montoTotalCredito,
            saldo_anterior: 0, // Will be set by trigger or we fetch it
            saldo_posterior: 0, // Will be set by trigger
            descripcion: `Compra a crédito - Pedido #${pedidoCreado.id}`,
          };

          const { error: movError } = await supabase
            .from('movimientos_credito_cliente')
            .insert([movimiento]);

          if (movError) {
            console.error('Error recording credit movement:', movError);
            // Don't throw - payment was already recorded
          }
        }
      }

      // 3. Si el estado final es 'completado', finalizar el pedido
      let pedidoFinal = pedidoCreado;
      if (estado === 'completado') {
        await get().finalizarPedido(pedidoCreado.id);

        // Volver a buscar el pedido para obtener su estado y datos actualizados
        const { data: pedidoActualizado, error: fetchError } = await supabase
          .from('pedidos_vista').select('*').eq('id', pedidoCreado.id).single();

        if (fetchError) {
          throw new Error(`Error al obtener datos actualizados: ${fetchError.message}`);
        }
        pedidoFinal = pedidoActualizado;
      }

      // 4. Generar/actualizar el ticket con los datos finales
      const ticket = await get().generarTicket(pedidoFinal.id!);

      const mensaje = estado === 'completado'
        ? 'Venta finalizada con éxito'
        : 'Pedido guardado como pendiente';

      toast.success(mensaje);

      return { pedido: { ...pedidoFinal, ticket }, ticket };

    } catch (error: any) {

      // Mostrar mensaje de error específico
      const errorMessage = error.message || 'Ocurrió un error desconocido al finalizar la venta';
      toast.error(`Error: ${errorMessage}`);

      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  softDeletePedido: async (id) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh pedidos list
      await get().fetchPedidosActivos();
      toast.success('Pedido eliminado exitosamente');
    } catch (error: any) {
      console.error('Error soft deleting pedido:', error);
      toast.error('Error al eliminar pedido');
      throw error;
    }
  },

  restorePedido: async (id) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh pedidos list
      await get().fetchPedidosActivos();
      toast.success('Pedido restaurado exitosamente');
    } catch (error: any) {
      console.error('Error restoring pedido:', error);
      toast.error('Error al restaurar pedido');
      throw error;
    }
  },

  deletePedido: async (id) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh pedidos list
      await get().fetchPedidosActivos();
      toast.success('Pedido eliminado permanentemente');
    } catch (error: any) {
      console.error('Error deleting pedido:', error);
      toast.error('Error al eliminar pedido permanentemente');
      throw error;
    }
  },

  // Nuevas funciones para gestión de zonas
  createZona: async (zonaData) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('zonas_entrega')
        .insert([zonaData])
        .select()
        .single();

      if (error) {
        toast.error(`Error al crear la zona: ${error.message}`);
        throw error;
      }

      toast.success('Zona creada exitosamente');
      // Refrescar la lista de zonas
      await get().fetchZonasEntrega(true);
      return data;
    } catch (error: any) {
      console.error('Error creating zona:', error);
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateZona: async (id, zonaData) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('zonas_entrega')
        .update(zonaData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast.error(`Error al actualizar la zona: ${error.message}`);
        throw error;
      }

      toast.success('Zona actualizada exitosamente');
      await get().fetchZonasEntrega(true);
      return data;
    } catch (error: any) {
      console.error('Error updating zona:', error);
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  clearPedidoActual: () => set({ pedidoActual: null }),
  
  setShowDeleted: (show: boolean) => {
    set({ showDeleted: show });
    get().fetchPedidos(show);
  },

  subscribeToPedidosChanges: () => {
    const channel = supabase
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pedidos'
        },
        (payload) => {
          
          // Obtener el pedido completo con sus relaciones
          supabase
            .from('pedidos_vista')
            .select('*')
            .eq('id', payload.new.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                set(state => ({
                  pedidos: [data, ...state.pedidos]
                }));
              }
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos'
        },
        (payload) => {
          
          // Obtener el pedido completo con sus relaciones
          supabase
            .from('pedidos_vista')
            .select('*')
            .eq('id', payload.new.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                set(state => ({
                  pedidos: state.pedidos.map(pedido =>
                    pedido.id === data.id ? data : pedido
                  )
                }));
              }
            });
        }
      )
      .subscribe();

    return channel;
  },
}));