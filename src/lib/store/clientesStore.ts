import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface Cliente {
  id?: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: any; // JSONB field
  referencias?: string;
  numero_identificacion?: string;
  observaciones?: string;
  avatar_url?: string;
  telefono_secundario?: string;
  permite_credito?: boolean;
  saldo_actual?: number;
  plus_code?: string;
  deleted_at?: string;
  insert_date?: string;
  updated_at?: string;
}

export interface MovimientoCredito {
  cliente_id: string;
  tipo_movimiento: 'cargo' | 'abono';
  monto: number;
  motivo?: string;
  pedido_id?: number;
}

interface ClientesState {
  clientes: Cliente[];
  clienteActual: Cliente | null;
  isLoading: boolean;
  isSubmitting: boolean;
  showDeleted: boolean;
  
  // Client actions
  fetchClientes: (includeDeleted?: boolean) => Promise<void>;
  fetchClienteById: (id: string) => Promise<void>;
  createCliente: (cliente: Cliente) => Promise<Cliente>;
  updateCliente: (id: string, datos: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  restoreCliente: (id: string) => Promise<void>;
  
  // Credit movement actions
  createCreditoMovimiento: (movimiento: MovimientoCredito) => Promise<void>;
  
  // Utility actions
  clearClienteActual: () => void;
  setShowDeleted: (show: boolean) => void;
}

export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: [],
  clienteActual: null,
  isLoading: false,
  isSubmitting: false,
  showDeleted: false,

  fetchClientes: async (includeDeleted = false) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('clientes')
        .select('*')
        .order('nombre');

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ clientes: data || [] });
    } catch (error: any) {
      console.error('Error fetching clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchClienteById: async (id: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ clienteActual: data });
    } catch (error: any) {
      console.error('Error fetching cliente:', error);
      toast.error('Error al cargar cliente');
      set({ clienteActual: null });
    } finally {
      set({ isLoading: false });
    }
  },

  createCliente: async (cliente) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh clientes list
      await get().fetchClientes(get().showDeleted);
      toast.success('Cliente creado exitosamente');
      return data;
    } catch (error: any) {
      console.error('Error creating cliente:', error);
      toast.error('Error al crear cliente');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateCliente: async (id, datos) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('clientes')
        .update(datos)
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      set(state => ({
        clienteActual: state.clienteActual?.id === id 
          ? { ...state.clienteActual, ...datos }
          : state.clienteActual,
        clientes: state.clientes.map(c => 
          c.id === id ? { ...c, ...datos } : c
        )
      }));
      
      toast.success('Cliente actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating cliente:', error);
      toast.error('Error al actualizar cliente');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteCliente: async (id) => {
    try {
      // First check if client has pending balance
      const { data: cliente, error: fetchError } = await supabase
        .from('clientes')
        .select('saldo_actual, nombre')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (cliente.saldo_actual > 0) {
        toast.error(`No se puede eliminar a "${cliente.nombre}" porque tiene un saldo pendiente de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cliente.saldo_actual)}`);
        return;
      }

      // Perform soft delete
      const { error } = await supabase
        .from('clientes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh clientes list
      await get().fetchClientes(get().showDeleted);
      toast.success('Cliente eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting cliente:', error);
      toast.error('Error al eliminar cliente');
      throw error;
    }
  },

  restoreCliente: async (id) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh clientes list
      await get().fetchClientes(get().showDeleted);
      toast.success('Cliente restaurado exitosamente');
    } catch (error: any) {
      console.error('Error restoring cliente:', error);
      toast.error('Error al restaurar cliente');
      throw error;
    }
  },

  createCreditoMovimiento: async (movimiento) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('movimientos_credito_cliente')
        .insert([movimiento])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh current client to get updated balance
      if (get().clienteActual?.id === movimiento.cliente_id) {
        await get().fetchClienteById(movimiento.cliente_id);
      }
      
      // Refresh clientes list
      await get().fetchClientes(get().showDeleted);
      
      toast.success('Movimiento de crédito registrado exitosamente');
    } catch (error: any) {
      console.error('Error creating credito movimiento:', error);
      toast.error('Error al registrar movimiento de crédito');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  clearClienteActual: () => set({ clienteActual: null }),
  
  setShowDeleted: (show: boolean) => {
    set({ showDeleted: show });
    get().fetchClientes(show);
  },
}));