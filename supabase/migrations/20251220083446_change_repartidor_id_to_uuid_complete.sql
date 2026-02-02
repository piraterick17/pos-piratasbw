/*
  # Cambiar repartidor_id de bigint a uuid - Migración Completa

  1. Cambios en Schema
    - Eliminar todas las vistas que dependen de asignaciones_entrega
    - Eliminar políticas RLS que dependen de repartidor_id
    - Modificar la columna `repartidor_id` en `asignaciones_entrega` de tipo `bigint` a tipo `uuid`
    - Actualizar la foreign key para que apunte a `usuarios(id)` en lugar de `repartidores(id)`
    - Recrear todas las políticas RLS actualizadas
    - Recrear todas las vistas actualizadas
  
  2. Razón
    - Los repartidores ahora son usuarios con rol "Repartidor"
    - Los IDs de usuarios son UUID, no bigint
    
  3. Notas Importantes
    - Se eliminan los valores existentes de repartidor_id para evitar conflictos de tipo
    - Asegúrate de re-asignar los repartidores después de ejecutar esta migración
*/

-- 1. Eliminar todas las vistas que dependen de asignaciones_entrega
DROP VIEW IF EXISTS v_pedidos_sin_asignar;
DROP VIEW IF EXISTS v_entregas_activas;
DROP VIEW IF EXISTS v_desempeno_repartidores;
DROP VIEW IF EXISTS v_asignaciones_pendientes;

-- 2. Eliminar las políticas que dependen de repartidor_id
DROP POLICY IF EXISTS "Repartidores ven sus asignaciones" ON asignaciones_entrega;
DROP POLICY IF EXISTS "Repartidores actualizan sus asignaciones" ON asignaciones_entrega;

-- 3. Eliminar la foreign key existente si existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'asignaciones_entrega_repartidor_id_fkey'
  ) THEN
    ALTER TABLE asignaciones_entrega 
    DROP CONSTRAINT asignaciones_entrega_repartidor_id_fkey;
  END IF;
END $$;

-- 4. Establecer todos los repartidor_id a NULL temporalmente
UPDATE asignaciones_entrega SET repartidor_id = NULL;

-- 5. Cambiar el tipo de columna de bigint a uuid
ALTER TABLE asignaciones_entrega 
ALTER COLUMN repartidor_id TYPE uuid USING NULL;

-- 6. Agregar nueva foreign key que apunte a usuarios
ALTER TABLE asignaciones_entrega
ADD CONSTRAINT asignaciones_entrega_repartidor_id_fkey 
FOREIGN KEY (repartidor_id) 
REFERENCES usuarios(id) 
ON DELETE SET NULL;

-- 7. Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_asignaciones_repartidor_id 
ON asignaciones_entrega(repartidor_id) 
WHERE repartidor_id IS NOT NULL;

-- 8. Recrear políticas RLS actualizadas para usuarios con rol Repartidor
CREATE POLICY "Repartidores ven sus asignaciones"
  ON asignaciones_entrega FOR SELECT
  TO authenticated
  USING (
    repartidor_id = auth.uid()
  );

CREATE POLICY "Repartidores actualizan sus asignaciones"
  ON asignaciones_entrega FOR UPDATE
  TO authenticated
  USING (
    repartidor_id = auth.uid()
  )
  WITH CHECK (
    repartidor_id = auth.uid()
  );

-- 9. Recrear v_asignaciones_pendientes
CREATE OR REPLACE VIEW v_asignaciones_pendientes AS
SELECT 
  ae.id AS asignacion_id,
  ae.pedido_id,
  ae.estado,
  ae.fecha_asignacion,
  p.cliente_id,
  c.nombre AS cliente_nombre,
  c.telefono AS cliente_telefono,
  p.direccion_envio,
  p.plus_code,
  ze.nombre AS zona_entrega,
  p.total,
  p.tiempo_entrega_minutos,
  p.notas_entrega,
  EXTRACT(epoch FROM (NOW() - ae.fecha_asignacion)) / 60 AS minutos_esperando
FROM asignaciones_entrega ae
JOIN pedidos p ON ae.pedido_id = p.id
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
WHERE ae.repartidor_id IS NULL
  AND ae.estado = 'pendiente'
  AND p.deleted_at IS NULL
