/*
  # Función para obtener roles con permisos

  1. Nuevas Funciones
    - `get_roles_con_permisos()`: Devuelve todos los roles con sus permisos asociados en formato JSON
  
  2. Optimización
    - Reduce múltiples consultas a una sola operación
    - Mejora el rendimiento de la página de gestión de roles
*/

CREATE OR REPLACE FUNCTION public.get_roles_con_permisos()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', r.id,
            'nombre', r.nombre,
            'descripcion', r.descripcion,
            'permisos', (
                SELECT COALESCE(json_agg(
                    json_build_object(
                        'id', p.id,
                        'nombre', p.nombre,
                        'descripcion', p.descripcion
                    )
                ), '[]'::json)
                FROM public.rol_permisos rp
                JOIN public.permisos p ON rp.permiso_id = p.id
                WHERE rp.rol_id = r.id
            )
        )
    )
    INTO result
    FROM public.roles r;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;