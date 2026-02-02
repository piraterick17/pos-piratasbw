/*
  # Corrección Final de Todos los Triggers - Usar pedido_estados

  ## Problema Crítico
  Todos los triggers estaban usando "estados_pedido" cuando la tabla real se llama "pedido_estados"
  
  ## Correcciones
  1. Actualizar sincronizar_estado_pedido_desde_items() - usar pedido_estados
  2. Actualizar sincronizar_items_desde_pedido() - usar pedido_estados
  3. Actualizar notify_pedido_estado() - usar pedido_estados
  4. Desactivar temporalmente triggers conflictivos si es necesario
*/

-- PRIMERO: Desactivar temporalmente los triggers para evitar errores en cascada
ALTER TABLE cocina_items DISABLE TRIGGER trigger_sync_pedido_desde_items;
ALTER TABLE cocina_items DISABLE TRIGGER trigger_notificacion_pedido_listo;
ALTER TABLE pedidos DISABLE TRIGGER trigger_sync_items_desde_pedido;
ALTER TABLE pedidos DISABLE TRIGGER trigger_notify_pedido_estado;

-- Función corregida 1: Sincronizar estado del pedido desde items de cocina
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
  -- Obtener el estado actual del pedido (CORREGIDO: pedido_estados)
  SELECT p.estado_id, e.nombre 
  INTO v_estado_actual_id, v_estado_actual_nombre
  FROM pedidos p
  LEFT JOIN pedido_estados e ON p.estado_id = e.id
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
    FROM pedido_estados
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
    FROM pedido_estados
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

-- Función corregida 2: Sincronizar items desde el estado del pedido
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

  -- Obtener el nombre del nuevo estado (CORREGIDO: pedido_estados)
  SELECT nombre INTO v_estado_nombre
  FROM pedido_estados
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

-- Función corregida 3: Notificar cambios de estado del pedido
CREATE OR REPLACE FUNCTION notify_pedido_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_nombre TEXT;
  v_estado_nombre TEXT;
  v_titulo TEXT;
  v_mensaje TEXT;
  v_icono TEXT;
BEGIN
  -- Solo notificar si cambió el estado
  IF NEW.estado_id IS DISTINCT FROM OLD.estado_id THEN

    -- Obtener el nombre del cliente
    SELECT nombre INTO v_cliente_nombre
    FROM clientes
    WHERE id = NEW.cliente_id;

    -- Obtener el nombre del estado (CORREGIDO: pedido_estados)
    SELECT nombre INTO v_estado_nombre
    FROM pedido_estados
    WHERE id = NEW.estado_id;

    -- Si no se encontró el estado, salir
    IF v_estado_nombre IS NULL THEN
      RETURN NEW;
    END IF;

    -- Determinar título, mensaje e icono según el estado
    CASE v_estado_nombre
      WHEN 'En Preparación' THEN
        v_titulo := 'Pedido en Preparación';
        v_mensaje := 'Pedido #' || NEW.id || ' está siendo preparado';
        v_icono := '👨‍🍳';
      WHEN 'Listo para Entrega' THEN
        v_titulo := 'Pedido Listo';
        v_mensaje := 'Pedido #' || NEW.id || ' está listo para entrega';
        v_icono := '✅';
      WHEN 'En Reparto' THEN
        v_titulo := 'Pedido en Camino';
        v_mensaje := 'Pedido #' || NEW.id || ' está en camino';
        v_icono := '🚗';
      WHEN 'Completado' THEN
        v_titulo := 'Pedido Completado';
        v_mensaje := 'Pedido #' || NEW.id || ' ha sido completado';
        v_icono := '✅';
      WHEN 'Cancelado' THEN
        v_titulo := 'Pedido Cancelado';
        v_mensaje := 'Pedido #' || NEW.id || ' ha sido cancelado';
        v_icono := '❌';
      ELSE
        RETURN NEW;
    END CASE;

    -- Insertar notificación
    INSERT INTO notificaciones (
      tipo,
      titulo,
      mensaje,
      referencia_id,
      prioridad,
      leido
    ) VALUES (
      'pedido_estado',
      v_titulo,
      v_mensaje,
      NEW.id::TEXT,
      CASE 
        WHEN v_estado_nombre IN ('Cancelado') THEN 'alta'
        WHEN v_estado_nombre IN ('Listo para Entrega', 'En Reparto') THEN 'media'
        ELSE 'baja'
      END,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- REACTIVAR los triggers
ALTER TABLE cocina_items ENABLE TRIGGER trigger_sync_pedido_desde_items;
ALTER TABLE cocina_items ENABLE TRIGGER trigger_notificacion_pedido_listo;
ALTER TABLE pedidos ENABLE TRIGGER trigger_sync_items_desde_pedido;
ALTER TABLE pedidos ENABLE TRIGGER trigger_notify_pedido_estado;

-- Comentarios actualizados
COMMENT ON FUNCTION sincronizar_estado_pedido_desde_items() IS 
'Sincroniza automáticamente el estado del pedido basándose en el progreso de sus items de cocina (USA pedido_estados)';

COMMENT ON FUNCTION sincronizar_items_desde_pedido() IS 
'Sincroniza automáticamente el estado de los items de cocina cuando cambia el estado del pedido (USA pedido_estados)';

COMMENT ON FUNCTION notify_pedido_estado() IS 
'Notifica cuando cambia el estado de un pedido (USA pedido_estados)';
