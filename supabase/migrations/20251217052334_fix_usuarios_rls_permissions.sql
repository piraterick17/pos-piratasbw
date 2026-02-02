/*
  # Fix Usuarios RLS Permissions
  
  ## Summary
  Updates RLS policies on the usuarios table to accept both the generic 'usuarios.gestionar' 
  permission and the specific granular permissions. This ensures backward compatibility with 
  existing roles that have the generic permission.
  
  ## Changes Made
  
  ### Updated RLS Policies
  - **SELECT Policy**: Accept 'usuarios.gestionar' OR 'usuarios.ver'
  - **INSERT Policy**: Accept 'usuarios.gestionar' OR 'usuarios.crear'
  - **UPDATE Policy**: Accept 'usuarios.gestionar' OR 'usuarios.editar'
  - **DELETE Policy**: Accept 'usuarios.gestionar' OR 'usuarios.eliminar'
  
  ### usuario_roles Table Policies
  - **ALL Policy**: Accept 'usuarios.gestionar' OR 'usuarios.asignar_roles'
  
  ## Security Notes
  
  - Maintains strict permission checks
  - Supports both granular and general permissions
  - Users still need authentication
  - All checks verify active roles
*/

-- ============================================================
-- UPDATE USUARIOS TABLE RLS POLICIES
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Usuarios con permiso pueden ver todos los usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden crear usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden editar usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden eliminar usuarios" ON usuarios;

-- SELECT: View all users
CREATE POLICY "Usuarios con permiso pueden ver todos los usuarios"
ON usuarios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.ver', 'usuarios.gestionar')
  )
);

-- INSERT: Create users
CREATE POLICY "Usuarios con permiso pueden crear usuarios"
ON usuarios
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.crear', 'usuarios.gestionar')
  )
);

-- UPDATE: Edit users
CREATE POLICY "Usuarios con permiso pueden editar usuarios"
ON usuarios
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.editar', 'usuarios.gestionar')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.editar', 'usuarios.gestionar')
  )
);

-- DELETE: Delete users
CREATE POLICY "Usuarios con permiso pueden eliminar usuarios"
ON usuarios
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.eliminar', 'usuarios.gestionar')
  )
);

-- ============================================================
-- UPDATE USUARIO_ROLES TABLE RLS POLICIES
-- ============================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Solo usuarios con permiso pueden asignar roles" ON usuario_roles;

-- ALL: Assign roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Solo usuarios con permiso pueden asignar roles"
ON usuario_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.asignar_roles', 'usuarios.gestionar')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.asignar_roles', 'usuarios.gestionar')
  )
);

-- ============================================================
-- UPDATE AUDITORIA_USUARIOS TABLE RLS POLICIES
-- ============================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Usuarios con permiso pueden ver toda la auditoría" ON auditoria_usuarios;

-- SELECT: View all audit logs
CREATE POLICY "Usuarios con permiso pueden ver toda la auditoría"
ON auditoria_usuarios
FOR SELECT
TO authenticated
USING (
  usuario_afectado_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre IN ('usuarios.ver_auditoria', 'usuarios.gestionar')
  )
);
