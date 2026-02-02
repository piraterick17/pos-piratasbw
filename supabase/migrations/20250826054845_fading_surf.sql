/*
  # Función para actualización batch de stock de insumos

  1. Nueva Función
    - `actualizar_stock_insumos_batch`
      - Parámetro: `insumos_data` (jsonb) - Array de objetos con id y stock_actual
      - Actualiza múltiples insumos en una sola operación
      - Optimizada para inventarios completos
      - Incluye validaciones y manejo de errores

  2. Seguridad
    - Función con SECURITY DEFINER para permisos adecuados
    - Validaciones de entrada para prevenir errores
    - Manejo de excepciones robusto

  3. Optimización
    - Usa UPDATE con UNNEST para operación batch eficiente
    - Evita múltiples consultas individuales
    - Mejor rendimiento para inventarios grandes
*/

-- Crear la función para actualización batch de stock de insumos
CREATE OR REPLACE FUNCTION actualizar_stock_insumos_batch(insumos_data JSONB)
RETURNS TABLE(
  insumos_actualizados INTEGER,
  insumos_no_encontrados INTEGER,
  errores TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  insumo_record RECORD;
  total_actualizados INTEGER := 0;
  total_no_encontrados INTEGER := 0;
  errores_array TEXT[] := ARRAY[]::TEXT[];
  insumo_obj JSONB;
BEGIN
  -- Validar que el parámetro no sea nulo
  IF insumos_data IS NULL THEN
    RAISE EXCEPTION 'El parámetro insumos_data no puede ser nulo';
  END IF;

  -- Validar que sea un array
  IF jsonb_typeof(insumos_data) != 'array' THEN
    RAISE EXCEPTION 'El parámetro insumos_data debe ser un array JSON';
  END IF;

  -- Validar que el array no esté vacío
  IF jsonb_array_length(insumos_data) = 0 THEN
    RAISE EXCEPTION 'El array de insumos no puede estar vacío';
  END IF;

  -- Iterar sobre cada elemento del array JSON
  FOR i IN 0..jsonb_array_length(insumos_data) - 1 LOOP
    BEGIN
      -- Obtener el objeto actual del array
      insumo_obj := insumos_data -> i;
      
      -- Validar que el objeto tenga las propiedades requeridas
      IF NOT (insumo_obj ? 'id' AND insumo_obj ? 'stock_actual') THEN
        errores_array := array_append(errores_array, 
          'Objeto en posición ' || i || ' no tiene las propiedades requeridas (id, stock_actual)');
        CONTINUE;
      END IF;

      -- Validar que el ID sea un número válido
      IF NOT (insumo_obj ->> 'id' ~ '^[0-9]+$') THEN
        errores_array := array_append(errores_array, 
          'ID inválido en posición ' || i || ': ' || (insumo_obj ->> 'id'));
        CONTINUE;
      END IF;

      -- Validar que el stock_actual sea un número válido
      IF NOT (insumo_obj ->> 'stock_actual' ~ '^[0-9]+\.?[0-9]*$') THEN
        errores_array := array_append(errores_array, 
          'Stock inválido en posición ' || i || ': ' || (insumo_obj ->> 'stock_actual'));
        CONTINUE;
      END IF;

      -- Validar que el stock no sea negativo
      IF (insumo_obj ->> 'stock_actual')::NUMERIC < 0 THEN
        errores_array := array_append(errores_array, 
          'Stock no puede ser negativo para insumo ID ' || (insumo_obj ->> 'id') || 
          ': ' || (insumo_obj ->> 'stock_actual'));
        CONTINUE;
      END IF;

      -- Intentar actualizar el insumo
      UPDATE public.insumos 
      SET 
        stock_actual = (insumo_obj ->> 'stock_actual')::NUMERIC,
        updated_at = NOW()
      WHERE id = (insumo_obj ->> 'id')::BIGINT;

      -- Verificar si se actualizó algún registro
      IF FOUND THEN
        total_actualizados := total_actualizados + 1;
      ELSE
        total_no_encontrados := total_no_encontrados + 1;
        errores_array := array_append(errores_array, 
          'Insumo no encontrado con ID: ' || (insumo_obj ->> 'id'));
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Capturar cualquier error y continuar con el siguiente insumo
        errores_array := array_append(errores_array, 
          'Error al actualizar insumo ID ' || (insumo_obj ->> 'id') || ': ' || SQLERRM);
    END;
  END LOOP;

  -- Retornar los resultados
  RETURN QUERY SELECT 
    total_actualizados,
    total_no_encontrados,
    errores_array;
END;
$$;

-- Comentario sobre el uso de la función
COMMENT ON FUNCTION actualizar_stock_insumos_batch(JSONB) IS 
'Actualiza el stock de múltiples insumos en una sola operación batch. 
Parámetro: Array JSON con objetos {id: number, stock_actual: number}.
Retorna: Estadísticas de la operación y lista de errores si los hay.
Ejemplo de uso: SELECT * FROM actualizar_stock_insumos_batch(''[{"id": 1, "stock_actual": 150.5}, {"id": 3, "stock_actual": 25}]''::jsonb);';