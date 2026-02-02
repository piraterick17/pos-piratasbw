/*
  # Corrección de la función calcular_prioridad_cocina

  1. Cambios
    - Eliminar referencia a tipo_pedido que no existe
    - Simplificar cálculo de prioridad basado solo en:
      - Tiempo de espera
      - Complejidad del plato
*/

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
BEGIN
  -- Obtener tiempo de espera en minutos
  SELECT EXTRACT(EPOCH FROM (NOW() - insert_date)) / 60 INTO v_tiempo_espera
  FROM pedidos
  WHERE id = p_pedido_id;

  -- Calcular prioridad base según tiempo de espera
  IF v_tiempo_espera > 30 THEN
    v_prioridad := 5; -- Urgente
  ELSIF v_tiempo_espera > 20 THEN
    v_prioridad := 4; -- Alto
  ELSIF v_tiempo_espera > 10 THEN
    v_prioridad := 3; -- Normal
  ELSE
    v_prioridad := 2; -- Bajo
  END IF;

  -- Ajustar por complejidad
  IF p_complejidad >= 4 THEN
    v_prioridad := LEAST(v_prioridad + 1, 5);
  END IF;

  RETURN v_prioridad;
END;
$$;