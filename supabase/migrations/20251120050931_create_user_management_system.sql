/*
  # User Management System with Multi-Role Support

  ## Overview
  Creates a comprehensive user management system with support for multiple roles per user,
  detailed permissions, and audit logging.

  ## 1. New Tables
  
  ### usuario_roles (many-to-many relationship)
    - `usuario_id` (uuid, FK to usuarios) - User reference
    - `rol_id` (uuid, FK to roles) - Role reference
    - `asignado_por` (uuid, FK to usuarios) - Who assigned this role
    - `fecha_asignacion` (timestamptz) - When the role was assigned
    - `activo` (boolean) - Whether this role assignment is active
    
  ### auditoria_usuarios (audit log)
    - `id` (uuid, PK) - Unique identifier
    - `usuario_afectado_id` (uuid, FK to usuarios) - User who was affected
    - `usuario_ejecutor_id` (uuid, FK to auth.users) - User who performed the action
    - `accion` (text) - Type of action (crear, editar, eliminar, activar, desactivar, asignar_rol, remover_rol)
    - `datos_anteriores` (jsonb) - Previous data state
    - `datos_nuevos` (jsonb) - New data state
    - `ip_address` (text) - IP address of the executor
    - `user_agent` (text) - User agent string
    - `fecha` (timestamptz) - Timestamp of action

  ## 2. New Permissions
  
  Creates comprehensive permissions for user management:
    - usuarios.ver - View users
    - usuarios.crear - Create new users
    - usuarios.editar - Edit user details
    - usuarios.eliminar - Delete users
    - usuarios.activar_desactivar - Enable/disable users
    - usuarios.asignar_roles - Assign roles to users
    - usuarios.ver_auditoria - View audit logs
    - roles.gestionar - Manage roles and permissions
  
  ## 3. Data Migration
  
  - Migrates existing single-role assignments from usuarios.rol_id to usuario_roles table
  - Preserves all existing role assignments
  - Marks all migrated assignments as active
  
  ## 4. Security (RLS Policies)
  
  ### usuario_roles table
    - Authenticated users can view role assignments
    - Only users with 'usuarios.asignar_roles' permission can modify
    
  ### auditoria_usuarios table
    - Authenticated users can view their own audit entries
    - Only users with 'usuarios.ver_auditoria' permission can view all entries
    - Entries are immutable once created
  
  ## 5. Functions
  
  ### verificar_permiso_usuario(usuario_uuid, permiso_nombre)
    - Checks if a user has a specific permission through any of their active roles
    - Returns boolean
    - Optimized with proper indexes
  
  ### registrar_auditoria_usuario()
    - Trigger function to automatically log user changes
    - Captures INSERT, UPDATE, DELETE operations
    - Stores before/after snapshots of data
  
  ## 6. Triggers
  
  - `trigger_auditoria_usuarios` - Automatically logs all changes to usuarios table
  
  ## 7. Indexes
  
  Performance indexes for:
    - Usuario-role lookups
    - Permission checks
    - Audit log queries
    - User searches
  
  ## Security Notes
  
  - All tables have RLS enabled
  - Permission checks are role-based and support multiple roles
  - Audit trail is immutable and comprehensive
  - Sensitive operations require specific permissions
*/

-- ============================================================
-- CREATE MISSING PERMISSIONS
-- ============================================================

-- User management permissions
INSERT INTO permisos (nombre, descripcion) VALUES
  ('usuarios.ver', 'Ver lista de usuarios y sus detalles'),
  ('usuarios.crear', 'Crear nuevos usuarios en el sistema'),
  ('usuarios.editar', 'Editar información de usuarios existentes'),
  ('usuarios.eliminar', 'Eliminar usuarios del sistema'),
  ('usuarios.activar_desactivar', 'Activar o desactivar usuarios'),
  ('usuarios.asignar_roles', 'Asignar y remover roles de usuarios'),
  ('usuarios.ver_auditoria', 'Ver registros de auditoría de cambios en usuarios'),
  ('roles.gestionar', 'Gestionar roles y permisos del sistema')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- CREATE USUARIO_ROLES TABLE (Many-to-Many)
-- ============================================================

CREATE TABLE IF NOT EXISTS usuario_roles (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  asignado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_asignacion timestamptz NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true,
  PRIMARY KEY (usuario_id, rol_id)
);

ALTER TABLE usuario_roles ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usuario_roles_usuario ON usuario_roles(usuario_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_usuario_roles_rol ON usuario_roles(rol_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_usuario_roles_activo ON usuario_roles(activo);

-- RLS Policies for usuario_roles
CREATE POLICY "Usuarios autenticados pueden ver asignaciones de roles"
ON usuario_roles
FOR SELECT
TO authenticated
USING (true);

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
      AND p.nombre = 'usuarios.asignar_roles'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre = 'usuarios.asignar_roles'
  )
);

