import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface Repartidor {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  activo: boolean;
  rol_nombre?: string;
}

export interface AsignacionEntrega {
  id: number;
  pedido_id: number;
  repartidor_id?: string;
  fecha_asignacion?: string;
  fecha_recogida?: string;
  fecha_entrega_real?: string;
  tiempo_total_minutos?: number;
  distancia_km?: number;
  estado: 'pendiente' | 'asignado' | 'recogido' | 'en_camino' | 'entregado' | 'cancelado';
  notas?: string;
  calificacion?: number;
  comentario_cliente?: string;
  insert_by_user?: string;

  pedido?: any;
  repartidor?: Repartidor;
}

interface AsignacionesState {
  asignaciones: AsignacionEntrega[];
  misAsignaciones: AsignacionEntrega[];
  repartidores: Repartidor[];
  isLoading: boolean;

  fetchAsignaciones: () => Promise<void>;
  fetchMisAsignaciones: () => Promise<void>;
  fetchRepartidoresDisponibles: () => Promise<void>;
  asignarRepartidor: (asignacionId: number, repartidorId: string) => Promise<void>;
  actualizarEstadoAsignacion: (
    asignacionId: number,
    nuevoEstado: AsignacionEntrega['estado'],
    datosAdicionales?: Partial<AsignacionEntrega>
  ) => Promise<void>;
  subscribeToAsignacionesChanges: () => any;
}

