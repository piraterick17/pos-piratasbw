// src/lib/auth.ts
import { supabase } from './supabase/client';

export interface AppUser {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: string;
  activo: boolean;
  permisos?: string[];
}

// Función para iniciar sesión
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Verificar que el usuario existe en la tabla usuarios y está activo
  if (data.user) {
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('activo')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error verificando usuario:', userError);
    }

    // Si el usuario no existe en la tabla usuarios, lo creamos
    if (!usuario) {
      // Obtener rol por defecto
      const { data: defaultRole } = await supabase
        .from('roles')
        .select('id, nombre')
        .or('nombre.eq.Usuario,nombre.eq.Administrador')
        .limit(1)
        .maybeSingle();

      if (defaultRole) {
        // Crear usuario en tabla usuarios
        await supabase
          .from('usuarios')
          .insert({
            id: data.user.id,
            nombre: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Usuario',
            email: data.user.email,
            activo: true,
          });

        // Asignar rol en usuario_roles
        await supabase
          .from('usuario_roles')
          .insert({
            usuario_id: data.user.id,
            rol_id: defaultRole.id,
            activo: true
          });
      }
    } else if (usuario && !usuario.activo) {
      // Si el usuario existe pero está inactivo, cerrar sesión
      await supabase.auth.signOut();
      throw new Error('Tu cuenta está inactiva. Contacta al administrador.');
    }
  }

  return data;
}

// Función para registrar un nuevo usuario
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

// Función para cerrar sesión
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Función para solicitar restablecimiento de contraseña
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) throw error;
}

// Función para actualizar contraseña
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
}

export async function getOrCreateUserProfile(): Promise<AppUser | null> {
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return null;
  }

  const { data: appUser, error: userError } = await supabase
    .from('usuarios')
    .select('id, nombre, email, activo')
    .eq('id', authUser.id)
    .maybeSingle();

  if (appUser) {
    const { data: permisosData } = await supabase.rpc('obtener_permisos_usuario', {
      usuario_uuid: authUser.id
    });

    const permisos = permisosData?.map((p: any) => p.permiso_nombre) || [];

    const { data: userRoleData } = await supabase
      .from('usuario_roles')
      .select('rol:roles(nombre)')
      .eq('usuario_id', authUser.id)
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    const rol = userRoleData?.rol?.nombre || 'Usuario';

    return {
      id: appUser.id,
      nombre: appUser.nombre,
      email: appUser.email,
      activo: appUser.activo,
      rol,
      permisos
    };
  }

  if (!appUser) {
    const { data: defaultRole } = await supabase
      .from('roles')
      .select('id, nombre')
      .or('nombre.eq.Usuario,nombre.eq.Administrador')
      .limit(1)
      .maybeSingle();

    if (!defaultRole) {
      throw new Error("No se encontró un rol por defecto en el sistema.");
    }

    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        id: authUser.id,
        nombre: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
        email: authUser.email,
        activo: true,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('Error creating user:', insertError);
      throw insertError;
    }

    const { error: roleAssignError } = await supabase
      .from('usuario_roles')
      .insert({
        usuario_id: authUser.id,
        rol_id: defaultRole.id,
        activo: true
      });

    if (roleAssignError) {
      console.error('Error assigning default role:', roleAssignError);
    }

    const { data: permisosData } = await supabase.rpc('obtener_permisos_usuario', {
      usuario_uuid: authUser.id
    });

    const permisos = permisosData?.map((p: any) => p.permiso_nombre) || [];

    return {
      id: newUser.id,
      nombre: newUser.nombre,
      email: newUser.email,
      activo: newUser.activo,
      rol: defaultRole.nombre,
      permisos
    };
  }

  return null;
}