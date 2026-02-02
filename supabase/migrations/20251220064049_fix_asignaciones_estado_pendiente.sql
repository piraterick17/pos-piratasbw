/*
  # Agregar estado 'pendiente' al CHECK constraint de asignaciones_entrega
  
  ## Problema
  El trigger `crear_asignacion_entrega()` inserta asignaciones en estado 'pendiente',
  pero el CHECK constraint de la tabla solo permite:
  - 'asignado', 'recogido', 'en_camino', 'entregado', 'cancelado'
  
  Esto causa error 23514: "violates check constraint asignaciones_entrega_estado_check"
  
  ## Solución
  Agregar 'pendiente' a la lista de estados válidos en el CHECK constraint.
  
  ## Flujo de Estados Correcto
  1. Pedido creado → Asignación: estado='pendiente', repartidor_id=NULL
  2. Repartidor asignado → estado='asignado'
  3. Repartidor recoge → estado='recogido'
  4. Repartidor sale → estado='en_camino'
  5. Repartidor entrega → estado='entregado'
  6. En cualquier momento → estado='cancelado'
  
  ## Cambios
  
  1. Tablas Modificadas
    - `asignaciones_entrega.estado` CHECK constraint actualizado con 'pendiente'
  
  2. Vistas Actualizadas
    - `v_entregas_activas` ya incluye 'pendiente' ✅ (actualizado en migración anterior)
  
  3. Documentación
    - Comentarios actualizados para reflejar flujo completo
  
  4. Validaciones Opcionales (COMENTADAS)
    - Trigger para validar que pedidos a domicilio tengan zona
    - Vista de alertas operativas
  
  ## Precondiciones para Crear Pedidos
  
  ### Pedido A Domicilio (tipo_entrega_id = 1)
  ✅ DEBE tener:
    - cliente_id (válido)
    - zona_entrega_id (válido)
    - direccion_envio.calle (no vacío)
  
  ❌ NO requiere:
    - repartidor_id (se asigna después)
    - direccion_envio.ciudad (opcional)
  
  ### Pedido Local (tipo_entrega_id = 2 o 3)
  ✅ DEBE tener:
    - cliente_id (válido)
  
  ❌ NO requiere:
    - zona_entrega_id
    - direccion_envio
    - repartidor_id
*/

-- ===========================================
-- 1. AGREGAR 'pendiente' AL CHECK CONSTRAINT
-- ===========================================

-- Eliminar constraint antiguo
ALTER TABLE asignaciones_entrega
  DROP CONSTRAINT IF EXISTS asignaciones_entrega_estado_check;

-- Crear constraint nuevo con 'pendiente' incluido
ALTER TABLE asignaciones_entrega
  ADD CONSTRAINT asignaciones_entrega_estado_check
  CHECK (estado IN ('pendiente', 'asignado', 'recogido', 'en_camino', 'entregado', 'cancelado'));

-- Documentar el cambio
COMMENT ON CONSTRAINT asignaciones_entrega_estado_check ON asignaciones_entrega IS 
  'Valida los estados permitidos para asignaciones de entrega. 
   Flujo: pendiente → asignado → recogido → en_camino → entregado (o cancelado en cualquier momento)';

-- ===========================================
-- 2. ACTUALIZAR COMENTARIOS
-- ===========================================

COMMENT ON COLUMN asignaciones_entrega.estado IS 
  'Estado de la asignación: 
   - pendiente: Creada automáticamente, sin repartidor asignado
   - asignado: Repartidor asignado, esperando recogida
   - recogido: Pedido recogido por repartidor
   - en_camino: Repartidor en ruta hacia cliente
   - entregado: Pedido entregado al cliente
   - cancelado: Asignación cancelada';

-- ===========================================
-- 3. VALIDACIONES OPCIONALES (COMENTADAS)
-- ===========================================

