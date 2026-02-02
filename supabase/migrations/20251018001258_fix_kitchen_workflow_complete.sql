/*
  # Fix Kitchen Workflow - Complete Correction

  1. Problemas Identificados
    - La función crear_items_cocina solo crea items si el producto tiene estaciones asignadas
    - Muchos productos NO tienen estaciones asignadas
    - Los items de cocina no se crean automáticamente para todos los productos
  
  2. Solución
    - Modificar la función para que SIEMPRE cree items de cocina
    - Si el producto NO tiene estaciones asignadas, asignar a una estación por defecto (Parrilla)
    - Mejorar el cálculo de prioridad
    - Agregar logs para debugging

  3. Cambios
    - Actualizar función crear_items_cocina para manejar productos sin estaciones
    - Asegurar que todos los pedidos tengan items de cocina
    - Mejorar la lógica de prioridad
*/

-- Primero, vamos a mejorar la función de cálculo de prioridad
CREATE OR REPLACE FUNCTION calcular_prioridad_cocina(
  p_pedido_id BIGINT,
  p_tiempo_estimado INTEGER,
  p_complejidad INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tiempo_espera INTEGER;
  v_prioridad INTEGER := 3;
  v_tiempo_prometido INTEGER;
BEGIN
  -- Obtener tiempo de espera en minutos y tiempo prometido
  SELECT 
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60,
    COALESCE(tiempo_entrega_minutos, 30)
  INTO v_tiempo_espera, v_tiempo_prometido
  FROM pedidos
  WHERE id = p_pedido_id;

  -- Calcular prioridad base según tiempo transcurrido vs tiempo prometido
  IF v_tiempo_prometido IS NOT NULL THEN
    -- Si ya pasó el 90% del tiempo prometido
    IF v_tiempo_espera > (v_tiempo_prometido * 0.9) THEN
      v_prioridad := 5; -- Urgente
    -- Si ya pasó el 70% del tiempo prometido  
    ELSIF v_tiempo_espera > (v_tiempo_prometido * 0.7) THEN
      v_prioridad := 4; -- Alto
    -- Si ya pasó el 50% del tiempo prometido
    ELSIF v_tiempo_espera > (v_tiempo_prometido * 0.5) THEN
      v_prioridad := 3; -- Normal
    ELSE
      v_prioridad := 2; -- Baja prioridad (pedido reciente)
    END IF;
  ELSE
    -- Fallback a tiempos absolutos si no hay tiempo prometido
    IF v_tiempo_espera > 30 THEN
      v_prioridad := 5;
    ELSIF v_tiempo_espera > 20 THEN
      v_prioridad := 4;
    ELSIF v_tiempo_espera > 10 THEN
      v_prioridad := 3;
    ELSE
      v_prioridad := 2;
    END IF;
  END IF;

  -- Ajustar por complejidad
  IF p_complejidad >= 4 THEN
    v_prioridad := LEAST(v_prioridad + 1, 5);
  END IF;

  RETURN v_prioridad;
END;
$$;

-- Ahora, actualizar la función crear_items_cocina para manejar productos sin estaciones
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
  v_count INTEGER := 0;
  v_estacion_default UUID;
BEGIN
  -- Contar cuántas estaciones tiene asignadas el producto
  SELECT COUNT(*) INTO v_count
  FROM productos_estaciones pe
  WHERE pe.producto_id = NEW.producto_id;

  -- Si el producto NO tiene estaciones asignadas, usar estación por defecto (Parrilla)
  IF v_count = 0 THEN
    -- Obtener la estación "Parrilla" o la primera activa
    SELECT id INTO v_estacion_default
    FROM estaciones_cocina
    WHERE active = true
    ORDER BY 
      CASE WHEN LOWER(nombre) = 'parrilla' THEN 0 ELSE 1 END,
      orden
    LIMIT 1;

    -- Si encontramos una estación por defecto, crear el item
    IF v_estacion_default IS NOT NULL THEN
      v_tiempo_estimado := 15 * NEW.cantidad; -- 15 minutos por defecto
      v_complejidad := 3; -- Complejidad media por defecto
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
        v_estacion_default,
        v_tiempo_estimado,
        v_prioridad
      );
    END IF;
  ELSE
    -- El producto SÍ tiene estaciones asignadas, crear items para cada una
    FOR v_estacion IN 
      SELECT pe.estacion_id, pe.tiempo_preparacion, pe.complejidad
      FROM productos_estaciones pe
      JOIN estaciones_cocina ec ON pe.estacion_id = ec.id
      WHERE pe.producto_id = NEW.producto_id
        AND ec.active = true  -- Solo estaciones activas
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
  END IF;

  RETURN NEW;
END;
$$;

-- Asegurar que el trigger está activo
DROP TRIGGER IF EXISTS trigger_crear_items_cocina ON detalles_pedido;
CREATE TRIGGER trigger_crear_items_cocina
  AFTER INSERT ON detalles_pedido
  FOR EACH ROW
  EXECUTE FUNCTION crear_items_cocina();

-- Crear función para actualizar prioridades de items existentes
CREATE OR REPLACE FUNCTION actualizar_prioridades_cocina()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE cocina_items ci
  SET prioridad = calcular_prioridad_cocina(ci.pedido_id, ci.tiempo_estimado, 3)
  WHERE estado IN ('pendiente', 'preparando');
END;
$$;

-- Comentario: Puedes ejecutar SELECT actualizar_prioridades_cocina(); 
-- para actualizar las prioridades de los items existentes
