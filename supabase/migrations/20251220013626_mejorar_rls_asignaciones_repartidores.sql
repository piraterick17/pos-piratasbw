/*
  # Mejorar políticas RLS para asignaciones de entrega
  
  1. Eliminación de Políticas Antiguas
    - Se eliminan las políticas muy permisivas que permitían a todos los autenticados ver/modificar todo
  
  2. Nuevas Políticas Restrictivas
    - **Para Staff/Admin**: Pueden ver y gestionar todas las asignaciones
    - **Para Repartidores**: Solo pueden ver y actualizar sus propias asignaciones
  
  3. Seguridad Mejorada
    - Los repartidores solo ven entregas asignadas a ellos (basado en usuario_id del repartidor)
    - Staff puede ver y asignar todas las entregas
    - Repartidores no pueden crear nuevas asignaciones
    - Repartidores no pueden eliminar asignaciones
*/

-- Eliminar políticas antiguas muy permisivas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar asignaciones" ON asignaciones_entrega;

-- =============================================
-- POLÍTICAS PARA SELECT (Ver asignaciones)
-- =============================================

-- Staff y administradores pueden ver todas las asignaciones
CREATE POLICY "Staff puede ver todas las asignaciones"
  ON asignaciones_entrega FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuario_roles ur
      INNER JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND r.nombre IN ('Administrador', 'Gerente', 'Staff')
    )
  );

-- Repartidores solo pueden ver sus propias asignaciones
CREATE POLICY "Repartidores ven sus asignaciones"
  ON asignaciones_entrega FOR SELECT
  TO authenticated
  USING (
    repartidor_id IN (
      SELECT id FROM repartidores
      WHERE usuario_id = auth.uid()
    )
  );

-- =============================================
-- POLÍTICAS PARA INSERT (Crear asignaciones)
-- =============================================

-- Solo staff puede crear asignaciones manualmente (aunque normalmente las crea el trigger)
CREATE POLICY "Staff puede crear asignaciones"
  ON asignaciones_entrega FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_roles ur
      INNER JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND r.nombre IN ('Administrador', 'Gerente', 'Staff')
    )
  );

-- =============================================
-- POLÍTICAS PARA UPDATE (Actualizar asignaciones)
-- =============================================

-- Staff puede actualizar cualquier asignación
CREATE POLICY "Staff puede actualizar asignaciones"
  ON asignaciones_entrega FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuario_roles ur
      INNER JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND r.nombre IN ('Administrador', 'Gerente', 'Staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_roles ur
      INNER JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND r.nombre IN ('Administrador', 'Gerente', 'Staff')
    )
  );

-- Repartidores solo pueden actualizar sus propias asignaciones
CREATE POLICY "Repartidores actualizan sus asignaciones"
  ON asignaciones_entrega FOR UPDATE
  TO authenticated
  USING (
    repartidor_id IN (
      SELECT id FROM repartidores
      WHERE usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    repartidor_id IN (
      SELECT id FROM repartidores
      WHERE usuario_id = auth.uid()
    )
  );

-- =============================================
-- POLÍTICAS PARA DELETE (Eliminar asignaciones)
-- =============================================

-- Solo administradores pueden eliminar asignaciones
CREATE POLICY "Solo admin puede eliminar asignaciones"
  ON asignaciones_entrega FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuario_roles ur
      INNER JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND r.nombre = 'Administrador'
    )
  );

-- Comentarios para documentación
COMMENT ON POLICY "Staff puede ver todas las asignaciones" ON asignaciones_entrega IS 
  'Staff, gerentes y administradores pueden ver todas las asignaciones de entrega';

COMMENT ON POLICY "Repartidores ven sus asignaciones" ON asignaciones_entrega IS 
  'Los repartidores solo pueden ver las entregas que les han sido asignadas';

COMMENT ON POLICY "Repartidores actualizan sus asignaciones" ON asignaciones_entrega IS 
  'Los repartidores pueden actualizar el estado de sus propias entregas (recoger, en camino, entregado)';