/*
  OPCIONAL: Validación en Backend para Pedidos a Domicilio
  
  Si quieres forzar que los pedidos a domicilio SIEMPRE tengan zona y dirección
  en el backend (no solo en frontend), descomenta este código:

-- Crear función de validación
CREATE OR REPLACE FUNCTION validar_pedido_domicilio()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es pedido a domicilio (tipo_entrega_id = 1)
  IF NEW.tipo_entrega_id = 1 THEN
    
    -- Validar zona de entrega
    IF NEW.zona_entrega_id IS NULL THEN
      RAISE EXCEPTION 'Pedidos a domicilio requieren zona de entrega (zona_entrega_id)';
    END IF;
    
    -- Validar dirección con calle
    IF NEW.direccion_envio IS NULL OR 
       NOT (NEW.direccion_envio ? 'calle') OR 
       (NEW.direccion_envio->>'calle') = '' THEN
      RAISE EXCEPTION 'Pedidos a domicilio requieren dirección con calle válida';
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_validar_pedido_domicilio ON pedidos;

CREATE TRIGGER trigger_validar_pedido_domicilio
  BEFORE INSERT OR UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION validar_pedido_domicilio();

COMMENT ON FUNCTION validar_pedido_domicilio() IS 
  'Valida que pedidos a domicilio tengan zona y dirección. 
   OPCIONAL: Descomenta en la migración si quieres validación backend además de frontend.';
*/

-- ===========================================
-- 4. VISTA DE ALERTAS OPERATIVAS (OPCIONAL)
-- ===========================================

/*
  OPCIONAL: Vista para monitorear alertas operativas
  
  Útil para detectar:
  - Muchas asignaciones pendientes sin repartidor
  - Pocos o ningún repartidor disponible
  
  Descomenta si quieres esta funcionalidad:

CREATE OR REPLACE VIEW v_alertas_operativas AS
SELECT
  'asignaciones_pendientes' as tipo_alerta,
  COUNT(*)::integer as cantidad,
  'Asignaciones pendientes sin repartidor' as descripcion,
  CASE
    WHEN COUNT(*) > 10 THEN 'critico'::text
    WHEN COUNT(*) > 5 THEN 'alto'::text
    WHEN COUNT(*) > 0 THEN 'medio'::text
    ELSE 'normal'::text
  END as nivel_alerta,
  now() as fecha_revision
FROM asignaciones_entrega
WHERE repartidor_id IS NULL 
  AND estado = 'pendiente'
  AND EXISTS (
    SELECT 1 FROM pedidos p 
    WHERE p.id = asignaciones_entrega.pedido_id 
      AND p.deleted_at IS NULL
  )

UNION ALL

SELECT
  'repartidores_disponibles' as tipo_alerta,
  COUNT(*)::integer as cantidad,
  CASE
    WHEN COUNT(*) = 0 THEN 'No hay repartidores disponibles'
    WHEN COUNT(*) = 1 THEN '1 repartidor disponible'
    ELSE COUNT(*)::text || ' repartidores disponibles'
  END as descripcion,
  CASE
    WHEN COUNT(*) = 0 THEN 'critico'::text
    WHEN COUNT(*) < 2 THEN 'alto'::text
    WHEN COUNT(*) < 3 THEN 'medio'::text
    ELSE 'normal'::text
  END as nivel_alerta,
  now() as fecha_revision
FROM repartidores
WHERE activo = true 
  AND estado IN ('disponible', 'en_ruta');

COMMENT ON VIEW v_alertas_operativas IS 
  'Vista de alertas operativas para monitorear el estado del sistema de entregas.
   OPCIONAL: Descomenta en la migración si quieres esta funcionalidad.';
*/

-- ===========================================
-- 5. VERIFICACIÓN DE INTEGRIDAD
-- ===========================================

-- Verificar que no haya registros existentes con estados inválidos
DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM asignaciones_entrega
  WHERE estado NOT IN ('pendiente', 'asignado', 'recogido', 'en_camino', 'entregado', 'cancelado');
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'ADVERTENCIA: Existen % asignaciones con estados inválidos. Revisar manualmente.', invalid_count;
  ELSE
    RAISE NOTICE 'Verificación OK: Todos los estados de asignaciones son válidos';
  END IF;
END $$;

-- ===========================================
-- 6. ACTUALIZAR DEFAULT SI NO EXISTE
-- ===========================================

-- Asegurar que el default sea 'pendiente' (no 'asignado')
ALTER TABLE asignaciones_entrega
  ALTER COLUMN estado SET DEFAULT 'pendiente';

COMMENT ON TABLE asignaciones_entrega IS 
  'Historial de asignaciones de pedidos a repartidores con métricas de desempeño.
   Las asignaciones se crean automáticamente en estado pendiente cuando se crea un pedido a domicilio.
   El repartidor se asigna posteriormente de forma manual o automática.';
