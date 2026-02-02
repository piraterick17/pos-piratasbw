/*
  # Corrección de Tipos de Notificaciones - Usar Valores Válidos

  ## Problema
  La tabla notificaciones tiene un constraint check que solo permite estos tipos:
  - 'pedido'
  - 'stock'
  - 'mensaje'
  - 'pago'
  - 'entrega'
  - 'sistema'
  - 'cocina'

  Los triggers estaban usando tipos inválidos como:
  - 'pedido_listo' ❌
  - 'pedido_estado' ❌
  - 'pedido_nuevo' ❌

  ## Corrección
  Cambiar todos los triggers para usar tipos válidos:
  - 'pedido_listo' → 'cocina' (es una notificación de cocina)
  - 'pedido_estado' → 'pedido' (es una notificación general de pedido)
  - 'pedido_nuevo' → 'pedido' (es una notificación general de pedido)
*/

-- Función 1: Notificar cambios de estado del pedido (USAR TIPO VÁLIDO)
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

    -- Insertar notificación con TIPO VÁLIDO: 'pedido'
    INSERT INTO notificaciones (
      tipo,
      titulo,
      mensaje,
      icono,
      link,
      leida,
      data
    ) VALUES (
      'pedido',  -- CAMBIADO: usar tipo válido
      v_titulo,
      v_mensaje,
      v_icono,
      '/pedidos/' || NEW.id::TEXT,
      false,
      jsonb_build_object(
        'pedido_id', NEW.id,
        'estado', v_estado_nombre,
        'cliente', v_cliente_nombre,
        'subtipo', 'estado_cambio'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Función 2: Notificar nuevo pedido (USAR TIPO VÁLIDO)
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

  -- Insertar notificación con TIPO VÁLIDO: 'pedido'
  INSERT INTO notificaciones (
    tipo,
    titulo,
    mensaje,
    icono,
    link,
    leida,
    data
  ) VALUES (
    'pedido',  -- CAMBIADO: usar tipo válido
    'Nuevo Pedido',
    'Pedido #' || NEW.id || ' - ' || COALESCE(v_cliente_nombre, 'Cliente sin nombre'),
    '🔔',
    '/pedidos/' || NEW.id::TEXT,
    false,
    jsonb_build_object(
      'pedido_id', NEW.id, 
      'cliente', v_cliente_nombre,
      'subtipo', 'nuevo_pedido'
    )
  );

  RETURN NEW;
END;
$$;

-- Función 3: Notificar cuando pedido está listo (USAR TIPO VÁLIDO)
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
        WHERE tipo = 'cocina'
          AND data->>'pedido_id' = NEW.pedido_id::TEXT
          AND data->>'subtipo' = 'pedido_listo'
          AND leida = false
      ) INTO v_notificacion_existe;

      -- Crear notificación solo si no existe una sin leer
      IF NOT v_notificacion_existe THEN
        INSERT INTO notificaciones (
          tipo,
          titulo,
          mensaje,
          icono,
          link,
          leida,
          data
        ) VALUES (
          'cocina',  -- CAMBIADO: usar tipo válido
          'Pedido Listo para Entregar',
          v_pedido_id_text || ' - Todos los items han sido preparados y están listos para organizar la entrega',
          '✅',
          '/pedidos/' || NEW.pedido_id::TEXT,
          false,
          jsonb_build_object(
            'pedido_id', NEW.pedido_id,
            'subtipo', 'pedido_listo'
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Comentarios actualizados
COMMENT ON FUNCTION notify_pedido_estado() IS 
'Notifica cuando cambia el estado de un pedido (USA tipo válido: pedido)';

COMMENT ON FUNCTION notify_new_pedido() IS 
'Notifica cuando se crea un nuevo pedido (USA tipo válido: pedido)';

COMMENT ON FUNCTION trigger_notificar_pedido_listo() IS
'Notifica cuando todos los items de un pedido están listos (USA tipo válido: cocina)';
