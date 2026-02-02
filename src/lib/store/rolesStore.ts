import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface Permiso {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  permisos?: Permiso[];
}

interface RolesState {
  roles: Rol[];
  permisos: Permiso[];
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Roles actions
  fetchRolesConPermisos: () => Promise<void>;
  fetchPermisosDisponibles: () => Promise<void>;
  createRol: (nombre: string, descripcion?: string) => Promise<void>;
  updateRol: (id: string, nombre: string, descripcion?: string) => Promise<void>;
  deleteRol: (id: string) => Promise<void>;
  
  // Permisos actions
  updateRolPermisos: (rolId: string, permisosIds: string[]) => Promise<void>;
}

export const useRolesStore = create<RolesState>((set, get) => ({
  roles: [],
  permisos: [],
  isLoading: false,
  isSubmitting: false,

  fetchRolesConPermisos: async () => {
    set({ isLoading: true });
    try {
      // Primero obtenemos todos los roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('nombre');

      if (rolesError) throw rolesError;

      // Para cada rol, obtenemos sus permisos
      const rolesConPermisos = await Promise.all(
        roles.map(async (rol) => {
          const { data: permisos, error: permisosError } = await supabase
            .from('rol_permisos')
            .select(`
              permiso:permisos(id, nombre, descripcion)
            `)
            .eq('rol_id', rol.id);

          if (permisosError) throw permisosError;

          return {
            ...rol,
            permisos: permisos.map(p => p.permiso)
          };
        })
      );

      set({ roles: rolesConPermisos });
    } catch (error: any) {
      console.error('Error fetching roles con permisos:', error);
      toast.error('Error al cargar roles y permisos');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPermisosDisponibles: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('permisos')
        .select('*')
        .order('nombre');

      if (error) throw error;
      set({ permisos: data || [] });
    } catch (error: any) {
      console.error('Error fetching permisos:', error);
      toast.error('Error al cargar permisos disponibles');
    } finally {
      set({ isLoading: false });
    }
  },

  createRol: async (nombre, descripcion) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{ nombre, descripcion }])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh roles list
      await get().fetchRolesConPermisos();
      toast.success('Rol creado exitosamente');
    } catch (error: any) {
      console.error('Error creating rol:', error);
      toast.error('Error al crear rol');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateRol: async (id, nombre, descripcion) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('roles')
        .update({ nombre, descripcion })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh roles list
      await get().fetchRolesConPermisos();
      toast.success('Rol actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating rol:', error);
      toast.error('Error al actualizar rol');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteRol: async (id) => {
    try {
      // Primero verificar si hay usuarios con este rol
      const { data: usuarios, error: checkError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('rol_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (usuarios && usuarios.length > 0) {
        toast.error('No se puede eliminar el rol porque hay usuarios asignados a él');
        return;
      }

      // Eliminar los permisos asociados al rol
      const { error: permisosError } = await supabase
        .from('rol_permisos')
        .delete()
        .eq('rol_id', id);

      if (permisosError) throw permisosError;

      // Eliminar el rol
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh roles list
      await get().fetchRolesConPermisos();
      toast.success('Rol eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting rol:', error);
      toast.error('Error al eliminar rol');
      throw error;
    }
  },

  updateRolPermisos: async (rolId, permisosIds) => {
    set({ isSubmitting: true });
    try {
      // Primero eliminamos todos los permisos actuales del rol
      const { error: deleteError } = await supabase
        .from('rol_permisos')
        .delete()
        .eq('rol_id', rolId);

      if (deleteError) throw deleteError;

      // Si hay permisos seleccionados, los insertamos
      if (permisosIds.length > 0) {
        const permisosToInsert = permisosIds.map(permisoId => ({
          rol_id: rolId,
          permiso_id: permisoId
        }));

        const { error: insertError } = await supabase
          .from('rol_permisos')
          .insert(permisosToInsert);

        if (insertError) throw insertError;
      }
      
      // Refresh roles list
      await get().fetchRolesConPermisos();
      toast.success('Permisos actualizados exitosamente');
    } catch (error: any) {
      console.error('Error updating rol permisos:', error);
      toast.error('Error al actualizar permisos');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  }
}));