/*
  # Triggers para Notificaciones Automáticas

  1. Funciones de Trigger
    - notify_new_pedido: Notifica cuando se crea un nuevo pedido
    - notify_stock_bajo: Notifica cuando un insumo tiene stock bajo
    - notify_pedido_estado: Notifica cambios de estado en pedidos

  2. Triggers
    - Trigger en tabla pedidos (INSERT) para nuevos pedidos
    - Trigger en tabla insumos (UPDATE) para stock bajo
    - Trigger en tabla pedidos (UPDATE) para cambios de estado

  3. Notas
    - Las notificaciones se envían a todos los usuarios autenticados (por ahora)
    - Se puede filtrar por roles en futuras iteraciones
    - Los triggers se ejecutan después del evento (AFTER)
*/

-- Función para notificar nuevo pedido
CREATE OR REPLACE FUNCTION notify_new_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_cliente_nombre TEXT;
BEGIN
  -- Obtener nombre del cliente
  SELECT nombre INTO v_cliente_nombre
  FROM clientes
  WHERE id = NEW.cliente_id;

  -- Notificar a todos los usuarios (después se puede filtrar por rol)
  FOR v_user IN SELECT id FROM auth.users LOOP
    PERFORM crear_notificacion(
      v_user.id,
      'pedido',
      'Nuevo Pedido',
      'Pedido #' || NEW.numero_pedido || ' - ' || COALESCE(v_cliente_nombre, 'Cliente'),
      '🔔',
      '/pedidos/' || NEW.id::text,
      jsonb_build_object('pedido_id', NEW.id, 'numero_pedido', NEW.numero_pedido)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger para nuevos pedidos
DROP TRIGGER IF EXISTS trigger_notify_new_pedido ON pedidos;
CREATE TRIGGER trigger_notify_new_pedido
  AFTER INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_pedido();

-- Función para notificar stock bajo
CREATE OR REPLACE FUNCTION notify_stock_bajo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Solo notificar si el stock bajó y está por debajo del mínimo
  IF (NEW.stock_actual < NEW.stock_minimo) AND 
     (OLD.stock_actual IS NULL OR OLD.stock_actual >= NEW.stock_minimo) THEN
    
    -- Notificar a todos los usuarios
    FOR v_user IN SELECT id FROM auth.users LOOP
      PERFORM crear_notificacion(
        v_user.id,
        'stock',
        'Stock Bajo',
        'El insumo "' || NEW.nombre || '" tiene stock bajo (' || NEW.stock_actual || ' ' || NEW.unidad_medida || ')',
        '⚠️',
        '/insumos',
        jsonb_build_object('insumo_id', NEW.id, 'stock_actual', NEW.stock_actual, 'stock_minimo', NEW.stock_minimo)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para stock bajo en insumos
DROP TRIGGER IF EXISTS trigger_notify_stock_bajo ON insumos;
CREATE TRIGGER trigger_notify_stock_bajo
  AFTER UPDATE OF stock_actual ON insumos
  FOR EACH ROW
  EXECUTE FUNCTION notify_stock_bajo();

-- Función para notificar cambios de estado de pedido
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
  -- Solo notificar si cambió el estado
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    
    -- Obtener nombre del cliente
    SELECT nombre INTO v_cliente_nombre
    FROM clientes
    WHERE id = NEW.cliente_id;

    -- Determinar título, mensaje e icono según el estado
    CASE NEW.estado
      WHEN 'preparando' THEN
        v_titulo := 'Pedido en Preparación';
        v_mensaje := 'Pedido #' || NEW.numero_pedido || ' está siendo preparado';
        v_icono := '👨‍🍳';
      WHEN 'listo' THEN
        v_titulo := 'Pedido Listo';
        v_mensaje := 'Pedido #' || NEW.numero_pedido || ' está listo para entrega';
        v_icono := '✅';
      WHEN 'en_camino' THEN
        v_titulo := 'Pedido en Camino';
        v_mensaje := 'Pedido #' || NEW.numero_pedido || ' está en camino';
        v_icono := '🚗';
      WHEN 'entregado' THEN
        v_titulo := 'Pedido Entregado';
        v_mensaje := 'Pedido #' || NEW.numero_pedido || ' ha sido entregado';
        v_icono := '✅';
      WHEN 'cancelado' THEN
        v_titulo := 'Pedido Cancelado';
        v_mensaje := 'Pedido #' || NEW.numero_pedido || ' ha sido cancelado';
        v_icono := '❌';
      ELSE
        RETURN NEW;
    END CASE;

    -- Notificar a todos los usuarios
    FOR v_user IN SELECT id FROM auth.users LOOP
      PERFORM crear_notificacion(
        v_user.id,
        'pedido',
        v_titulo,
        v_mensaje,
        v_icono,
        '/pedidos/' || NEW.id::text,
        jsonb_build_object('pedido_id', NEW.id, 'numero_pedido', NEW.numero_pedido, 'estado', NEW.estado)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para cambios de estado en pedidos
DROP TRIGGER IF EXISTS trigger_notify_pedido_estado ON pedidos;
CREATE TRIGGER trigger_notify_pedido_estado
  AFTER UPDATE OF estado ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION notify_pedido_estado();