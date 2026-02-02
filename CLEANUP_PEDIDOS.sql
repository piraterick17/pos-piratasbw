/*
  SCRIPT DE LIMPIEZA DE PEDIDOS - Los Piratas B&W

  Este script permite eliminar pedidos de prueba y sus datos relacionados.

  ADVERTENCIA:
  - Este script elimina datos permanentemente
  - Siempre haz un respaldo antes de ejecutar
  - Revisa los contadores antes de ejecutar el DELETE

  INSTRUCCIONES:
  1. Primero ejecuta las consultas SELECT para verificar qué se eliminará
  2. Revisa los números cuidadosamente
  3. Descomenta la sección DELETE que necesites
  4. Ejecuta el script en Supabase SQL Editor
*/

-- ============================================================================
-- SECCIÓN 1: VERIFICACIÓN - Contar registros que se eliminarían
-- ============================================================================

-- Ver total de pedidos
SELECT COUNT(*) as total_pedidos FROM pedidos;

-- Ver pedidos por estado
SELECT
  ep.nombre as estado,
  COUNT(*) as cantidad
FROM pedidos p
LEFT JOIN pedido_estados ep ON p.estado_id = ep.id
GROUP BY ep.nombre
ORDER BY cantidad DESC;

-- Ver pedidos por fecha (últimos 30 días)
SELECT
  DATE(insert_date) as fecha,
  COUNT(*) as cantidad
FROM pedidos
WHERE insert_date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(insert_date)
ORDER BY fecha DESC;

-- Ver pedidos con sus totales
SELECT
  id,
  insert_date,
  total,
  ep.nombre as estado
FROM pedidos p
LEFT JOIN pedido_estados ep ON p.estado_id = ep.id
ORDER BY insert_date DESC
LIMIT 20;

-- ============================================================================
-- SECCIÓN 2: LIMPIEZA COMPLETA (Eliminar TODOS los pedidos)
-- ============================================================================

-- ADVERTENCIA: Esto eliminará TODOS los pedidos y datos relacionados
-- Descomenta las siguientes líneas solo si estás 100% seguro

/*
BEGIN;

-- Eliminar items de cocina relacionados
DELETE FROM cocina_items WHERE pedido_id IN (SELECT id FROM pedidos);

-- Eliminar notificaciones relacionadas
DELETE FROM notificaciones WHERE pedido_id IN (SELECT id FROM pedidos);

-- Eliminar métricas de venta relacionadas
DELETE FROM metricas_venta WHERE pedido_id IN (SELECT id FROM pedidos);

-- Eliminar pagos relacionados
DELETE FROM pagos WHERE pedido_id IN (SELECT id FROM pedidos);

-- Eliminar detalles de pedidos
DELETE FROM detalles_pedido WHERE pedido_id IN (SELECT id FROM pedidos);

-- Eliminar los pedidos
DELETE FROM pedidos;

-- Reiniciar secuencia de IDs (opcional - descomenta si quieres que los IDs empiecen desde 1)
-- ALTER SEQUENCE pedidos_id_seq RESTART WITH 1;
-- ALTER SEQUENCE detalles_pedido_id_seq RESTART WITH 1;

COMMIT;
*/

-- ============================================================================
-- SECCIÓN 3: LIMPIEZA POR FECHA (Eliminar pedidos antiguos)
-- ============================================================================

-- Eliminar pedidos anteriores a una fecha específica
-- Cambia la fecha según tus necesidades

/*
BEGIN;

-- Verificar primero cuántos pedidos se eliminarán
SELECT COUNT(*) as pedidos_a_eliminar
FROM pedidos
WHERE insert_date < '2025-01-01';

-- Si el número es correcto, descomenta lo siguiente:

-- Eliminar items de cocina
DELETE FROM cocina_items
WHERE pedido_id IN (
  SELECT id FROM pedidos WHERE insert_date < '2025-01-01'
);

-- Eliminar notificaciones
DELETE FROM notificaciones
WHERE pedido_id IN (
  SELECT id FROM pedidos WHERE insert_date < '2025-01-01'
);

-- Eliminar métricas de venta
DELETE FROM metricas_venta
WHERE pedido_id IN (
  SELECT id FROM pedidos WHERE insert_date < '2025-01-01'
);

-- Eliminar pagos
DELETE FROM pagos
WHERE pedido_id IN (
  SELECT id FROM pedidos WHERE insert_date < '2025-01-01'
);

-- Eliminar detalles
DELETE FROM detalles_pedido
WHERE pedido_id IN (
  SELECT id FROM pedidos WHERE insert_date < '2025-01-01'
);

-- Eliminar pedidos
DELETE FROM pedidos WHERE insert_date < '2025-01-01';

COMMIT;
*/

-- ============================================================================
-- SECCIÓN 4: LIMPIEZA POR ESTADO (Eliminar pedidos en estado específico)
-- ============================================================================

-- Eliminar solo pedidos cancelados, por ejemplo

