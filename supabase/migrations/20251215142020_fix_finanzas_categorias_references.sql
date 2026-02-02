/*
  # Corregir referencias a finanzas_categorias → finanzas_categorias_gastos
  
  1. Problema
    - La función `obtener_categoria_proveedor` hace referencia a una tabla inexistente `finanzas_categorias`
    - La tabla correcta es `finanzas_categorias_gastos`
  
  2. Solución
    - Reemplazar la función con las referencias correctas
    - Eliminar referencia a columna `tipo` que no existe en la tabla
*/

-- =====================================================
-- Reemplazar función con referencias correctas
-- =====================================================
CREATE OR REPLACE FUNCTION obtener_categoria_proveedor(p_proveedor_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
    v_categoria_id BIGINT;
    v_proveedor_nombre TEXT;
BEGIN
    -- Obtener nombre del proveedor
    SELECT nombre INTO v_proveedor_nombre
    FROM proveedores
    WHERE id = p_proveedor_id;
    
    -- Buscar categoría existente para proveedores
    SELECT id INTO v_categoria_id
    FROM finanzas_categorias_gastos
    WHERE nombre = 'Pago a Proveedores'
    LIMIT 1;
    
    -- Si no existe, crear categoría genérica
    IF v_categoria_id IS NULL THEN
        INSERT INTO finanzas_categorias_gastos (nombre, descripcion)
        VALUES ('Pago a Proveedores', 'Pagos a proveedores y cuentas por pagar')
        RETURNING id INTO v_categoria_id;
    END IF;
    
    RETURN v_categoria_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar comentario
COMMENT ON FUNCTION obtener_categoria_proveedor(BIGINT) IS 
'Obtiene o crea una categoría de finanzas para pagos a proveedores (corregida para usar finanzas_categorias_gastos)';
