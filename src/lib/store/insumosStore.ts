import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface InsumoCategoria {
  id?: number;
  nombre: string;
  descripcion?: string;
  created_at?: string;
}

export interface Insumo {
  id?: number;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  stock_actual?: number;
  stock_minimo?: number;
  costo_unitario?: number;
  created_at?: string;
  updated_at?: string;
  categoria_id?: number;
  categoria?: InsumoCategoria;
}

export interface MovimientoInsumo {
  id?: number;
  insumo_id: number;
  tipo_movimiento: 'compra' | 'merma' | 'ajuste' | 'uso_produccion';
  cantidad: number;
  motivo?: string;
  fecha?: string;
  usuario_id?: string;
  insumo?: {
    nombre: string;
    unidad_medida: string;
  };
}

export interface ProductoInsumo {
  producto_id: number;
  insumo_id: number;
  cantidad_requerida: number;
  insumo?: Insumo;
}

interface InsumosState {
  insumos: Insumo[];
  categoriasInsumo: InsumoCategoria[];
  movimientos: MovimientoInsumo[];
  productosInsumos: ProductoInsumo[];
  isLoading: boolean;
  isSubmitting: boolean;

  // Insumo actions
  fetchInsumos: () => Promise<void>;
  fetchInsumoCategorias: () => Promise<void>;
  fetchInsumoById: (id: number) => Promise<Insumo | null>;
  createInsumo: (insumo: Omit<Insumo, 'id'>) => Promise<void>;
  updateInsumo: (id: number, insumo: Partial<Insumo>) => Promise<void>;
  deleteInsumo: (id: number) => Promise<void>;

  // Categoría actions
  createInsumoCategoria: (categoria: Omit<InsumoCategoria, 'id'>) => Promise<void>;
  updateInsumoCategoria: (id: number, categoria: Partial<InsumoCategoria>) => Promise<void>;
  deleteInsumoCategoria: (id: number) => Promise<void>;

  // Movimiento actions
  fetchMovimientos: (insumoId?: number) => Promise<void>;
  fetchMovimientosByInsumoId: (insumoId: number) => Promise<MovimientoInsumo[]>;
  fetchMermas: () => Promise<MovimientoInsumo[]>;
  createMovimientoInsumo: (movimiento: Omit<MovimientoInsumo, 'id'>) => Promise<void>;

  // Producto-Insumo actions
  fetchProductoInsumos: (productoId: number) => Promise<ProductoInsumo[]>;
  updateProductoInsumos: (productoId: number, insumos: Omit<ProductoInsumo, 'producto_id'>[]) => Promise<void>;

  // Utility actions
  getInsumosConStockBajo: () => Insumo[];

  updateStockBatch: (updates: { id: number; stock_actual: number }[]) => Promise<void>;
}

