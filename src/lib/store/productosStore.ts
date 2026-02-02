import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Producto {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio?: number;
  precio_regular?: number;
  precio_descuento?: number;
  costo?: number;
  activo?: boolean;
  stock_actual?: number;
  stock_minimo?: number;
  unidad_medida?: string;
  categoria_id?: number;
  codigo?: string;
  destacado?: boolean;
  disponible_catalogo?: boolean;
  imagenes_urls?: string[];
  etiqueta_nombre?: string;
  etiqueta_color?: string;
  controlar_stock?: boolean;
  requiere_salsas?: boolean;
  min_salsas?: number;
  max_salsas?: number;
  aplicar_gastos_fijos?: boolean;
  porcentaje_gastos_fijos?: number;
  categoria?: {
    nombre: string;
  };
}

export interface StockMovement {
  producto_id: number;
  cantidad: number;
  tipo_movimiento: string;
  motivo?: string;
}

interface ProductosState {
  productos: Producto[];
  categorias: Categoria[];
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Product actions
  fetchProductos: () => Promise<void>;
  fetchProductosConStock: () => Promise<any[]>;
  fetchCategorias: () => Promise<void>;
  createProducto: (producto: Producto) => Promise<void>;
  updateProducto: (id: number, producto: Partial<Producto>) => Promise<void>;
  deleteProducto: (id: number) => Promise<void>;
  toggleProductoActivo: (id: number, activo: boolean) => Promise<void>;
  
  // Category actions
  createCategoria: (categoria: Omit<Categoria, 'id'>) => Promise<void>;
  updateCategoria: (id: number, categoria: Partial<Categoria>) => Promise<void>;
  deleteCategoria: (id: number) => Promise<void>;
  
  // Stock movement actions
  createStockMovement: (movement: StockMovement) => Promise<void>;
}

export const useProductosStore = create<ProductosState>((set, get) => ({
  productos: [],
  categorias: [],
  isLoading: false,
  isSubmitting: false,

  fetchProductos: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categoria:categorias(nombre, active)
        `)
        .order('nombre');

      if (error) throw error;
      set({ productos: data || [] });
    } catch (error: any) {
      console.error('Error fetching productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProductosConStock: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categoria:categorias(nombre)
        `)
        .eq('controlar_stock', true)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching productos con stock:', error);
      toast.error('Error al cargar productos con stock');
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategorias: async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre');

      if (error) throw error;
      set({ categorias: data || [] });
    } catch (error: any) {
      console.error('Error fetching categorias:', error);
      toast.error('Error al cargar categorías');
    }
  },

  createProducto: async (producto) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([producto])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh productos list
      await get().fetchProductos();
      toast.success('Producto creado exitosamente');
    } catch (error: any) {
      console.error('Error creating producto:', error);
      toast.error('Error al crear producto');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateProducto: async (id, updates) => {
    set({ isSubmitting: true });
    try {
      // Remove the categoria object from updates to avoid database error
      const { categoria, ...restOfUpdates } = updates;
      
      const { error } = await supabase
        .from('productos')
        .update(restOfUpdates)
        .eq('id', id);

      if (error) throw error;
      
      // Refresh productos list
      await get().fetchProductos();
      toast.success('Producto actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating producto:', error);
      toast.error('Error al actualizar producto');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteProducto: async (id) => {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh productos list
      await get().fetchProductos();
      toast.success('Producto eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting producto:', error);
      toast.error('Error al eliminar producto');
      throw error;
    }
  },

  toggleProductoActivo: async (id, activo) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      set(state => ({
        productos: state.productos.map(p => 
          p.id === id ? { ...p, activo } : p
        )
      }));
      
      toast.success(`Producto ${activo ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error: any) {
      console.error('Error toggling producto:', error);
      toast.error('Error al cambiar estado del producto');
    }
  },

  // Category management functions
  createCategoria: async (categoria) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([categoria])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh categorias list
      await get().fetchCategorias();
      toast.success('Categoría creada exitosamente');
    } catch (error: any) {
      console.error('Error creating categoria:', error);
      toast.error('Error al crear categoría');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateCategoria: async (id, updates) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('categorias')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Refresh categorias list
      await get().fetchCategorias();
      toast.success('Categoría actualizada exitosamente');
    } catch (error: any) {
      console.error('Error updating categoria:', error);
      toast.error('Error al actualizar categoría');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteCategoria: async (id) => {
    try {
      // First check if there are products using this category
      const { data: productos, error: checkError } = await supabase
        .from('productos')
        .select('id')
        .eq('categoria_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (productos && productos.length > 0) {
        toast.error('No se puede eliminar la categoría porque tiene productos asociados');
        return;
      }

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh categorias list
      await get().fetchCategorias();
      toast.success('Categoría eliminada exitosamente');
    } catch (error: any) {
      console.error('Error deleting categoria:', error);
      toast.error('Error al eliminar categoría');
      throw error;
    }
  },

  // Stock movement functions
  createStockMovement: async (movement) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('movimientos_stock')
        .insert([movement])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh productos list to get updated stock
      await get().fetchProductos();
      toast.success('Movimiento de stock registrado exitosamente');
    } catch (error: any) {
      console.error('Error creating stock movement:', error);
      toast.error('Error al registrar movimiento de stock');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));