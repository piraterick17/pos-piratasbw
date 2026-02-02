/*
  # Fix crear_items_cocina Function - Remove notas Reference

  ## Problem
  The crear_items_cocina() function tries to access NEW.notas from detalles_pedido,
  but that column doesn't exist in the table, causing errors when inserting order details.

  ## Solution
  Update the function to not include the notas field when creating cocina_items.
  The notas field in cocina_items can be populated from the pedidos.notas field if needed,
  but for now we'll leave it NULL.

  ## Changes
  - Remove NEW.notas reference from the INSERT statement in crear_items_cocina()
*/

CREATE OR REPLACE FUNCTION crear_items_cocina()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estacion RECORD;
  v_tiempo_estimado INTEGER;
  v_complejidad INTEGER;
  v_prioridad INTEGER;
BEGIN
  -- For each station associated with the product
  FOR v_estacion IN 
    SELECT pe.estacion_id, pe.tiempo_preparacion, pe.complejidad
    FROM productos_estaciones pe
    WHERE pe.producto_id = NEW.producto_id
  LOOP
    v_tiempo_estimado := v_estacion.tiempo_preparacion * NEW.cantidad;
    v_complejidad := v_estacion.complejidad;
    v_prioridad := calcular_prioridad_cocina(NEW.pedido_id, v_tiempo_estimado, v_complejidad);

    INSERT INTO cocina_items (
      pedido_id,
      detalle_pedido_id,
      estacion_id,
      tiempo_estimado,
      prioridad
    ) VALUES (
      NEW.pedido_id,
      NEW.id,
      v_estacion.estacion_id,
      v_tiempo_estimado,
      v_prioridad
    );
  END LOOP;

  RETURN NEW;
END;
$$;
