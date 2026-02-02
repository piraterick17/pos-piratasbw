/*
  # Sistema de Progreso de Cocina y Sincronización

  1. Nuevas Funciones
    - `obtener_progreso_pedido(pedido_id)` - Calcula el porcentaje de items completados
    - `verificar_pedido_listo(pedido_id)` - Verifica si todos los items están listos
    - `trigger_notificar_pedido_listo()` - Trigger para notificar cuando un pedido está 100% listo

  2. Cambios
    - Añadir trigger en cocina_items para calcular progreso en tiempo real
    - Crear notificaciones automáticas cuando pedidos están listos

  ## Propósito
  Permitir el seguimiento en tiempo real del progreso de preparación de cada pedido
  y notificar automáticamente cuando todos los items están listos para entrega.
*/

-- Función para obtener el progreso de un pedido basado en items de cocina
CREATE OR REPLACE FUNCTION obtener_progreso_pedido(p_pedido_id BIGINT)
RETURNS TABLE (
  total_items INTEGER,
  items_listos INTEGER,
  porcentaje_completado INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER;
  v_listos INTEGER;
  v_porcentaje INTEGER;
BEGIN
  -- Contar total de items del pedido
  SELECT COUNT(*) INTO v_total
  FROM cocina_items
  WHERE pedido_id = p_pedido_id;

  -- Contar items en estado 'listo'
  SELECT COUNT(*) INTO v_listos
  FROM cocina_items
  WHERE pedido_id = p_pedido_id
    AND estado = 'listo';

  -- Calcular porcentaje
  IF v_total > 0 THEN
    v_porcentaje := ROUND((v_listos::NUMERIC / v_total::NUMERIC) * 100);
  ELSE
    v_porcentaje := 0;
  END IF;

  RETURN QUERY SELECT v_total, v_listos, v_porcentaje;
END;
$$;

-- Función para verificar si un pedido tiene todos sus items listos
CREATE OR REPLACE FUNCTION verificar_pedido_listo(p_pedido_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER;
  v_listos INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM cocina_items
  WHERE pedido_id = p_pedido_id;

  SELECT COUNT(*) INTO v_listos
  FROM cocina_items
  WHERE pedido_id = p_pedido_id
    AND estado = 'listo';

  -- Retornar true si hay items y todos están listos
  RETURN v_total > 0 AND v_total = v_listos;
END;
$$;

-- Trigger para notificar cuando un pedido está 100% listo
CREATE OR REPLACE FUNCTION trigger_notificar_pedido_listo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_pedido_listo BOOLEAN;
  v_notificacion_existe BOOLEAN;
  v_numero_pedido TEXT;
BEGIN
  -- Solo procesar cuando el estado cambia a 'listo'
  IF NEW.estado = 'listo' AND (OLD.estado IS NULL OR OLD.estado != 'listo') THEN
    -- Verificar si el pedido está completamente listo
    v_pedido_listo := verificar_pedido_listo(NEW.pedido_id);

    IF v_pedido_listo THEN
      -- Obtener número de pedido para la notificación
      SELECT COALESCE(numero_pedido, 'Pedido #' || id::TEXT)
      INTO v_numero_pedido
      FROM pedidos
      WHERE id = NEW.pedido_id;

      -- Verificar si ya existe una notificación para este pedido
      SELECT EXISTS (
        SELECT 1 FROM notificaciones
        WHERE tipo = 'pedido_listo'
          AND referencia_id = NEW.pedido_id::TEXT
          AND leido = false
      ) INTO v_notificacion_existe;

      -- Crear notificación solo si no existe una sin leer
      IF NOT v_notificacion_existe THEN
        INSERT INTO notificaciones (
          tipo,
          titulo,
          mensaje,
          referencia_id,
          prioridad,
          leido
        ) VALUES (
          'pedido_listo',
          '🎉 Pedido Listo para Entregar',
          v_numero_pedido || ' - Todos los items han sido preparados y están listos para organizar la entrega',
          NEW.pedido_id::TEXT,
          'alta',
          false
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger en cocina_items
DROP TRIGGER IF EXISTS trigger_notificacion_pedido_listo ON cocina_items;
CREATE TRIGGER trigger_notificacion_pedido_listo
  AFTER UPDATE ON cocina_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notificar_pedido_listo();

-- Crear índice para mejorar performance de consultas de progreso
CREATE INDEX IF NOT EXISTS idx_cocina_items_pedido_estado 
  ON cocina_items(pedido_id, estado)
  WHERE estado IN ('pendiente', 'preparando', 'listo');
