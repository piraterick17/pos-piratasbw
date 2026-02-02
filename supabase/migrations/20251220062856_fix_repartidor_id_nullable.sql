/*
  # Corregir constraint NOT NULL en repartidor_id
  
  ## Problema
  La tabla `asignaciones_entrega` tiene `repartidor_id NOT NULL`, pero el trigger
  `crear_asignacion_entrega()` intenta insertar NULL cuando se crea un pedido a domicilio.
  
  Esto causa error 23502: "null value in column repartidor_id violates not-null constraint"
  
  ## Solución
  Hacer `repartidor_id` NULLABLE para permitir el flujo de negocio correcto:
  1. Pedido creado → Asignación sin repartidor (estado 'pendiente')
  2. Staff asigna repartidor → repartidor_id actualizado (estado 'asignado')
  3. Repartidor recoge → estado 'recogido'
  4. Repartidor entrega → estado 'entregado'
  
  ## Cambios
  
  1. Tablas Modificadas
    - `asignaciones_entrega.repartidor_id` ahora es NULLABLE
  
  2. Vistas Actualizadas
    - `v_entregas_activas`: INNER JOIN → LEFT JOIN en repartidores
      (para mostrar asignaciones sin repartidor aún)
  
  3. Funciones Actualizadas
    - `marcar_pedido_entregado()`: Validar que tenga repartidor antes de marcar como entregado
    - `crear_asignacion_entrega()`: Documentación actualizada
  
  4. Seguridad
    - Las políticas RLS siguen funcionando correctamente
    - La FK a repartidores valida cuando repartidor_id NO es NULL
    - No se introducen vulnerabilidades
  
  ## Validación
  - ✅ Pedidos a domicilio se crean sin error
  - ✅ Asignaciones se crean con repartidor_id = NULL
  - ✅ Staff puede asignar repartidor posteriormente
  - ✅ No se puede marcar como entregado sin repartidor
*/

-- ===========================================
-- 1. HACER REPARTIDOR_ID NULLABLE
-- ===========================================

ALTER TABLE asignaciones_entrega
  ALTER COLUMN repartidor_id DROP NOT NULL;

COMMENT ON COLUMN asignaciones_entrega.repartidor_id IS 
  'ID del repartidor asignado. NULL hasta que se asigne manualmente. La asignación se crea automáticamente para pedidos a domicilio en estado pendiente';

-- ===========================================
-- 2. ACTUALIZAR VISTA v_entregas_activas
-- ===========================================

CREATE OR REPLACE VIEW v_entregas_activas AS
SELECT 
  ae.id as asignacion_id,
  ae.pedido_id,
  ae.repartidor_id,
  r.nombre as repartidor_nombre,
  r.telefono as repartidor_telefono,
  r.vehiculo_tipo,
  ae.estado as estado_entrega,
  ae.fecha_asignacion,
  ae.fecha_recogida,
  p.cliente_id,
  c.nombre as cliente_nombre,
  c.telefono as cliente_telefono,
  p.direccion_envio,
  p.plus_code,
  ze.nombre as zona_entrega,
  p.tiempo_entrega_minutos,
  EXTRACT(EPOCH FROM (now() - ae.fecha_asignacion))/60 as minutos_desde_asignacion
FROM asignaciones_entrega ae
LEFT JOIN repartidores r ON ae.repartidor_id = r.id  -- ✅ Cambió de INNER JOIN a LEFT JOIN
INNER JOIN pedidos p ON ae.pedido_id = p.id
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
WHERE ae.estado IN ('pendiente', 'asignado', 'recogido', 'en_camino')  -- ✅ Agregado 'pendiente'
ORDER BY ae.fecha_asignacion DESC;

COMMENT ON VIEW v_entregas_activas IS 
  'Muestra todas las entregas activas incluyendo pendientes sin repartidor asignado';

-- ===========================================
-- 3. ACTUALIZAR FUNCIÓN marcar_pedido_entregado
-- ===========================================

CREATE OR REPLACE FUNCTION marcar_pedido_entregado(
  p_asignacion_id bigint,
  p_calificacion integer DEFAULT NULL,
  p_comentario text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_repartidor_id bigint;
  v_pedido_id bigint;
  v_tiempo_total integer;
BEGIN
  -- Obtener información de la asignación
  SELECT 
    repartidor_id, 
    pedido_id,
    EXTRACT(EPOCH FROM (now() - fecha_asignacion))/60
  INTO v_repartidor_id, v_pedido_id, v_tiempo_total
  FROM asignaciones_entrega
  WHERE id = p_asignacion_id;
  
  -- ✅ VALIDACIÓN NUEVA: No se puede marcar como entregado sin repartidor
  IF v_repartidor_id IS NULL THEN
    RAISE EXCEPTION 'No se puede marcar como entregado: no hay repartidor asignado';
  END IF;
  
  -- Actualizar asignación
  UPDATE asignaciones_entrega
  SET 
    estado = 'entregado',
    fecha_entrega_real = now(),
    tiempo_total_minutos = v_tiempo_total,
    calificacion = p_calificacion,
    comentario_cliente = p_comentario
  WHERE id = p_asignacion_id;
  
  -- Actualizar pedido
  UPDATE pedidos
  SET 
    fecha_entregado = now(),
    updated_at = now()
  WHERE id = v_pedido_id;
  
  -- Verificar si el repartidor tiene más entregas pendientes
  IF NOT EXISTS (
    SELECT 1 FROM asignaciones_entrega
    WHERE repartidor_id = v_repartidor_id
      AND estado IN ('asignado', 'recogido', 'en_camino')
      AND id != p_asignacion_id
  ) THEN
    -- Si no tiene más entregas, marcarlo como disponible
    UPDATE repartidores
    SET estado = 'disponible', updated_at = now()
    WHERE id = v_repartidor_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION marcar_pedido_entregado IS 
  'Marca una entrega como completada. REQUIERE que haya repartidor asignado.';

-- ===========================================
-- 4. ACTUALIZAR TRIGGER DOCUMENTATION
-- ===========================================

COMMENT ON FUNCTION crear_asignacion_entrega() IS 
  'Crea automáticamente una asignación de entrega cuando se crea un pedido a domicilio.
   La asignación se crea en estado pendiente con repartidor_id = NULL.
   El repartidor se asigna posteriormente usando asignar_pedido_repartidor()';

-- ===========================================
-- 5. CREAR VISTA AUXILIAR: Asignaciones Pendientes
-- ===========================================

CREATE OR REPLACE VIEW v_asignaciones_pendientes AS
SELECT 
  ae.id as asignacion_id,
  ae.pedido_id,
  ae.estado,
  ae.fecha_asignacion,
  p.cliente_id,
  c.nombre as cliente_nombre,
  c.telefono as cliente_telefono,
  p.direccion_envio,
  p.plus_code,
  ze.nombre as zona_entrega,
  p.total,
  p.tiempo_entrega_minutos,
  p.notas_entrega,
  EXTRACT(EPOCH FROM (now() - ae.fecha_asignacion))/60 as minutos_esperando
FROM asignaciones_entrega ae
INNER JOIN pedidos p ON ae.pedido_id = p.id
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
WHERE ae.repartidor_id IS NULL
  AND ae.estado = 'pendiente'
  AND p.deleted_at IS NULL
ORDER BY ae.fecha_asignacion ASC;

COMMENT ON VIEW v_asignaciones_pendientes IS 
  'Muestra todas las asignaciones de entrega que aún no tienen repartidor asignado';