-- ============================================================
-- CREATE AUDIT LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_afectado_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_ejecutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accion text NOT NULL CHECK (accion IN ('crear', 'editar', 'eliminar', 'activar', 'desactivar', 'asignar_rol', 'remover_rol')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  ip_address text,
  user_agent text,
  fecha timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auditoria_usuarios ENABLE ROW LEVEL SECURITY;

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_afectado ON auditoria_usuarios(usuario_afectado_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_ejecutor ON auditoria_usuarios(usuario_ejecutor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_fecha ON auditoria_usuarios(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_accion ON auditoria_usuarios(accion);

-- RLS Policies for auditoria_usuarios
CREATE POLICY "Usuarios pueden ver su propia auditoría"
ON auditoria_usuarios
FOR SELECT
TO authenticated
USING (usuario_afectado_id = (SELECT auth.uid()));

CREATE POLICY "Usuarios con permiso pueden ver toda la auditoría"
ON auditoria_usuarios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre = 'usuarios.ver_auditoria'
  )
);

-- Audit entries are immutable - only inserts allowed
CREATE POLICY "Sistema puede crear entradas de auditoría"
ON auditoria_usuarios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- MIGRATE EXISTING DATA
-- ============================================================

-- Migrate existing single-role assignments to usuario_roles table
INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por, fecha_asignacion, activo)
SELECT 
  u.id,
  u.rol_id,
  u.insert_by_user,
  u.insert_date,
  u.activo
FROM usuarios u
WHERE u.rol_id IS NOT NULL
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- ============================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION verificar_permiso_usuario(
  usuario_uuid uuid,
  permiso_nombre text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM usuario_roles ur
    JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = usuario_uuid
      AND ur.activo = true
      AND p.nombre = permiso_nombre
  );
END;
$$;

-- Function to get all user permissions (for UI display)
CREATE OR REPLACE FUNCTION obtener_permisos_usuario(usuario_uuid uuid)
RETURNS TABLE (
  permiso_nombre text,
  permiso_descripcion text,
  rol_nombre text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.nombre,
    p.descripcion,
    r.nombre
  FROM usuario_roles ur
  JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
  JOIN permisos p ON p.id = rp.permiso_id
  JOIN roles r ON r.id = ur.rol_id
  WHERE ur.usuario_id = usuario_uuid
    AND ur.activo = true
  ORDER BY p.nombre;
END;
$$;

-- ============================================================
-- CREATE AUDIT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_auditoria_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  accion_tipo text;
  datos_old jsonb;
  datos_new jsonb;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    accion_tipo := 'crear';
    datos_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.activo = true AND NEW.activo = false THEN
      accion_tipo := 'desactivar';
    ELSIF OLD.activo = false AND NEW.activo = true THEN
      accion_tipo := 'activar';
    ELSE
      accion_tipo := 'editar';
    END IF;
    datos_old := to_jsonb(OLD);
    datos_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    accion_tipo := 'eliminar';
    datos_old := to_jsonb(OLD);
  END IF;

  -- Insert audit record
  INSERT INTO auditoria_usuarios (
    usuario_afectado_id,
    usuario_ejecutor_id,
    accion,
    datos_anteriores,
    datos_nuevos,
    fecha
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    accion_tipo,
    datos_old,
    datos_new,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to usuarios table
DROP TRIGGER IF EXISTS trigger_auditoria_usuarios ON usuarios;
CREATE TRIGGER trigger_auditoria_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION registrar_auditoria_usuario();

-- ============================================================
-- ASSIGN DEFAULT PERMISSIONS TO ROLES
-- ============================================================

-- Admin role gets all user management permissions
DO $$
DECLARE
  admin_rol_id uuid;
BEGIN
  -- Get admin role ID
  SELECT id INTO admin_rol_id FROM roles WHERE nombre = 'Administrador' LIMIT 1;
  
  IF admin_rol_id IS NOT NULL THEN
    -- Assign all user management permissions to admin
    INSERT INTO rol_permisos (rol_id, permiso_id)
    SELECT admin_rol_id, p.id
    FROM permisos p
    WHERE p.nombre IN (
      'usuarios.ver',
      'usuarios.crear',
      'usuarios.editar',
      'usuarios.eliminar',
      'usuarios.activar_desactivar',
      'usuarios.asignar_roles',
      'usuarios.ver_auditoria',
      'roles.gestionar'
    )
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
  END IF;
END;
$$;

-- ============================================================
-- UPDATE USUARIOS TABLE RLS POLICIES
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Usuarios pueden ver/editar su propia info" ON usuarios;

-- New policies based on permissions
CREATE POLICY "Usuarios autenticados pueden ver su propia info"
ON usuarios
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

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
      AND p.nombre = 'usuarios.ver'
  )
);

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
      AND p.nombre = 'usuarios.crear'
  )
);

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
      AND p.nombre = 'usuarios.editar'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rol_permisos rp
    JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
    JOIN permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = (SELECT auth.uid())
      AND ur.activo = true
      AND p.nombre = 'usuarios.editar'
  )
);

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
      AND p.nombre = 'usuarios.eliminar'
  )
);

-- ============================================================
-- ADD USEFUL VIEWS
-- ============================================================

-- View to easily see users with their roles
CREATE OR REPLACE VIEW vista_usuarios_roles AS
SELECT 
  u.id AS usuario_id,
  u.nombre AS usuario_nombre,
  u.email AS usuario_email,
  u.activo AS usuario_activo,
  r.id AS rol_id,
  r.nombre AS rol_nombre,
  ur.fecha_asignacion,
  ur.activo AS asignacion_activa
FROM usuarios u
LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON r.id = ur.rol_id
ORDER BY u.nombre, r.nombre;

-- View for user statistics
CREATE OR REPLACE VIEW vista_estadisticas_usuarios AS
SELECT 
  COUNT(*) FILTER (WHERE u.activo = true) AS usuarios_activos,
  COUNT(*) FILTER (WHERE u.activo = false) AS usuarios_inactivos,
  COUNT(*) AS total_usuarios,
  COUNT(DISTINCT ur.rol_id) AS roles_en_uso,
  COUNT(*) FILTER (WHERE u.insert_date > now() - interval '30 days') AS usuarios_nuevos_mes
FROM usuarios u
LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id AND ur.activo = true;