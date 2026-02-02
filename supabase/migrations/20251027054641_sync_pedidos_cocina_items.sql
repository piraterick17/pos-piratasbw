/*
  # Sincronización Automática entre Pedidos y Items de Cocina

  ## Descripción
  Este migration implementa la sincronización bidireccional automática entre el estado
  de los pedidos y el progreso de los items de cocina.

  ## Nuevas Funciones

  1. **sincronizar_estado_pedido_desde_items()**
     - Actualiza automáticamente el estado del pedido basándose en el progreso de items de cocina
     - Si todos los items están listos, mueve el pedido a "Listo para Entrega"
     - Si al menos un item está en preparando, mueve el pedido a "En Preparación"

  2. **sincronizar_items_desde_pedido()**
     - Cuando un pedido cambia a "En Preparación", marca items pendientes como "preparando"
     - Cuando un pedido cambia a "Listo para Entrega", marca todos los items como "listo"
     - Cuando un pedido cambia a "Completado", marca todos los items como "entregado"

  ## Triggers

  - **trigger_sync_pedido_desde_items**: Se activa cuando se actualiza un item de cocina
  - **trigger_sync_items_desde_pedido**: Se activa cuando se actualiza el estado de un pedido

  ## Propósito
  Mantener sincronizados en tiempo real los estados de pedidos y sus items de cocina,
  permitiendo que ambas vistas (general y por estaciones) reflejen el mismo estado.
*/

-- Función para sincronizar el estado del pedido basándose en los items de cocina
CREATE OR REPLACE FUNCTION sincronizar_estado_pedido_desde_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_items INTEGER;
  v_items_listos INTEGER;
  v_items_preparando INTEGER;
  v_estado_actual TEXT;
  v_nuevo_estado_id INTEGER;
BEGIN
  -- Obtener el estado actual del pedido
  SELECT e.nombre INTO v_estado_actual
  FROM pedidos p
  JOIN estados_pedido e ON p.estado_id = e.id
  WHERE p.id = NEW.pedido_id;

  -- Si el pedido ya está en Completado, Cancelado o En Reparto, no sincronizar
  IF v_estado_actual IN ('Completado', 'Cancelado', 'En Reparto') THEN
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

    IF v_nuevo_estado_id IS NOT NULL AND v_estado_actual != 'Listo para Entrega' THEN
      UPDATE pedidos
      SET estado_id = v_nuevo_estado_id,
          updated_at = NOW()
      WHERE id = NEW.pedido_id;
    END IF;

  ELSIF v_items_preparando > 0 AND v_estado_actual = 'Pendiente' THEN
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

-- Función para sincronizar items de cocina cuando cambia el estado del pedido
CREATE OR REPLACE FUNCTION sincronizar_items_desde_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estado_nombre TEXT;
  v_nuevo_estado_item TEXT;
BEGIN
  -- Solo procesar si cambió el estado
  IF OLD.estado_id IS NULL OR OLD.estado_id = NEW.estado_id THEN
    RETURN NEW;
  END IF;

  -- Obtener el nombre del nuevo estado
  SELECT nombre INTO v_estado_nombre
  FROM estados_pedido
  WHERE id = NEW.estado_id;

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

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS trigger_sync_pedido_desde_items ON cocina_items;
DROP TRIGGER IF EXISTS trigger_sync_items_desde_pedido ON pedidos;

-- Crear trigger para sincronizar pedido cuando cambian los items
CREATE TRIGGER trigger_sync_pedido_desde_items
  AFTER UPDATE ON cocina_items
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
  EXECUTE FUNCTION sincronizar_estado_pedido_desde_items();

-- Crear trigger para sincronizar items cuando cambia el estado del pedido
CREATE TRIGGER trigger_sync_items_desde_pedido
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  WHEN (OLD.estado_id IS DISTINCT FROM NEW.estado_id)
  EXECUTE FUNCTION sincronizar_items_desde_pedido();

-- Comentarios de documentación
COMMENT ON FUNCTION sincronizar_estado_pedido_desde_items() IS 
'Sincroniza automáticamente el estado del pedido basándose en el progreso de sus items de cocina';

COMMENT ON FUNCTION sincronizar_items_desde_pedido() IS 
'Sincroniza automáticamente el estado de los items de cocina cuando cambia el estado del pedido';
