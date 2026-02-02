import { create } from 'zustand';
import { supabase } from '../supabase/client';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  rol_id: string | null;
  insert_date: string;
  insert_by_user: string | null;
  updated_at: string | null;
  updated_by_user: string | null;
  roles?: UsuarioRol[];
}

export interface UsuarioRol {
  usuario_id: string;
  rol_id: string;
  asignado_por: string | null;
  fecha_asignacion: string;
  activo: boolean;
  rol?: {
    id: string;
    nombre: string;
    descripcion: string | null;
  };
}

export interface AuditoriaUsuario {
  id: string;
  usuario_afectado_id: string | null;
  usuario_ejecutor_id: string | null;
  accion: 'crear' | 'editar' | 'eliminar' | 'activar' | 'desactivar' | 'asignar_rol' | 'remover_rol';
  datos_anteriores: any;
  datos_nuevos: any;
  ip_address: string | null;
  user_agent: string | null;
  fecha: string;
  usuario_afectado?: {
    nombre: string;
    email: string;
  };
  usuario_ejecutor?: {
    email: string;
  };
}

export interface EstadisticasUsuarios {
  usuarios_activos: number;
  usuarios_inactivos: number;
  total_usuarios: number;
  roles_en_uso: number;
  usuarios_nuevos_mes: number;
}

interface UsuariosStore {
  usuarios: Usuario[];
  loading: boolean;
  error: string | null;
  estadisticas: EstadisticasUsuarios | null;
  auditoriaLogs: AuditoriaUsuario[];

  fetchUsuarios: () => Promise<void>;
  fetchUsuarioById: (id: string) => Promise<Usuario | null>;
  fetchEstadisticas: () => Promise<void>;
  fetchAuditoriaLogs: (usuarioId?: string) => Promise<void>;
  createUsuario: (usuario: Partial<Usuario>) => Promise<string | null>;
  updateUsuario: (id: string, updates: Partial<Usuario>) => Promise<void>;
  deleteUsuario: (id: string) => Promise<void>;
  toggleUsuarioActivo: (id: string, activo: boolean) => Promise<void>;

  // Role management
  asignarRol: (usuarioId: string, rolId: string) => Promise<void>;
  removerRol: (usuarioId: string, rolId: string) => Promise<void>;
  fetchUsuarioRoles: (usuarioId: string) => Promise<UsuarioRol[]>;

  // Permission check
  verificarPermiso: (usuarioId: string, permisoNombre: string) => Promise<boolean>;
}

export const useUsuariosStore = create<UsuariosStore>((set, get) => ({
  usuarios: [],
  loading: false,
  error: null,
  estadisticas: null,
  auditoriaLogs: [],

  fetchUsuarios: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          roles:usuario_roles!usuario_roles_usuario_id_fkey(
            usuario_id,
            rol_id,
            asignado_por,
            fecha_asignacion,
            activo,
            rol:roles(id, nombre, descripcion)
          )
        `)
        .order('nombre');

      if (error) throw error;

      set({ usuarios: data || [], loading: false });
    } catch (error: any) {
      console.error('Error fetching usuarios:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchUsuarioById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          roles:usuario_roles!usuario_roles_usuario_id_fkey(
            usuario_id,
            rol_id,
            asignado_por,
            fecha_asignacion,
            activo,
            rol:roles(id, nombre, descripcion)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error fetching usuario:', error);
      return null;
    }
  },

  fetchEstadisticas: async () => {
    try {
      const { data, error } = await supabase
        .from('vista_estadisticas_usuarios')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      set({ estadisticas: data });
    } catch (error: any) {
      console.error('Error fetching estadísticas:', error);
    }
  },

  fetchAuditoriaLogs: async (usuarioId?: string) => {
    try {
      let query = supabase
        .from('auditoria_usuarios')
        .select(`
          *,
          usuario_afectado:usuarios!auditoria_usuarios_usuario_afectado_id_fkey(nombre, email)
        `)
        .order('fecha', { ascending: false })
        .limit(100);

      if (usuarioId) {
        query = query.eq('usuario_afectado_id', usuarioId);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ auditoriaLogs: data || [] });
    } catch (error: any) {
      console.error('Error fetching auditoría:', error);
    }
  },

  createUsuario: async (usuario: Partial<Usuario & { password?: string }>) => {
    set({ loading: true, error: null });
    try {
      if (!usuario.email || !usuario.password || !usuario.nombre) {
        throw new Error('Email, password y nombre son requeridos');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/create-user`;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const requestBody = {
        email: usuario.email,
        password: usuario.password,
        nombre: usuario.nombre,
        activo: usuario.activo ?? true,
        roles: usuario.roles || [],
      };

      console.log('Calling Edge Function to create user:', { email: usuario.email, nombre: usuario.nombre });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear usuario');
      }

      const result = await response.json();
      console.log('User created successfully:', result);

      await get().fetchUsuarios();
      set({ loading: false });

      return result.usuario_id;
    } catch (error: any) {
      console.error('Error creating usuario:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateUsuario: async (id: string, updates: Partial<Usuario>) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: updates.nombre,
          email: updates.email,
          activo: updates.activo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await get().fetchUsuarios();
      set({ loading: false });
    } catch (error: any) {
      console.error('Error updating usuario:', error);
      set({ error: error.message, loading: false });
    }
  },

  deleteUsuario: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchUsuarios();
      set({ loading: false });
    } catch (error: any) {
      console.error('Error deleting usuario:', error);
      set({ error: error.message, loading: false });
    }
  },

  toggleUsuarioActivo: async (id: string, activo: boolean) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          activo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await get().fetchUsuarios();
      set({ loading: false });
    } catch (error: any) {
      console.error('Error toggling usuario activo:', error);
      set({ error: error.message, loading: false });
    }
  },

  asignarRol: async (usuarioId: string, rolId: string) => {
    try {
      const { error } = await supabase
        .from('usuario_roles')
        .upsert({
          usuario_id: usuarioId,
          rol_id: rolId,
          activo: true,
        }, {
          onConflict: 'usuario_id,rol_id'
        });

      if (error) throw error;

      await get().fetchUsuarios();
    } catch (error: any) {
      console.error('Error asignando rol:', error);
      throw error;
    }
  },

  removerRol: async (usuarioId: string, rolId: string) => {
    try {
      const { error } = await supabase
        .from('usuario_roles')
        .update({ activo: false })
        .eq('usuario_id', usuarioId)
        .eq('rol_id', rolId);

      if (error) throw error;

      await get().fetchUsuarios();
    } catch (error: any) {
      console.error('Error removiendo rol:', error);
      throw error;
    }
  },

  fetchUsuarioRoles: async (usuarioId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuario_roles')
        .select(`
          *,
          rol:roles(id, nombre, descripcion)
        `)
        .eq('usuario_id', usuarioId)
        .eq('activo', true);

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching usuario roles:', error);
      return [];
    }
  },

  verificarPermiso: async (usuarioId: string, permisoNombre: string) => {
    try {
      const { data, error } = await supabase
        .rpc('verificar_permiso_usuario', {
          usuario_uuid: usuarioId,
          permiso_nombre: permisoNombre
        });

      if (error) throw error;

      return data || false;
    } catch (error: any) {
      console.error('Error verificando permiso:', error);
      return false;
    }
  },
}));