ORDER BY ae.fecha_asignacion;

-- 10. Recrear v_entregas_activas (actualizada para usuarios)
CREATE OR REPLACE VIEW v_entregas_activas AS
SELECT 
  ae.id AS asignacion_id,
  ae.pedido_id,
  ae.repartidor_id,
  u.nombre AS repartidor_nombre,
  u.email AS repartidor_email,
  ae.estado AS estado_entrega,
  ae.fecha_asignacion,
  ae.fecha_recogida,
  p.cliente_id,
  c.nombre AS cliente_nombre,
  c.telefono AS cliente_telefono,
  p.direccion_envio,
  p.plus_code,
  ze.nombre AS zona_entrega,
  p.tiempo_entrega_minutos,
  EXTRACT(epoch FROM (NOW() - ae.fecha_asignacion)) / 60 AS minutos_desde_asignacion
FROM asignaciones_entrega ae
LEFT JOIN usuarios u ON ae.repartidor_id = u.id
JOIN pedidos p ON ae.pedido_id = p.id
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
WHERE ae.estado IN ('pendiente', 'asignado', 'recogido', 'en_camino')
ORDER BY ae.fecha_asignacion DESC;

-- 11. Recrear v_desempeno_repartidores (actualizada para usuarios con rol Repartidor)
CREATE OR REPLACE VIEW v_desempeno_repartidores AS
SELECT 
  u.id,
  u.nombre,
  u.email,
  u.activo,
  COUNT(ae.id) AS total_entregas,
  COUNT(CASE WHEN ae.estado = 'entregado' THEN 1 END) AS entregas_completadas,
  COUNT(CASE WHEN ae.estado = 'cancelado' THEN 1 END) AS entregas_canceladas,
  ROUND(AVG(CASE WHEN ae.estado = 'entregado' THEN ae.tiempo_total_minutos END), 2) AS tiempo_promedio_entrega,
  ROUND(AVG(CASE WHEN ae.calificacion IS NOT NULL THEN ae.calificacion END), 2) AS calificacion_promedio,
  COUNT(CASE WHEN ae.fecha_asignacion >= CURRENT_DATE THEN 1 END) AS entregas_hoy,
  COUNT(CASE WHEN ae.fecha_asignacion >= (CURRENT_DATE - INTERVAL '7 days') THEN 1 END) AS entregas_semana,
  SUM(CASE WHEN ae.estado = 'entregado' THEN COALESCE(ae.distancia_km, 0) ELSE 0 END) AS distancia_total_km
FROM usuarios u
INNER JOIN usuario_roles ur ON u.id = ur.usuario_id
INNER JOIN roles r ON ur.rol_id = r.id
LEFT JOIN asignaciones_entrega ae ON u.id = ae.repartidor_id
WHERE r.nombre = 'Repartidor'
  AND u.activo = true
GROUP BY u.id, u.nombre, u.email, u.activo
ORDER BY entregas_completadas DESC;

-- 12. Recrear v_pedidos_sin_asignar
CREATE OR REPLACE VIEW v_pedidos_sin_asignar AS
SELECT 
  p.id AS pedido_id,
  p.insert_date AS fecha_pedido,
  p.cliente_id,
  c.nombre AS cliente_nombre,
  c.telefono AS cliente_telefono,
  p.direccion_envio,
  p.plus_code,
  p.zona_entrega_id,
  ze.nombre AS zona_nombre,
  p.total,
  p.tiempo_entrega_minutos,
  p.notas_entrega,
  pe.nombre AS estado_pedido,
  EXTRACT(epoch FROM (NOW() - p.fecha_listo_para_entrega)) / 60 AS minutos_esperando
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
LEFT JOIN pedido_estados pe ON p.estado_id = pe.id
LEFT JOIN asignaciones_entrega ae ON p.id = ae.pedido_id
WHERE p.deleted_at IS NULL
  AND p.estado IN ('listo_para_entrega', 'preparado')
  AND ae.id IS NULL
  AND p.tipo_entrega_id IN (
    SELECT id FROM tipos_entrega WHERE nombre ILIKE '%domicilio%'
  )
ORDER BY p.fecha_listo_para_entrega;
