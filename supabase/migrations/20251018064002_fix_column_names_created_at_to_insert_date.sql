/*
  # Fix Column Name References - created_at to insert_date

  ## Problema Identificado
  - La tabla `pedidos` usa la columna `insert_date` (no `created_at`)
  - La función `calcular_prioridad_cocina` referencia `created_at` que NO existe
  - Esto causa errores en el cálculo de prioridades

  ## Solución
  - Actualizar la función para usar `insert_date` en lugar de `created_at`

  ## Cambios
  - Corregir función `calcular_prioridad_cocina`
*/

-- Corregir la función calcular_prioridad_cocina para usar insert_date
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
  -- CORREGIDO: Usar insert_date en lugar de created_at
  SELECT 
    EXTRACT(EPOCH FROM (NOW() - insert_date)) / 60,
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
