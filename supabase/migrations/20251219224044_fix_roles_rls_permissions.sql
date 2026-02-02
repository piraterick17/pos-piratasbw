/*
  # Fix RLS Policies for Roles Management

  ## Changes
  
  1. Helper Function
    - Creates `tiene_permiso` function to check if user has specific permission
    - Used by RLS policies for authorization
  
  2. Update RLS Policies for `roles` table
    - Allows users with `roles.gestionar` permission to:
      - UPDATE role name and description
      - INSERT new roles
    - Maintains SELECT access for authenticated users
    - DELETE remains restricted to service_role only
  
  3. Update RLS Policies for `rol_permisos` table
    - Allows users with `roles.gestionar` permission to:
      - INSERT new role-permission associations
      - DELETE role-permission associations
    - Maintains SELECT access for authenticated users
    - UPDATE not needed (table has no updatable fields)
  
  ## Security
  - Users need `roles.gestionar` permission to modify
  - Prevents unauthorized role modifications
  - Maintains data integrity
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Only service role can modify roles" ON roles;
DROP POLICY IF EXISTS "Only service role can modify rol_permisos" ON rol_permisos;

-- Create helper function to check if user has a specific permission
CREATE OR REPLACE FUNCTION tiene_permiso(permiso_nombre text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM usuario_roles ur
    JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = auth.uid()
      AND ur.activo = true
      AND p.nombre = permiso_nombre
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for roles table
CREATE POLICY "Users with roles.gestionar can update roles"
  ON roles
  FOR UPDATE
  TO authenticated
  USING (tiene_permiso('roles.gestionar'))
  WITH CHECK (tiene_permiso('roles.gestionar'));

CREATE POLICY "Users with roles.gestionar can insert roles"
  ON roles
  FOR INSERT
  TO authenticated
  WITH CHECK (tiene_permiso('roles.gestionar'));

CREATE POLICY "Service role can delete roles"
  ON roles
  FOR DELETE
  TO service_role
  USING (true);

-- RLS Policies for rol_permisos table
CREATE POLICY "Users with roles.gestionar can insert rol_permisos"
  ON rol_permisos
  FOR INSERT
  TO authenticated
  WITH CHECK (tiene_permiso('roles.gestionar'));

CREATE POLICY "Users with roles.gestionar can delete rol_permisos"
  ON rol_permisos
  FOR DELETE
  TO authenticated
  USING (tiene_permiso('roles.gestionar'));

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION tiene_permiso(text) TO authenticated;
