/*
  # Crear trigger para asignaciones automáticas de entrega
  
  1. Nueva Función
    - `crear_asignacion_entrega()` 
      - Se ejecuta cuando se crea un nuevo pedido
      - Si el tipo_entrega_id = 1 (A domicilio), crea automáticamente un registro en asignaciones_entrega
      - Estado inicial: 'pendiente'
      - Sin repartidor asignado inicialmente (repartidor_id = NULL hasta asignación manual)
  
  2. Nuevo Trigger
    - `trigger_crear_asignacion_entrega`
      - Se ejecuta AFTER INSERT en tabla pedidos
      - Llama a la función crear_asignacion_entrega()
  
  3. Seguridad
    - La asignación se crea automáticamente sin necesidad de intervención manual
    - Mejora la trazabilidad desde el momento de creación del pedido
*/

-- Crear la función que maneja la creación de asignaciones
CREATE OR REPLACE FUNCTION crear_asignacion_entrega()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear asignación si es pedido a domicilio (tipo_entrega_id = 1)
  IF NEW.tipo_entrega_id = 1 THEN
    INSERT INTO asignaciones_entrega (
      pedido_id,
      repartidor_id,
      estado,
      insert_by_user
    ) VALUES (
      NEW.id,
      NULL, -- Sin repartidor asignado inicialmente
      'pendiente',
      NEW.insert_by_user
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger que se ejecuta al insertar pedidos
DROP TRIGGER IF EXISTS trigger_crear_asignacion_entrega ON pedidos;

CREATE TRIGGER trigger_crear_asignacion_entrega
  AFTER INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION crear_asignacion_entrega();

-- Comentarios para documentación
COMMENT ON FUNCTION crear_asignacion_entrega() IS 
  'Crea automáticamente una asignación de entrega cuando se crea un pedido a domicilio';

COMMENT ON TRIGGER trigger_crear_asignacion_entrega ON pedidos IS 
  'Trigger que crea asignación automática para pedidos a domicilio';
