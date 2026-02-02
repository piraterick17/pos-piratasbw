/*
  # Fix RLS Policies for asignaciones_entrega

  ## Problema
  Las políticas RLS buscaban roles con nombres 'Administrador', 'Gerente', 'Staff'
  pero los roles reales son: 'admin', 'vendedor', 'Encargada', 'Repartidor'

  ## Cambios
  1. Eliminar políticas antiguas con nombres incorrectos
  2. Crear nuevas políticas con nombres correctos de roles
  3. Permitir que admin, vendedor y Encargada puedan:
     - Crear asignaciones (INSERT)
     - Ver todas las asignaciones (SELECT)
     - Actualizar asignaciones (UPDATE)
     - Eliminar asignaciones (DELETE)
  4. Repartidores pueden:
     - Ver sus propias asignaciones (SELECT)
     - Actualizar sus propias asignaciones (UPDATE)
*/

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Staff puede crear asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Staff puede ver todas las asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Staff puede actualizar asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Solo admin puede eliminar asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Repartidores ven sus asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Repartidores actualizan sus asignaciones" ON asignaciones_entrega;

-- Crear nuevas políticas con nombres correctos

-- SELECT: Staff puede ver todas las asignaciones
CREATE POLICY "Staff puede ver asignaciones"
  ON asignaciones_entrega
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre IN ('admin', 'vendedor', 'Encargada')
    )
  );

-- SELECT: Repartidores ven sus propias asignaciones
CREATE POLICY "Repartidores ven sus asignaciones"
  ON asignaciones_entrega
  FOR SELECT
  TO authenticated
  USING (
    repartidor_id = auth.uid()
  );

-- INSERT: Staff puede crear asignaciones
CREATE POLICY "Staff crea asignaciones"
  ON asignaciones_entrega
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre IN ('admin', 'vendedor', 'Encargada')
    )
  );

-- UPDATE: Staff puede actualizar todas las asignaciones
CREATE POLICY "Staff actualiza asignaciones"
  ON asignaciones_entrega
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre IN ('admin', 'vendedor', 'Encargada')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre IN ('admin', 'vendedor', 'Encargada')
    )
  );

-- UPDATE: Repartidores actualizan sus propias asignaciones
CREATE POLICY "Repartidores actualizan sus asignaciones"
  ON asignaciones_entrega
  FOR UPDATE
  TO authenticated
  USING (
    repartidor_id = auth.uid()
  )
  WITH CHECK (
    repartidor_id = auth.uid()
  );

-- DELETE: Solo admin puede eliminar asignaciones
CREATE POLICY "Admin elimina asignaciones"
  ON asignaciones_entrega
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre = 'admin'
    )
  );
