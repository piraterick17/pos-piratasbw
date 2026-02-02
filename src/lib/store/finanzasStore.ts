import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface CategoriaGasto {
  id?: number;
  nombre: string;
  descripcion?: string;
}

export interface MovimientoFinanciero {
  id?: number;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion: string;
  categoria_id?: number;
  pedido_id?: number;
  proveedor_id?: number;
  fecha_movimiento?: string;
  estatus: 'pagado' | 'pendiente' | 'cancelado';
  metodo_pago?: string;
  referencia?: string;
  anulado?: boolean;
}

export interface PagoRecurrente {
  id?: number;
  descripcion: string;
  monto: number;
  categoria_id?: number;
  proveedor_id?: number;
  frecuencia: string;
  dia_del_mes?: number;
  fecha_inicio: string;
  fecha_fin?: string;
  activo?: boolean;
  metodo_pago?: string;
}

export interface RecurrenciaData {
  frecuencia: string;
  fecha_inicio: string;
  fecha_fin?: string;
  dia_del_mes?: number;
}

interface FinanzasState {
  movimientos: MovimientoFinanciero[];
  categorias: CategoriaGasto[];
  isLoading: boolean;
  isSubmitting: boolean;
  fetchMovimientos: (fechaInicio: string, fechaFin: string) => Promise<void>;
  fetchCategorias: () => Promise<void>;
  createMovimiento: (movimiento: Omit<MovimientoFinanciero, 'id'>, recurrencia?: RecurrenciaData) => Promise<void>;
  createCategoria: (categoria: Omit<CategoriaGasto, 'id'>) => Promise<void>;
  updateCategoria: (id: number, categoria: Partial<CategoriaGasto>) => Promise<void>;
  deleteCategoria: (id: number) => Promise<void>;

  // Movement management functions
  updateMovimiento: (id: number, movimiento: Partial<MovimientoFinanciero>) => Promise<void>;
  deleteMovimiento: (id: number) => Promise<void>;
}

export const useFinanzasStore = create<FinanzasState>((set, get) => ({
  movimientos: [],
  categorias: [],
  isLoading: false,
  isSubmitting: false,

  fetchMovimientos: async (fechaInicio, fechaFin) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('finanzas_movimientos')
        .select('*')
        .gte('fecha_movimiento', fechaInicio)
        .lte('fecha_movimiento', fechaFin + 'T23:59:59')
        .order('fecha_movimiento', { ascending: false });
      if (error) throw error;
      set({ movimientos: data || [] });
    } catch (error: any) {
      toast.error('Error al cargar los movimientos financieros.');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategorias: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('finanzas_categorias_gastos')
        .select('*')
        .order('nombre');
      if (error) throw error;
      set({ categorias: data || [] });
    } catch (error: any) {
      toast.error('Error al cargar las categorías de gastos.');
    } finally {
      set({ isLoading: false });
    }
  },

  createMovimiento: async (movimiento, recurrencia) => {
    set({ isSubmitting: true });
    try {
      // Crear el movimiento financiero
      const { error: movError } = await supabase.from('finanzas_movimientos').insert([movimiento]);
      if (movError) throw movError;

      // Si es un pago recurrente, crear la configuración de recurrencia
      if (recurrencia) {
        const pagoRecurrente: Omit<PagoRecurrente, 'id'> = {
          descripcion: movimiento.descripcion,
          monto: movimiento.monto,
          categoria_id: movimiento.categoria_id,
          proveedor_id: movimiento.proveedor_id,
          frecuencia: recurrencia.frecuencia,
          dia_del_mes: recurrencia.dia_del_mes,
          fecha_inicio: recurrencia.fecha_inicio,
          fecha_fin: recurrencia.fecha_fin || undefined,
          activo: true,
          metodo_pago: movimiento.metodo_pago,
        };

        const { error: recError } = await supabase.from('finanzas_pagos_recurrentes').insert([pagoRecurrente]);
        if (recError) throw recError;

        toast.success('Movimiento y pago recurrente registrados con éxito.');
      } else {
        toast.success('Movimiento registrado con éxito.');
      }
    } catch (error: any) {
      toast.error('Error al registrar el movimiento.');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  createCategoria: async (categoria) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase.from('finanzas_categorias_gastos').insert([categoria]);
      if (error) throw error;
      toast.success('Categoría creada con éxito.');
      get().fetchCategorias();
    } catch (error: any) {
      toast.error('Error al crear la categoría.');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateCategoria: async (id, updates) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase.from('finanzas_categorias_gastos').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Categoría actualizada con éxito.');
      get().fetchCategorias();
    } catch (error: any) {
      toast.error('Error al actualizar la categoría.');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteCategoria: async (id) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase.from('finanzas_categorias_gastos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Categoría eliminada con éxito.');
      get().fetchCategorias();
    } catch (error: any) {
      toast.error('Error al eliminar la categoría. Es posible que esté en uso.');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateMovimiento: async (id, updates) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase.from('finanzas_movimientos').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Movimiento actualizado con éxito.');
    } catch (error: any) {
      toast.error('Error al actualizar el movimiento.');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteMovimiento: async (id) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('finanzas_movimientos')
        .update({
          anulado: true,
          estatus: 'cancelado'
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Movimiento anulado con éxito.');
    } catch (error: any) {
      toast.error('Error al anular el movimiento.');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));