export const useInsumosStore = create<InsumosState>((set, get) => ({
  insumos: [],
  categoriasInsumo: [],
  movimientos: [],
  productosInsumos: [],
  isLoading: false,
  isSubmitting: false,

  fetchInsumos: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select(`
          *,
          categoria:insumo_categorias(id, nombre)
        `)
        .order('nombre');

      if (error) {
        throw error;
      }

      set({ insumos: data || [] });
    } catch (error: any) {
      console.error('Error fetching insumos:', error);

      if (error.message === 'TypeError: Failed to fetch') {
        toast.error('Error de conexión con la base de datos');
      } else {
        toast.error('Error al cargar insumos');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInsumoCategorias: async () => {
    if (!supabase) {
      console.warn('Supabase client not initialized yet');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('insumo_categorias')
        .select('*')
        .order('nombre');

      if (error) throw error;
      set({ categoriasInsumo: data || [] });
    } catch (error: any) {
      console.error('Error fetching insumo categorias:', error);
      if (error.message !== 'TypeError: Failed to fetch') {
        toast.error('Error al cargar categorías de insumos');
      }
    }
  },

  fetchInsumoById: async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching insumo:', error);
      toast.error('Error al cargar insumo');
      return null;
    }
  },

  createInsumo: async (insumo) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('insumos')
        .insert([insumo])
        .select()
        .single();

      if (error) throw error;

      await get().fetchInsumos();
      toast.success('Insumo creado exitosamente');
    } catch (error: any) {
      console.error('Error creating insumo:', error);
      toast.error('Error al crear insumo');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateInsumo: async (id, updates) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('insumos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await get().fetchInsumos();
      toast.success('Insumo actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating insumo:', error);
      toast.error('Error al actualizar insumo');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteInsumo: async (id) => {
    try {
      const { error } = await supabase
        .from('insumos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchInsumos();
      toast.success('Insumo eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting insumo:', error);
      toast.error('Error al eliminar insumo');
      throw error;
    }
  },

  createInsumoCategoria: async (categoria) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('insumo_categorias')
        .insert([categoria])
        .select()
        .single();

      if (error) throw error;

      await get().fetchInsumoCategorias();
      toast.success('Categoría creada exitosamente');
    } catch (error: any) {
      console.error('Error creating insumo categoria:', error);
      toast.error('Error al crear categoría');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateInsumoCategoria: async (id, updates) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('insumo_categorias')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await get().fetchInsumoCategorias();
      toast.success('Categoría actualizada exitosamente');
    } catch (error: any) {
      console.error('Error updating insumo categoria:', error);
      toast.error('Error al actualizar categoría');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteInsumoCategoria: async (id) => {
    try {
      const { data: insumosConCategoria, error: checkError } = await supabase
        .from('insumos')
        .select('id')
        .eq('categoria_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (insumosConCategoria && insumosConCategoria.length > 0) {
        toast.error('No se puede eliminar la categoría porque hay insumos asociados');
        return;
      }

      const { error } = await supabase
        .from('insumo_categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchInsumoCategorias();
      toast.success('Categoría eliminada exitosamente');
    } catch (error: any) {
      console.error('Error deleting insumo categoria:', error);
      toast.error('Error al eliminar categoría');
      throw error;
    }
  },

  fetchMovimientos: async (insumoId) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('movimientos_insumo')
        .select(`
          *,
          insumo:insumos(nombre, unidad_medida)
        `)
        .order('fecha', { ascending: false });

      if (insumoId) {
        query = query.eq('insumo_id', insumoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ movimientos: data || [] });
    } catch (error: any) {
      console.error('Error fetching movimientos:', error);
      toast.error('Error al cargar movimientos');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMovimientosByInsumoId: async (insumoId: number) => {
    try {
      const { data, error } = await supabase
        .from('movimientos_insumo')
        .select(`
          *,
          insumo:insumos(nombre, unidad_medida)
        `)
        .eq('insumo_id', insumoId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching movimientos by insumo:', error);
      toast.error('Error al cargar movimientos del insumo');
      return [];
    }
  },

  fetchMermas: async () => {
    try {
      const { data, error } = await supabase
        .from('movimientos_insumo')
        .select(`
          *,
          insumo:insumos(nombre, unidad_medida)
        `)
        .eq('tipo_movimiento', 'merma')
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching mermas:', error);
      toast.error('Error al cargar mermas');
      return [];
    }
  },

  createMovimientoInsumo: async (movimiento) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('movimientos_insumo')
        .insert([movimiento])
        .select()
        .single();

      if (error) throw error;

      if (movimiento.tipo_movimiento === 'compra') {
        const { data: insumo, error: insumoError } = await supabase
          .from('insumos')
          .select('costo_unitario, nombre')
          .eq('id', movimiento.insumo_id)
          .single();

        if (insumoError) {
          console.error('Error fetching insumo cost for finance movement:', insumoError);
          toast.error('Se registró la compra, pero no se pudo crear el egreso financiero.');
        } else {
          const costoTotal = (insumo.costo_unitario || 0) * movimiento.cantidad;

          if (costoTotal > 0) {
            const { error: finanzasError } = await supabase
              .from('finanzas_movimientos')
              .insert({
                tipo: 'egreso',
                monto: costoTotal,
                descripcion: `Compra de insumo: ${insumo.nombre}`,
                movimiento_insumo_id: data.id,
                estatus: 'pagado',
                fecha_movimiento: new Date().toISOString(),
              });

            if (finanzasError) {
              console.error('Error creating finance movement for purchase:', finanzasError);
              toast.error('Se registró la compra, pero no se pudo crear el egreso financiero.');
            }
          }
        }
      }

      await get().fetchInsumos();
      await get().fetchMovimientos();

      const tipoTexto = {
        'compra': 'Compra registrada',
        'merma': 'Merma registrada',
        'ajuste': 'Ajuste realizado',
        'uso_produccion': 'Uso registrado'
      };

      toast.success(tipoTexto[movimiento.tipo_movimiento] + ' exitosamente');
    } catch (error: any) {
      console.error('Error creating movimiento:', error);
      toast.error('Error al registrar movimiento');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchProductoInsumos: async (productoId) => {
    try {
      const { data, error } = await supabase
        .from('producto_insumos')
        .select(`
          *,
          insumo:insumos(*)
        `)
        .eq('producto_id', productoId);

      if (error) throw error;

      const productosInsumos = data || [];
      set({ productosInsumos });
      return productosInsumos;
    } catch (error: any) {
      console.error('Error fetching producto insumos:', error);
      toast.error('Error al cargar receta del producto');
      return [];
    }
  },

  updateProductoInsumos: async (productoId, insumos) => {
    set({ isSubmitting: true });
    try {
      const { error: deleteError } = await supabase
        .from('producto_insumos')
        .delete()
        .eq('producto_id', productoId);

      if (deleteError) throw deleteError;

      if (insumos.length > 0) {
        const insumosToInsert = insumos.map(insumo => ({
          producto_id: productoId,
          insumo_id: insumo.insumo_id,
          cantidad_requerida: insumo.cantidad_requerida
        }));

        const { error: insertError } = await supabase
          .from('producto_insumos')
          .insert(insumosToInsert);

        if (insertError) throw insertError;
      }

      toast.success('Receta del producto actualizada exitosamente');
    } catch (error: any) {
      console.error('Error updating producto insumos:', error);
      toast.error('Error al actualizar receta del producto');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  getInsumosConStockBajo: () => {
    const { insumos } = get();
    return insumos.filter(insumo => 
      (insumo.stock_actual || 0) <= (insumo.stock_minimo || 0)
    );
  },

  updateStockBatch: async (updates) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase.rpc('actualizar_stock_insumos_batch', {
        insumos_data: updates,
      });

      if (error) throw error;

      await get().fetchInsumos();
      toast.success('Inventario actualizado masivamente con éxito');
    } catch (error: any) {
      console.error('Error updating stock in batch:', error);
      toast.error('Error al actualizar el stock masivamente');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));