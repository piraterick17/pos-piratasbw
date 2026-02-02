/*
  # Fix de Sincronización Completa - Corrección de Triggers

  ## Descripción
  Esta migración corrige completamente los triggers de sincronización que tenían
  referencias a columnas inexistentes y nombres de tabla incorrectos.

  ## Problemas Corregidos
  1. Referencia a columna `numero_pedido` que no existe (usar solo `id`)
  2. Referencia a columna `created_at` que no existe (usar `insert_date`)
  3. Optimización de queries para evitar errores

  ## Cambios
  - Reescribe `sincronizar_estado_pedido_desde_items()` con columnas correctas
  - Reescribe `sincronizar_items_desde_pedido()` con validaciones
  - Actualiza trigger de notificación de pedido listo
*/

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_sync_pedido_desde_items ON cocina_items;
DROP TRIGGER IF EXISTS trigger_sync_items_desde_pedido ON pedidos;
DROP TRIGGER IF EXISTS trigger_notificacion_pedido_listo ON cocina_items;

-- Función corregida para sincronizar el estado del pedido desde items de cocina
CREATE OR REPLACE FUNCTION sincronizar_estado_pedido_desde_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_items INTEGER;
  v_items_listos INTEGER;
  v_items_preparando INTEGER;
  v_estado_actual_id BIGINT;
  v_estado_actual_nombre TEXT;
  v_nuevo_estado_id BIGINT;
BEGIN
  -- Obtener el estado actual del pedido
  SELECT p.estado_id, e.nombre 
  INTO v_estado_actual_id, v_estado_actual_nombre
  FROM pedidos p
  LEFT JOIN estados_pedido e ON p.estado_id = e.id
  WHERE p.id = NEW.pedido_id;

  -- Si no se encontró el pedido, salir
  IF v_estado_actual_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si el pedido ya está en Completado, Cancelado o En Reparto, no sincronizar
  IF v_estado_actual_nombre IN ('Completado', 'Cancelado', 'En Reparto') THEN
    RETURN NEW;
  END IF;

  -- Contar items del pedido
  SELECT COUNT(*) INTO v_total_items
  FROM cocina_items
  WHERE pedido_id = NEW.pedido_id;

  -- Contar items listos
  SELECT COUNT(*) INTO v_items_listos
  FROM cocina_items
  WHERE pedido_id = NEW.pedido_id
    AND estado = 'listo';

  -- Contar items en preparación
  SELECT COUNT(*) INTO v_items_preparando
  FROM cocina_items
  WHERE pedido_id = NEW.pedido_id
    AND estado = 'preparando';

  -- Determinar el nuevo estado del pedido
  IF v_total_items > 0 AND v_items_listos = v_total_items THEN
    -- Todos los items están listos -> Listo para Entrega
    SELECT id INTO v_nuevo_estado_id
    FROM estados_pedido
    WHERE nombre = 'Listo para Entrega'
    LIMIT 1;

    IF v_nuevo_estado_id IS NOT NULL AND v_estado_actual_nombre != 'Listo para Entrega' THEN
      UPDATE pedidos
      SET estado_id = v_nuevo_estado_id,
          updated_at = NOW()
      WHERE id = NEW.pedido_id;
    END IF;

  ELSIF v_items_preparando > 0 AND v_estado_actual_nombre = 'Pendiente' THEN
    -- Al menos un item está en preparación y el pedido está pendiente -> En Preparación
    SELECT id INTO v_nuevo_estado_id
    FROM estados_pedido
    WHERE nombre = 'En Preparación'
    LIMIT 1;

    IF v_nuevo_estado_id IS NOT NULL THEN
      UPDATE pedidos
      SET estado_id = v_nuevo_estado_id,
          updated_at = NOW()
      WHERE id = NEW.pedido_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Función corregida para sincronizar items desde el estado del pedido
CREATE OR REPLACE FUNCTION sincronizar_items_desde_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estado_nombre TEXT;
BEGIN
  -- Solo procesar si cambió el estado
  IF OLD.estado_id IS NULL OR OLD.estado_id = NEW.estado_id THEN
    RETURN NEW;
  END IF;

  -- Obtener el nombre del nuevo estado
  SELECT nombre INTO v_estado_nombre
  FROM estados_pedido
  WHERE id = NEW.estado_id;

  -- Si no se encontró el estado, salir
  IF v_estado_nombre IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determinar el nuevo estado de los items según el estado del pedido
  IF v_estado_nombre = 'En Preparación' THEN
    -- Cambiar items pendientes a preparando
    UPDATE cocina_items
    SET estado = 'preparando',
        inicio_preparacion = COALESCE(inicio_preparacion, NOW())
    WHERE pedido_id = NEW.id
      AND estado = 'pendiente';

  ELSIF v_estado_nombre = 'Listo para Entrega' THEN
    -- Cambiar todos los items a listo
    UPDATE cocina_items
    SET estado = 'listo',
        fin_preparacion = COALESCE(fin_preparacion, NOW())
    WHERE pedido_id = NEW.id
      AND estado IN ('pendiente', 'preparando');

  ELSIF v_estado_nombre = 'Completado' THEN
    -- Cambiar todos los items a entregado
    UPDATE cocina_items
    SET estado = 'entregado'
    WHERE pedido_id = NEW.id
      AND estado != 'entregado';

  END IF;

  RETURN NEW;
END;
$$;

-- Función corregida para notificar cuando un pedido está 100% listo
CREATE OR REPLACE FUNCTION trigger_notificar_pedido_listo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_pedido_listo BOOLEAN;
  v_notificacion_existe BOOLEAN;
  v_pedido_id_text TEXT;
BEGIN
  -- Solo procesar cuando el estado cambia a 'listo'
  IF NEW.estado = 'listo' AND (OLD.estado IS NULL OR OLD.estado != 'listo') THEN
    -- Verificar si el pedido está completamente listo
    v_pedido_listo := verificar_pedido_listo(NEW.pedido_id);

    IF v_pedido_listo THEN
      -- Convertir pedido_id a texto
      v_pedido_id_text := 'Pedido #' || NEW.pedido_id::TEXT;

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
          'Pedido Listo para Entregar',
          v_pedido_id_text || ' - Todos los items han sido preparados y están listos para organizar la entrega',
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

-- Recrear triggers con las funciones corregidas
CREATE TRIGGER trigger_sync_pedido_desde_items
  AFTER UPDATE ON cocina_items
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
  EXECUTE FUNCTION sincronizar_estado_pedido_desde_items();

CREATE TRIGGER trigger_sync_items_desde_pedido
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  WHEN (OLD.estado_id IS DISTINCT FROM NEW.estado_id)
  EXECUTE FUNCTION sincronizar_items_desde_pedido();

CREATE TRIGGER trigger_notificacion_pedido_listo
  AFTER UPDATE ON cocina_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notificar_pedido_listo();

-- Comentarios de documentación
COMMENT ON FUNCTION sincronizar_estado_pedido_desde_items() IS 
'Sincroniza automáticamente el estado del pedido basándose en el progreso de sus items de cocina (CORREGIDO)';

COMMENT ON FUNCTION sincronizar_items_desde_pedido() IS 
'Sincroniza automáticamente el estado de los items de cocina cuando cambia el estado del pedido (CORREGIDO)';

COMMENT ON FUNCTION trigger_notificar_pedido_listo() IS
'Notifica cuando todos los items de un pedido están listos (CORREGIDO)';
