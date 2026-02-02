/*
  # Fix Notification Triggers - Remove numero_pedido References

  ## Problem
  The notification triggers reference a column `numero_pedido` that doesn't exist
  in the `pedidos` table, causing errors when creating new orders.

  ## Solution
  Update the notification trigger functions to use `NEW.id` instead of `NEW.numero_pedido`

  ## Changes
  - Update notify_new_pedido() function to use pedido ID
  - Update notify_pedido_estado() function to use pedido ID
*/

-- Update function for new order notifications
CREATE OR REPLACE FUNCTION notify_new_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_cliente_nombre TEXT;
BEGIN
  -- Get client name
  SELECT nombre INTO v_cliente_nombre
  FROM clientes
  WHERE id = NEW.cliente_id;

  -- Notify all users (can be filtered by role later)
  FOR v_user IN SELECT id FROM auth.users LOOP
    PERFORM crear_notificacion(
      v_user.id,
      'pedido',
      'Nuevo Pedido',
      'Pedido #' || NEW.id || ' - ' || COALESCE(v_cliente_nombre, 'Cliente'),
      '🔔',
      '/pedidos/' || NEW.id::text,
      jsonb_build_object('pedido_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update function for order state change notifications
CREATE OR REPLACE FUNCTION notify_pedido_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_cliente_nombre TEXT;
  v_titulo TEXT;
  v_mensaje TEXT;
  v_icono TEXT;
BEGIN
  -- Only notify if status changed
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    
    -- Get client name
    SELECT nombre INTO v_cliente_nombre
    FROM clientes
    WHERE id = NEW.cliente_id;

    -- Determine title, message, and icon based on status
    CASE NEW.estado
      WHEN 'preparando' THEN
        v_titulo := 'Pedido en Preparación';
        v_mensaje := 'Pedido #' || NEW.id || ' está siendo preparado';
        v_icono := '👨‍🍳';
      WHEN 'listo' THEN
        v_titulo := 'Pedido Listo';
        v_mensaje := 'Pedido #' || NEW.id || ' está listo para entrega';
        v_icono := '✅';
      WHEN 'en_camino' THEN
        v_titulo := 'Pedido en Camino';
        v_mensaje := 'Pedido #' || NEW.id || ' está en camino';
        v_icono := '🚗';
      WHEN 'entregado' THEN
        v_titulo := 'Pedido Entregado';
        v_mensaje := 'Pedido #' || NEW.id || ' ha sido entregado';
        v_icono := '✅';
      WHEN 'cancelado' THEN
        v_titulo := 'Pedido Cancelado';
        v_mensaje := 'Pedido #' || NEW.id || ' ha sido cancelado';
        v_icono := '❌';
      ELSE
        RETURN NEW;
    END CASE;

    -- Notify all users
    FOR v_user IN SELECT id FROM auth.users LOOP
      PERFORM crear_notificacion(
        v_user.id,
        'pedido',
        v_titulo,
        v_mensaje,
        v_icono,
        '/pedidos/' || NEW.id::text,
        jsonb_build_object('pedido_id', NEW.id, 'estado', NEW.estado)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