export const useAsignacionesStore = create<AsignacionesState>((set, get) => ({
  asignaciones: [],
  misAsignaciones: [],
  repartidores: [],
  isLoading: false,

  fetchAsignaciones: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('asignaciones_entrega')
        .select(`
          *,
          pedido:pedidos(
            id,
            cliente_id,
            total,
            subtotal,
            direccion_envio,
            notas_entrega,
            tipo_entrega_id,
            zona_entrega_id,
            estado,
            estado_id,
            insert_date,
            metodo_pago,
            cliente:clientes(nombre, telefono)
          ),
          repartidor:usuarios(
            id,
            nombre,
            email,
            activo
          )
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        set({ asignaciones: [] });
        return;
      }

      // Filtrar solo asignaciones que tengan pedido válido
      const asignacionesValidas = data.filter(a => a.pedido != null);

      // Transformar datos para mantener compatibilidad
      const transformedData = asignacionesValidas.map(asignacion => ({
        ...asignacion,
        pedido_id: Number(asignacion.pedido_id),
        repartidor_id: asignacion.repartidor_id || null,
        pedido: {
          ...asignacion.pedido,
          id: Number(asignacion.pedido.id),
          cliente_nombre: asignacion.pedido?.cliente?.nombre || 'Sin nombre',
          cliente_telefono: asignacion.pedido?.cliente?.telefono || ''
        },
        repartidor: asignacion.repartidor ? {
          id: asignacion.repartidor.id,
          nombre: asignacion.repartidor.nombre,
          email: asignacion.repartidor.email,
          activo: asignacion.repartidor.activo
        } : null
      }));

      set({ asignaciones: transformedData });
    } catch (error: any) {
      console.error('Error fetching asignaciones:', error);
      toast.error('Error al cargar asignaciones de entrega');
      set({ asignaciones: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMisAsignaciones: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('asignaciones_entrega')
        .select(`
          *,
          pedido:pedidos!inner(
            id,
            cliente_id,
            total,
            subtotal,
            direccion_envio,
            notas_entrega,
            tipo_entrega_id,
            zona_entrega_id,
            estado,
            estado_id,
            insert_date,
            metodo_pago,
            cliente:clientes(nombre, telefono)
          ),
          repartidor:usuarios(
            id,
            nombre,
            email,
            activo
          )
        `)
        .eq('repartidor_id', user.id)
        .in('estado', ['asignado', 'recogido', 'en_camino'])
        .order('fecha_asignacion', { ascending: true });

      if (error) throw error;

      // Transformar datos para mantener compatibilidad
      const transformedData = data?.map(asignacion => ({
        ...asignacion,
        pedido_id: Number(asignacion.pedido_id),
        pedido: {
          ...asignacion.pedido,
          id: Number(asignacion.pedido.id),
          cliente_nombre: asignacion.pedido.cliente?.nombre || 'Sin nombre',
          cliente_telefono: asignacion.pedido.cliente?.telefono || ''
        },
        repartidor: asignacion.repartidor ? {
          id: asignacion.repartidor.id,
          nombre: asignacion.repartidor.nombre,
          email: asignacion.repartidor.email,
          activo: asignacion.repartidor.activo
        } : null
      }));

      set({ misAsignaciones: transformedData || [] });
    } catch (error: any) {
      console.error('Error fetching mis asignaciones:', error);
      toast.error('Error al cargar tus entregas');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRepartidoresDisponibles: async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          nombre,
          email,
          activo,
          usuario_roles!usuario_roles_usuario_id_fkey!inner(
            rol_id,
            roles!inner(
              nombre
            )
          )
        `)
        .eq('activo', true)
        .eq('usuario_roles.roles.nombre', 'Repartidor')
        .order('nombre', { ascending: true });

      if (error) throw error;

      const repartidores = data?.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        telefono: '',
        activo: u.activo,
        rol_nombre: 'Repartidor'
      })) || [];

      set({ repartidores });
    } catch (error: any) {
      console.error('Error fetching repartidores:', error);
      toast.error('Error al cargar repartidores');
    }
  },

  asignarRepartidor: async (asignacionId: number, repartidorId: string) => {
    try {
      const { error } = await supabase
        .from('asignaciones_entrega')
        .update({
          repartidor_id: repartidorId,
          estado: 'asignado',
          fecha_asignacion: new Date().toISOString()
        })
        .eq('id', asignacionId);

      if (error) throw error;

      const { data: repartidor } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', repartidorId)
        .single();

      toast.success(`Entrega asignada a ${repartidor?.nombre || 'repartidor'}`);

      await get().fetchAsignaciones();
    } catch (error: any) {
      console.error('Error asignando repartidor:', error);
      toast.error(`Error al asignar repartidor: ${error.message || 'Error desconocido'}`);
      throw error;
    }
  },

  actualizarEstadoAsignacion: async (
    asignacionId: number,
    nuevoEstado: AsignacionEntrega['estado'],
    datosAdicionales?: Partial<AsignacionEntrega>
  ) => {
    try {
      const updateData: any = {
        estado: nuevoEstado,
        ...datosAdicionales
      };

      if (nuevoEstado === 'recogido' && !datosAdicionales?.fecha_recogida) {
        updateData.fecha_recogida = new Date().toISOString();
      }

      if (nuevoEstado === 'en_camino' && !datosAdicionales?.fecha_recogida) {
        updateData.fecha_recogida = new Date().toISOString();
      }

      if (nuevoEstado === 'entregado') {
        const fechaEntrega = new Date().toISOString();
        updateData.fecha_entrega_real = fechaEntrega;

        const { data: asignacion } = await supabase
          .from('asignaciones_entrega')
          .select('fecha_asignacion')
          .eq('id', asignacionId)
          .single();

        if (asignacion?.fecha_asignacion) {
          const tiempoTotal = Math.round(
            (new Date(fechaEntrega).getTime() - new Date(asignacion.fecha_asignacion).getTime()) / 60000
          );
          updateData.tiempo_total_minutos = tiempoTotal;
        }

        const { error: pedidoError } = await supabase
          .from('pedidos')
          .update({ fecha_entregado: fechaEntrega })
          .eq('id', (await supabase
            .from('asignaciones_entrega')
            .select('pedido_id')
            .eq('id', asignacionId)
            .single()
          ).data?.pedido_id);

        if (pedidoError) {
          console.error('Error actualizando fecha_entregado en pedido:', pedidoError);
        }
      }

      const { error } = await supabase
        .from('asignaciones_entrega')
        .update(updateData)
        .eq('id', asignacionId);

      if (error) throw error;

      const estadosMap: Record<string, string> = {
        recogido: 'recogido del local',
        en_camino: 'en camino al cliente',
        entregado: 'entregado exitosamente',
        cancelado: 'cancelado'
      };

      toast.success(`Pedido ${estadosMap[nuevoEstado] || 'actualizado'}`);

      await get().fetchMisAsignaciones();
      await get().fetchAsignaciones();
    } catch (error: any) {
      console.error('Error actualizando estado de asignación:', error);
      toast.error('Error al actualizar estado');
      throw error;
    }
  },

  subscribeToAsignacionesChanges: () => {
    const channel = supabase
      .channel('asignaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asignaciones_entrega'
        },
        () => {
          get().fetchAsignaciones();
          get().fetchMisAsignaciones();
        }
      )
      .subscribe();

    return channel;
  }
}));
