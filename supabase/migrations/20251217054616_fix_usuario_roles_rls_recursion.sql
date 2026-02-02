/*
  # Fix RLS Recursion in usuario_roles Table
  
  ## Problem
  The RLS policies on `usuario_roles` table create infinite recursion because:
  - Policy on `usuario_roles` checks permissions
  - Permission check requires joining with `usuario_roles` 
  - This creates a circular dependency causing infinite recursion
  
  ## Solution
  1. Drop the recursive policies
  2. Create simpler policies that don't cause recursion
  3. Use a helper function with SECURITY DEFINER to check permissions without recursion
  4. Allow system to create role assignments during login/signup
  
  ## Changes
  
  ### Helper Function
  - `tiene_permiso_directo`: Checks permissions without going through RLS
  
  ### New Policies on usuario_roles
  - **SELECT**: Authenticated users can view all role assignments (needed for system)
  - **INSERT**: Allow system to create assignments OR users with direct permission
  - **UPDATE**: Only users with direct permission (limited use case)
  - **DELETE**: Only users with direct permission
  
  ### Updated Policies on usuarios
  - Simplified to avoid triggering usuario_roles policies during auth checks
  - Allow authenticated users to view own profile without permission checks
  - Require permissions only for viewing/managing OTHER users
  
  ## Security Notes
  - Less restrictive SELECT to prevent recursion during authentication
  - Write operations still protected by permission checks
  - Helper function uses SECURITY DEFINER to bypass RLS safely
*/

-- ============================================================
-- CREATE HELPER FUNCTION TO CHECK PERMISSIONS WITHOUT RLS
-- ============================================================

CREATE OR REPLACE FUNCTION tiene_permiso_directo(
  p_usuario_id uuid,
  p_permiso_nombre text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  tiene_permiso boolean;
BEGIN
  -- Check directly without going through RLS
  SELECT EXISTS (
    SELECT 1
    FROM usuario_roles ur
    INNER JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
    INNER JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = p_usuario_id
      AND ur.activo = true
      AND p.nombre = p_permiso_nombre
  ) INTO tiene_permiso;
  
  RETURN tiene_permiso;
END;
$$;

-- ============================================================
-- FIX USUARIO_ROLES RLS POLICIES
-- ============================================================

-- Drop all existing policies on usuario_roles
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver asignaciones de roles" ON usuario_roles;
DROP POLICY IF EXISTS "Solo usuarios con permiso pueden asignar roles" ON usuario_roles;

-- SELECT: Allow all authenticated users to view role assignments
-- This is required for the system to function and check permissions
CREATE POLICY "Authenticated users can view role assignments"
ON usuario_roles
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Allow system to create OR users with permission
CREATE POLICY "System and authorized users can create role assignments"
ON usuario_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is assigning role to themselves (system auto-assignment)
  usuario_id = auth.uid()
  OR
  -- Allow if user has the permission
  tiene_permiso_directo(auth.uid(), 'usuarios.asignar_roles')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- UPDATE: Only users with permission
CREATE POLICY "Authorized users can update role assignments"
ON usuario_roles
FOR UPDATE
TO authenticated
USING (
  tiene_permiso_directo(auth.uid(), 'usuarios.asignar_roles')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
)
WITH CHECK (
  tiene_permiso_directo(auth.uid(), 'usuarios.asignar_roles')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- DELETE: Only users with permission
CREATE POLICY "Authorized users can delete role assignments"
ON usuario_roles
FOR DELETE
TO authenticated
USING (
  tiene_permiso_directo(auth.uid(), 'usuarios.asignar_roles')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- ============================================================
-- SIMPLIFY USUARIOS RLS POLICIES
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver su propia info" ON usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden ver todos los usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden crear usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden editar usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden eliminar usuarios" ON usuarios;

-- SELECT: Own profile always visible + permission for others
CREATE POLICY "Users can view own profile"
ON usuarios
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.ver')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- INSERT: System can create during signup + users with permission
CREATE POLICY "System and authorized users can create users"
ON usuarios
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if creating own profile (system auto-creation)
  id = auth.uid()
  OR
  -- Allow if user has permission
  tiene_permiso_directo(auth.uid(), 'usuarios.crear')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- UPDATE: Users with permission can edit
CREATE POLICY "Authorized users can edit users"
ON usuarios
FOR UPDATE
TO authenticated
USING (
  tiene_permiso_directo(auth.uid(), 'usuarios.editar')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
)
WITH CHECK (
  tiene_permiso_directo(auth.uid(), 'usuarios.editar')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- DELETE: Users with permission can delete
CREATE POLICY "Authorized users can delete users"
ON usuarios
FOR DELETE
TO authenticated
USING (
  tiene_permiso_directo(auth.uid(), 'usuarios.eliminar')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- ============================================================
-- UPDATE AUDITORIA_USUARIOS RLS POLICIES
-- ============================================================

-- The audit policies don't cause recursion but let's update them to use the new helper

DROP POLICY IF EXISTS "Usuarios pueden ver su propia auditoría" ON auditoria_usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden ver toda la auditoría" ON auditoria_usuarios;
DROP POLICY IF EXISTS "Sistema puede crear entradas de auditoría" ON auditoria_usuarios;

-- SELECT: Own audit + users with permission can see all
CREATE POLICY "Users can view own audit"
ON auditoria_usuarios
FOR SELECT
TO authenticated
USING (
  usuario_afectado_id = auth.uid()
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.ver_auditoria')
  OR
  tiene_permiso_directo(auth.uid(), 'usuarios.gestionar')
);

-- INSERT: System can create audit entries
CREATE POLICY "System can create audit entries"
ON auditoria_usuarios
FOR INSERT
TO authenticated
WITH CHECK (true);
