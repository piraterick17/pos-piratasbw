/*
  # Integración del Sistema de Puntos con Pedidos
  
  1. Trigger para otorgar puntos automáticamente
    - Se ejecuta cuando un pedido cambia a estado 'completado' o 'enviado'
    - Otorga puntos automáticamente usando la función existente
    
  2. Función auxiliar
    - `trigger_otorgar_puntos_pedido` - Trigger function
*/

-- Función trigger para otorgar puntos automáticamente
CREATE OR REPLACE FUNCTION trigger_otorgar_puntos_pedido()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo otorgar puntos cuando el pedido cambia a completado/enviado
  IF NEW.estado IN ('completado', 'enviado') AND 
     (OLD.estado IS NULL OR OLD.estado NOT IN ('completado', 'enviado')) THEN
    
    -- Otorgar puntos al cliente
    PERFORM otorgar_puntos_pedido(NEW.cliente_id, NEW.id, NEW.total);
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en tabla pedidos
DROP TRIGGER IF EXISTS trigger_pedido_completado_puntos ON pedidos;

CREATE TRIGGER trigger_pedido_completado_puntos
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_otorgar_puntos_pedido();

-- Comentarios
COMMENT ON FUNCTION trigger_otorgar_puntos_pedido IS 'Trigger que otorga puntos automáticamente cuando un pedido se completa';
COMMENT ON TRIGGER trigger_pedido_completado_puntos ON pedidos IS 'Otorga puntos de lealtad al cliente automáticamente al completar pedido';
