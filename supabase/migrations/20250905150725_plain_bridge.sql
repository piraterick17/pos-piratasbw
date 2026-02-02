/*
  # Actualizar función actualizar_stock_insumos_batch

  1. Modificaciones
    - Actualiza la función `actualizar_stock_insumos_batch` para registrar movimientos en lugar de actualizar directamente
    - Calcula la diferencia entre el stock actual y el nuevo stock
    - Inserta registros en `movimientos_insumo` con tipo 'ajuste'
    - El trigger existente `on_movimiento_insumo_insert` se encarga de actualizar el `stock_actual`

  2. Beneficios
    - Mantiene trazabilidad completa de todos los cambios de stock
    - Utiliza el sistema de triggers existente para consistencia
    - Registra automáticamente quién hizo el cambio y cuándo
*/

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS actualizar_stock_insumos_batch(jsonb);

-- Crear la función actualizada que registra movimientos
CREATE OR REPLACE FUNCTION actualizar_stock_insumos_batch(insumos_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    insumo_record jsonb;
    current_stock numeric(10,3);
    new_stock numeric(10,3);
    stock_difference numeric(10,3);
    insumo_id_val bigint;
BEGIN
    -- Iterar sobre cada insumo en el array JSON
    FOR insumo_record IN SELECT * FROM jsonb_array_elements(insumos_data)
    LOOP
        -- Extraer valores del JSON
        insumo_id_val := (insumo_record->>'id')::bigint;
        new_stock := (insumo_record->>'stock_actual')::numeric(10,3);
        
        -- Obtener el stock actual de la base de datos
        SELECT stock_actual INTO current_stock 
        FROM insumos 
        WHERE id = insumo_id_val;
        
        -- Si no se encuentra el insumo, continuar con el siguiente
        IF current_stock IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Calcular la diferencia
        stock_difference := new_stock - current_stock;
        
        -- Solo crear un movimiento si hay diferencia
        IF stock_difference != 0 THEN
            -- Insertar el movimiento en la tabla movimientos_insumo
            -- El trigger on_movimiento_insumo_insert se encargará de actualizar el stock_actual
            INSERT INTO movimientos_insumo (
                insumo_id,
                tipo_movimiento,
                cantidad,
                motivo,
                fecha,
                usuario_id
            ) VALUES (
                insumo_id_val,
                'ajuste',
                stock_difference,
                CASE 
                    WHEN stock_difference > 0 THEN 'Ajuste de inventario - Incremento desde actualización masiva'
                    ELSE 'Ajuste de inventario - Reducción desde actualización masiva'
                END,
                NOW(),
                auth.uid()
            );
        END IF;
    END LOOP;
END;
$$;