/*
BEGIN;

-- Verificar primero
SELECT COUNT(*) as pedidos_a_eliminar
FROM pedidos p
JOIN pedido_estados ep ON p.estado_id = ep.id
WHERE ep.nombre = 'Cancelado';

-- Si el número es correcto, descomenta:

-- Obtener IDs de pedidos cancelados
WITH pedidos_cancelados AS (
  SELECT p.id
  FROM pedidos p
  JOIN pedido_estados ep ON p.estado_id = ep.id
  WHERE ep.nombre = 'Cancelado'
)

-- Eliminar datos relacionados
DELETE FROM cocina_items WHERE pedido_id IN (SELECT id FROM pedidos_cancelados);
DELETE FROM notificaciones WHERE pedido_id IN (SELECT id FROM pedidos_cancelados);
DELETE FROM metricas_venta WHERE pedido_id IN (SELECT id FROM pedidos_cancelados);
DELETE FROM pagos WHERE pedido_id IN (SELECT id FROM pedidos_cancelados);
DELETE FROM detalles_pedido WHERE pedido_id IN (SELECT id FROM pedidos_cancelados);
DELETE FROM pedidos WHERE id IN (SELECT id FROM pedidos_cancelados);

COMMIT;
*/

-- ============================================================================
-- SECCIÓN 5: LIMPIEZA POR RANGO DE IDs
-- ============================================================================

-- Útil cuando sabes exactamente qué rango de pedidos de prueba eliminar

/*
BEGIN;

-- Verificar primero
SELECT COUNT(*) as pedidos_a_eliminar
FROM pedidos
WHERE id BETWEEN 1 AND 100;

-- Si es correcto, descomenta:

DELETE FROM cocina_items WHERE pedido_id BETWEEN 1 AND 100;
DELETE FROM notificaciones WHERE pedido_id BETWEEN 1 AND 100;
DELETE FROM metricas_venta WHERE pedido_id BETWEEN 1 AND 100;
DELETE FROM pagos WHERE pedido_id BETWEEN 1 AND 100;
DELETE FROM detalles_pedido WHERE pedido_id BETWEEN 1 AND 100;
DELETE FROM pedidos WHERE id BETWEEN 1 AND 100;

COMMIT;
*/

-- ============================================================================
-- SECCIÓN 6: VERIFICACIÓN POST-LIMPIEZA
-- ============================================================================

-- Ejecuta estas consultas DESPUÉS de la limpieza para verificar

/*
SELECT COUNT(*) as pedidos_restantes FROM pedidos;
SELECT COUNT(*) as detalles_restantes FROM detalles_pedido;
SELECT COUNT(*) as pagos_restantes FROM pagos;
SELECT COUNT(*) as items_cocina_restantes FROM cocina_items;
SELECT COUNT(*) as notificaciones_restantes FROM notificaciones;
SELECT COUNT(*) as metricas_restantes FROM metricas_venta;
*/

-- ============================================================================
-- SECCIÓN 7: CONSULTAS ADICIONALES ÚTILES
-- ============================================================================

-- Ver últimos 10 pedidos creados con todos sus detalles
SELECT
  p.id,
  p.insert_date,
  p.total,
  pe.nombre as estado,
  p.cliente_nombre,
  p.tipo_entrega_nombre,
  COUNT(DISTINCT dp.id) as items,
  COUNT(DISTINCT ci.id) as items_cocina,
  COUNT(DISTINCT pa.id) as pagos_registrados
FROM pedidos_vista p
LEFT JOIN pedido_estados pe ON p.estado_id = pe.id
LEFT JOIN detalles_pedido dp ON p.id = dp.pedido_id AND dp.deleted_at IS NULL
LEFT JOIN cocina_items ci ON p.id = ci.pedido_id
LEFT JOIN pagos pa ON p.id = pa.pedido_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.insert_date, p.total, pe.nombre, p.cliente_nombre, p.tipo_entrega_nombre
ORDER BY p.insert_date DESC
LIMIT 10;

-- Ver items de cocina sin pedido (huérfanos - no debería haber)
SELECT ci.id, ci.pedido_id, ci.created_at
FROM cocina_items ci
LEFT JOIN pedidos p ON ci.pedido_id = p.id
WHERE p.id IS NULL;

-- Ver detalles de pedido sin pedido (huérfanos - no debería haber)
SELECT dp.id, dp.pedido_id, dp.insert_date
FROM detalles_pedido dp
LEFT JOIN pedidos p ON dp.pedido_id = p.id
WHERE p.id IS NULL;

-- Ver pagos sin pedido (huérfanos - no debería haber)
SELECT pa.id, pa.pedido_id, pa.fecha_pago
FROM pagos pa
LEFT JOIN pedidos p ON pa.pedido_id = p.id
WHERE p.id IS NULL;

-- Limpiar registros huérfanos (usa con precaución)
/*
DELETE FROM cocina_items WHERE pedido_id NOT IN (SELECT id FROM pedidos);
DELETE FROM detalles_pedido WHERE pedido_id NOT IN (SELECT id FROM pedidos);
DELETE FROM pagos WHERE pedido_id NOT IN (SELECT id FROM pedidos);
DELETE FROM notificaciones WHERE pedido_id NOT IN (SELECT id FROM pedidos);
DELETE FROM metricas_venta WHERE pedido_id NOT IN (SELECT id FROM pedidos);
*/

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. SIEMPRE verifica primero con SELECT antes de hacer DELETE
2. Las transacciones (BEGIN/COMMIT) aseguran que todo se ejecute junto
3. Si algo sale mal, puedes hacer ROLLBACK en lugar de COMMIT
4. Considera hacer un backup antes de cualquier limpieza:
   - Ve a Supabase Dashboard > Database > Backups
   - O exporta las tablas importantes manualmente
5. Si tienes dudas, empieza con rangos pequeños de IDs
6. La tabla correcta es "pedido_estados", NO "estados_pedido"
7. Ejecuta las consultas de verificación primero para asegurarte
*/
