import { useEffect, useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { supabase } from '../supabase/client';

interface Permiso {
  nombre: string;
  descripcion?: string;
}

interface UsePermissionsReturn {
  permisos: string[];
  hasPermission: (permiso: string) => boolean;
  hasAnyPermission: (permisos: string[]) => boolean;
  hasAllPermissions: (permisos: string[]) => boolean;
  isLoading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useUserStore();
  const [permisos, setPermisos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermisos = async () => {
      if (!user?.id) {
        setPermisos([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: usuarioRoles, error: rolesError } = await supabase
          .from('usuario_roles')
          .select(`
            rol_id,
            activo
          `)
          .eq('usuario_id', user.id)
          .eq('activo', true);

        if (rolesError) throw rolesError;

        if (!usuarioRoles || usuarioRoles.length === 0) {
          setPermisos([]);
          setIsLoading(false);
          return;
        }

        const rolIds = usuarioRoles.map(ur => ur.rol_id);

        const { data: rolPermisos, error: permisosError } = await supabase
          .from('rol_permisos')
          .select(`
            permiso:permisos(nombre, descripcion)
          `)
          .in('rol_id', rolIds);

        if (permisosError) throw permisosError;

        const uniquePermisos = new Set<string>();
        rolPermisos?.forEach((rp: any) => {
          if (rp.permiso?.nombre) {
            uniquePermisos.add(rp.permiso.nombre);
          }
        });

        setPermisos(Array.from(uniquePermisos));
      } catch (error) {
        console.error('Error al cargar permisos:', error);
        setPermisos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermisos();
  }, [user?.id]);

  const hasPermission = (permiso: string): boolean => {
    return permisos.includes(permiso);
  };

  const hasAnyPermission = (permisosRequeridos: string[]): boolean => {
    return permisosRequeridos.some(p => permisos.includes(p));
  };

  const hasAllPermissions = (permisosRequeridos: string[]): boolean => {
    return permisosRequeridos.every(p => permisos.includes(p));
  };

  return {
    permisos,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
  };
}
