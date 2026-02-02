import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface Proveedor {
  id?: number;
  nombre: string;
  contacto_nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
  created_at?: string;
}

export interface ProveedorInsumo {
  proveedor_id: number;
  insumo_id: number;
  costo_especifico: number;
  es_proveedor_activo: boolean;
  updated_at?: string;
  proveedor?: Proveedor;
}

interface ProveedoresState {
  proveedores: Proveedor[];
  proveedoresInsumo: ProveedorInsumo[];
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Proveedor actions
  fetchProveedores: () => Promise<void>;
  fetchProveedorById: (id: number) => Promise<Proveedor | null>;
  createProveedor: (proveedor: Omit<Proveedor, 'id'>) => Promise<Proveedor>;
  updateProveedor: (id: number, proveedor: Partial<Proveedor>) => Promise<void>;
  deleteProveedor: (id: number) => Promise<void>;
  
  // Proveedor-Insumo actions
  fetchProveedoresByInsumoId: (insumoId: number) => Promise<ProveedorInsumo[]>;
  asignarProveedorAInsumo: (proveedorInsumo: Omit<ProveedorInsumo, 'updated_at'>) => Promise<void>;
  actualizarProveedorInsumo: (proveedorInsumo: Omit<ProveedorInsumo, 'updated_at'>) => Promise<void>;
  eliminarProveedorDeInsumo: (proveedorId: number, insumoId: number) => Promise<void>;
}

export const useProveedoresStore = create<ProveedoresState>((set, get) => ({
  proveedores: [],
  proveedoresInsumo: [],
  isLoading: false,
  isSubmitting: false,

  fetchProveedores: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre');

      if (error) throw error;
      set({ proveedores: data || [] });
    } catch (error: any) {
      console.error('Error fetching proveedores:', error);
      toast.error('Error al cargar proveedores');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProveedorById: async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching proveedor:', error);
      toast.error('Error al cargar proveedor');
      return null;
    }
  },

  createProveedor: async (proveedor) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .insert([proveedor])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh proveedores list
      await get().fetchProveedores();
      toast.success('Proveedor creado exitosamente');
      return data;
    } catch (error: any) {
      console.error('Error creating proveedor:', error);
      toast.error('Error al crear proveedor');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateProveedor: async (id, updates) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('proveedores')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Refresh proveedores list
      await get().fetchProveedores();
      toast.success('Proveedor actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating proveedor:', error);
      toast.error('Error al actualizar proveedor');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteProveedor: async (id) => {
    try {
      // Primero verificar si hay insumos asociados a este proveedor
      const { data: proveedorInsumos, error: checkError } = await supabase
        .from('proveedor_insumos')
        .select('insumo_id')
        .eq('proveedor_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (proveedorInsumos && proveedorInsumos.length > 0) {
        toast.error('No se puede eliminar el proveedor porque tiene insumos asociados');
        return;
      }

      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh proveedores list
      await get().fetchProveedores();
      toast.success('Proveedor eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting proveedor:', error);
      toast.error('Error al eliminar proveedor');
      throw error;
    }
  },

  fetchProveedoresByInsumoId: async (insumoId: number) => {
    try {
      const { data, error } = await supabase
        .from('proveedor_insumos')
        .select(`
          *,
          proveedor:proveedores(*)
        `)
        .eq('insumo_id', insumoId)
        .order('es_proveedor_activo', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching proveedores by insumo:', error);
      toast.error('Error al cargar proveedores del insumo');
      return [];
    }
  },

  asignarProveedorAInsumo: async (proveedorInsumo) => {
    set({ isSubmitting: true });
    try {
      // Verificar si ya existe esta relación
      const { data: existingData, error: checkError } = await supabase
        .from('proveedor_insumos')
        .select('*')
        .eq('proveedor_id', proveedorInsumo.proveedor_id)
        .eq('insumo_id', proveedorInsumo.insumo_id)
        .maybeSingle();

      if (checkError) throw checkError;

      let result;
      if (existingData) {
        // Si ya existe, actualizar
        const { data, error } = await supabase
          .from('proveedor_insumos')
          .update({
            costo_especifico: proveedorInsumo.costo_especifico,
            es_proveedor_activo: proveedorInsumo.es_proveedor_activo,
            updated_at: new Date().toISOString()
          })
          .eq('proveedor_id', proveedorInsumo.proveedor_id)
          .eq('insumo_id', proveedorInsumo.insumo_id)
          .select();

        if (error) throw error;
        result = data;
        toast.success('Proveedor actualizado para este insumo');
      } else {
        // Si no existe, insertar
        const { data, error } = await supabase
          .from('proveedor_insumos')
          .insert([proveedorInsumo])
          .select();

        if (error) throw error;
        result = data;
        toast.success('Proveedor asignado al insumo exitosamente');
      }

      // Si se marcó como activo, actualizar el costo del insumo
      if (proveedorInsumo.es_proveedor_activo) {
        const { error: updateError } = await supabase
          .from('insumos')
          .update({ costo_unitario: proveedorInsumo.costo_especifico })
          .eq('id', proveedorInsumo.insumo_id);

        if (updateError) {
          console.error('Error updating insumo cost:', updateError);
          toast.warning('El proveedor se asignó pero no se pudo actualizar el costo del insumo');
        }
      }

      return result;
    } catch (error: any) {
      console.error('Error assigning proveedor to insumo:', error);
      toast.error('Error al asignar proveedor al insumo');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  actualizarProveedorInsumo: async (proveedorInsumo) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('proveedor_insumos')
        .update({
          costo_especifico: proveedorInsumo.costo_especifico,
          es_proveedor_activo: proveedorInsumo.es_proveedor_activo,
          updated_at: new Date().toISOString()
        })
        .eq('proveedor_id', proveedorInsumo.proveedor_id)
        .eq('insumo_id', proveedorInsumo.insumo_id);

      if (error) throw error;
      
      // Si se marcó como activo, actualizar el costo del insumo
      if (proveedorInsumo.es_proveedor_activo) {
        const { error: updateError } = await supabase
          .from('insumos')
          .update({ costo_unitario: proveedorInsumo.costo_especifico })
          .eq('id', proveedorInsumo.insumo_id);

        if (updateError) {
          console.error('Error updating insumo cost:', updateError);
          toast.warning('La relación se actualizó pero no se pudo actualizar el costo del insumo');
        }
      }
      
      toast.success('Relación proveedor-insumo actualizada exitosamente');
    } catch (error: any) {
      console.error('Error updating proveedor-insumo:', error);
      toast.error('Error al actualizar relación proveedor-insumo');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  eliminarProveedorDeInsumo: async (proveedorId, insumoId) => {
    try {
      // Primero verificar si es el proveedor activo
      const { data: proveedorInsumo, error: checkError } = await supabase
        .from('proveedor_insumos')
        .select('es_proveedor_activo')
        .eq('proveedor_id', proveedorId)
        .eq('insumo_id', insumoId)
        .single();

      if (checkError) throw checkError;

      if (proveedorInsumo.es_proveedor_activo) {
        toast.error('No se puede eliminar el proveedor activo. Asigna otro proveedor como activo primero.');
        return;
      }

      const { error } = await supabase
        .from('proveedor_insumos')
        .delete()
        .eq('proveedor_id', proveedorId)
        .eq('insumo_id', insumoId);

      if (error) throw error;
      
      toast.success('Proveedor desasignado del insumo exitosamente');
    } catch (error: any) {
      console.error('Error removing proveedor from insumo:', error);
      toast.error('Error al eliminar proveedor del insumo');
      throw error;
    }
  }
}));