/*
  # Fix de Triggers de Notificaciones - Usar estado_id en lugar de estado

  ## Descripción
  Las funciones de notificación usan la columna antigua `estado` (text) cuando
  ahora la tabla usa `estado_id` (bigint) que referencia a estados_pedido.

  ## Cambios
  - Actualizar `notify_pedido_estado()` para usar estado_id y obtener el nombre desde estados_pedido
  - Actualizar `notify_new_pedido()` para usar la estructura correcta (ya está bien, solo usa id)
  - Asegurar compatibilidad con la estructura actual de la base de datos
*/

-- Función corregida para notificar cambios de estado del pedido
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

    -- Obtener el nombre del estado
    SELECT nombre INTO v_estado_nombre
    FROM estados_pedido
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
        -- Para otros estados, no notificar
        RETURN NEW;
    END CASE;

    -- Insertar notificación directamente en la tabla (más simple que crear_notificacion)
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

-- Función corregida para notificar nuevo pedido (ya estaba bien, pero la simplificamos)
CREATE OR REPLACE FUNCTION notify_new_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_nombre TEXT;
BEGIN
  -- Obtener nombre del cliente
  SELECT nombre INTO v_cliente_nombre
  FROM clientes
  WHERE id = NEW.cliente_id;

  -- Insertar notificación
  INSERT INTO notificaciones (
    tipo,
    titulo,
    mensaje,
    referencia_id,
    prioridad,
    leido
  ) VALUES (
    'pedido_nuevo',
    'Nuevo Pedido',
    'Pedido #' || NEW.id || ' - ' || COALESCE(v_cliente_nombre, 'Cliente sin nombre'),
    NEW.id::TEXT,
    'alta',
    false
  );

  RETURN NEW;
END;
$$;

-- Comentarios de documentación
COMMENT ON FUNCTION notify_pedido_estado() IS 
'Notifica cuando cambia el estado de un pedido (CORREGIDO para usar estado_id)';

COMMENT ON FUNCTION notify_new_pedido() IS 
'Notifica cuando se crea un nuevo pedido (SIMPLIFICADO)';
