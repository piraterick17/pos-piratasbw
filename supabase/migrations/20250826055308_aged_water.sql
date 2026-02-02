/*
  # Función para actualización masiva de stock de insumos

  1. Nueva Función
    - `actualizar_stock_insumos_batch`
      - Acepta un parámetro JSONB con array de objetos {id, stock_actual}
      - Actualiza múltiples insumos en una sola operación
      - Incluye validaciones y manejo de errores
      - Retorna estadísticas de la operación

  2. Seguridad
    - Función definida con SECURITY DEFINER
    - Validaciones de datos de entrada
    - Manejo seguro de errores

  3. Optimización
    - Operación batch para mejor rendimiento
    - Transacción única para consistencia
    - Logging detallado de resultados
*/

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
  insumo_item JSONB;
  insumo_id INTEGER;
  nuevo_stock NUMERIC(10,3);
  contador_actualizados INTEGER := 0;
  contador_no_encontrados INTEGER := 0;
  lista_errores TEXT[] := ARRAY[]::TEXT[];
  insumo_existe BOOLEAN;
BEGIN
  -- Validar que el parámetro de entrada no sea nulo
  IF insumos_data IS NULL THEN
    lista_errores := array_append(lista_errores, 'El parámetro insumos_data no puede ser nulo');
    RETURN QUERY SELECT contador_actualizados, contador_no_encontrados, lista_errores;
    RETURN;
  END IF;

  -- Validar que sea un array
  IF jsonb_typeof(insumos_data) != 'array' THEN
    lista_errores := array_append(lista_errores, 'El parámetro debe ser un array JSON');
    RETURN QUERY SELECT contador_actualizados, contador_no_encontrados, lista_errores;
    RETURN;
  END IF;

  -- Iterar sobre cada elemento del array JSON
  FOR insumo_item IN SELECT * FROM jsonb_array_elements(insumos_data)
  LOOP
    BEGIN
      -- Extraer y validar el ID
      IF NOT (insumo_item ? 'id') THEN
        lista_errores := array_append(lista_errores, 'Objeto sin campo "id": ' || insumo_item::TEXT);
        CONTINUE;
      END IF;

      insumo_id := (insumo_item->>'id')::INTEGER;
      
      IF insumo_id IS NULL OR insumo_id <= 0 THEN
        lista_errores := array_append(lista_errores, 'ID inválido: ' || (insumo_item->>'id'));
        CONTINUE;
      END IF;

      -- Extraer y validar el stock
      IF NOT (insumo_item ? 'stock_actual') THEN
        lista_errores := array_append(lista_errores, 'Objeto sin campo "stock_actual" para ID ' || insumo_id);
        CONTINUE;
      END IF;

      nuevo_stock := (insumo_item->>'stock_actual')::NUMERIC(10,3);
      
      IF nuevo_stock IS NULL OR nuevo_stock < 0 THEN
        lista_errores := array_append(lista_errores, 'Stock inválido para ID ' || insumo_id || ': ' || (insumo_item->>'stock_actual'));
        CONTINUE;
      END IF;

      -- Verificar si el insumo existe
      SELECT EXISTS(
        SELECT 1 FROM public.insumos WHERE id = insumo_id
      ) INTO insumo_existe;

      IF NOT insumo_existe THEN
        contador_no_encontrados := contador_no_encontrados + 1;
        lista_errores := array_append(lista_errores, 'Insumo no encontrado con ID: ' || insumo_id);
        CONTINUE;
      END IF;

      -- Actualizar el stock del insumo
      UPDATE public.insumos 
      SET stock_actual = nuevo_stock
      WHERE id = insumo_id;

      -- Verificar que la actualización fue exitosa
      IF FOUND THEN
        contador_actualizados := contador_actualizados + 1;
      ELSE
        lista_errores := array_append(lista_errores, 'No se pudo actualizar el insumo ID: ' || insumo_id);
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Capturar cualquier error específico del insumo
      lista_errores := array_append(lista_errores, 'Error procesando insumo ID ' || COALESCE(insumo_id::TEXT, 'desconocido') || ': ' || SQLERRM);
    END;
  END LOOP;

  -- Retornar los resultados
  RETURN QUERY SELECT contador_actualizados, contador_no_encontrados, lista_errores;
END;
$$;