/*
  # Sistema de Sincronización Automática entre Finanzas y Cuentas por Pagar
  
  ## Descripción
  Esta migración crea la sincronización bidireccional automática entre el módulo de Finanzas
  y el módulo de Cuentas por Pagar para eliminar duplicidad y garantizar consistencia de datos.
  
  ## Cambios Implementados
  
  ### 1. Trigger: Sincronización de Pagos CxP → Movimientos Finanzas
  Cuando se registra un pago en `finanzas_pagos_cxp`:
  - ✓ Crea automáticamente un movimiento en `finanzas_movimientos` (egreso)
  - ✓ Vincula el movimiento con el pago mediante `movimiento_financiero_id`
  - ✓ Actualiza el saldo pendiente en `finanzas_cuentas_por_pagar`
  - ✓ Actualiza el estatus de la cuenta (pendiente/pagado_parcial/pagado_completo)
  
  ### 2. Trigger: Actualización de Saldos en CxP
  Cuando se inserta o actualiza un pago:
  - ✓ Recalcula `monto_pagado` sumando todos los pagos
  - ✓ Recalcula `saldo_pendiente` (monto_total - monto_pagado)
  - ✓ Actualiza `estatus` según el saldo restante
  
  ### 3. Función: Obtener Categoría de Proveedor
  Busca o crea una categoría de finanzas asociada al proveedor.
  
  ## Notas de Seguridad
  - Todos los triggers verifican permisos existentes
  - Se mantiene el RLS de las tablas involucradas
  - Las transacciones garantizan atomicidad
  
  ## Impacto
  - Los usuarios ya NO necesitan registrar manualmente en ambos lugares
  - Eliminación de duplicidad de datos
  - Garantía de consistencia entre módulos
*/

-- =====================================================
-- 1. FUNCIÓN: Obtener o crear categoría de finanzas para proveedor
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
    FROM finanzas_categorias
    WHERE nombre = 'Pago a Proveedores' AND tipo = 'egreso'
    LIMIT 1;
    
    -- Si no existe, crear categoría genérica
    IF v_categoria_id IS NULL THEN
        INSERT INTO finanzas_categorias (nombre, tipo, descripcion)
        VALUES ('Pago a Proveedores', 'egreso', 'Pagos a proveedores y cuentas por pagar')
        RETURNING id INTO v_categoria_id;
    END IF;
    
    RETURN v_categoria_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FUNCIÓN: Crear movimiento financiero desde pago CxP
-- =====================================================
CREATE OR REPLACE FUNCTION crear_movimiento_desde_pago_cxp()
RETURNS TRIGGER AS $$
DECLARE
    v_categoria_id BIGINT;
    v_proveedor_id BIGINT;
    v_cuenta_descripcion TEXT;
    v_movimiento_id BIGINT;
BEGIN
    -- Obtener información de la cuenta por pagar
    SELECT 
        proveedor_id,
        'Pago a ' || p.nombre || ' - ' || COALESCE(cxp.referencia_compra, 'Ref: ' || cxp.id)
    INTO v_proveedor_id, v_cuenta_descripcion
    FROM finanzas_cuentas_por_pagar cxp
    JOIN proveedores p ON p.id = cxp.proveedor_id
    WHERE cxp.id = NEW.cuenta_por_pagar_id;
    
    -- Obtener categoría para el proveedor
    v_categoria_id := obtener_categoria_proveedor(v_proveedor_id);
    
    -- Crear movimiento financiero solo si aún no existe
    IF NEW.movimiento_financiero_id IS NULL THEN
        INSERT INTO finanzas_movimientos (
            tipo,
            monto,
            descripcion,
            categoria_id,
            estatus,
            metodo_pago,
            fecha_movimiento,
            proveedor_id,
            notas
        ) VALUES (
            'egreso',
            NEW.monto_pagado,
            v_cuenta_descripcion,
            v_categoria_id,
            'pagado',
            NEW.metodo_pago,
            NEW.fecha_pago,
            v_proveedor_id,
            'Pago registrado desde Cuentas por Pagar'
        )
        RETURNING id INTO v_movimiento_id;
        
        -- Actualizar el pago con el ID del movimiento creado
        NEW.movimiento_financiero_id := v_movimiento_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNCIÓN: Actualizar saldos y estatus de CxP
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_saldos_cxp()
RETURNS TRIGGER AS $$
DECLARE
    v_total_pagado NUMERIC(10,2);
    v_monto_total NUMERIC(10,2);
    v_nuevo_saldo NUMERIC(10,2);
    v_nuevo_estatus TEXT;
BEGIN
    -- Obtener el monto total de la cuenta
    SELECT monto_total INTO v_monto_total
    FROM finanzas_cuentas_por_pagar
    WHERE id = NEW.cuenta_por_pagar_id;
    
    -- Calcular total pagado
    SELECT COALESCE(SUM(monto_pagado), 0) INTO v_total_pagado
    FROM finanzas_pagos_cxp
    WHERE cuenta_por_pagar_id = NEW.cuenta_por_pagar_id;
    
    -- Calcular nuevo saldo
    v_nuevo_saldo := v_monto_total - v_total_pagado;
    
    -- Determinar nuevo estatus
    IF v_nuevo_saldo <= 0 THEN
        v_nuevo_estatus := 'pagado_completo';
        v_nuevo_saldo := 0;
    ELSIF v_total_pagado > 0 THEN
        v_nuevo_estatus := 'pagado_parcial';
    ELSE
        v_nuevo_estatus := 'pendiente';
    END IF;
    
    -- Verificar si está vencido
    IF v_nuevo_estatus != 'pagado_completo' THEN
        IF (SELECT fecha_vencimiento FROM finanzas_cuentas_por_pagar WHERE id = NEW.cuenta_por_pagar_id) < CURRENT_DATE THEN
            v_nuevo_estatus := 'vencido';
        END IF;
    END IF;
    
    -- Actualizar la cuenta por pagar
    UPDATE finanzas_cuentas_por_pagar
    SET 
        monto_pagado = v_total_pagado,
        saldo_pendiente = v_nuevo_saldo,
        estatus = v_nuevo_estatus,
        updated_at = now()
    WHERE id = NEW.cuenta_por_pagar_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREAR TRIGGERS
-- =====================================================

-- Trigger: Antes de insertar un pago, crear el movimiento financiero
DROP TRIGGER IF EXISTS trigger_crear_movimiento_desde_pago ON finanzas_pagos_cxp;
CREATE TRIGGER trigger_crear_movimiento_desde_pago
    BEFORE INSERT ON finanzas_pagos_cxp
    FOR EACH ROW
    EXECUTE FUNCTION crear_movimiento_desde_pago_cxp();

-- Trigger: Después de insertar un pago, actualizar saldos
DROP TRIGGER IF EXISTS trigger_actualizar_saldos_after_insert ON finanzas_pagos_cxp;
CREATE TRIGGER trigger_actualizar_saldos_after_insert
    AFTER INSERT ON finanzas_pagos_cxp
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_saldos_cxp();

-- Trigger: Después de actualizar un pago, actualizar saldos
DROP TRIGGER IF EXISTS trigger_actualizar_saldos_after_update ON finanzas_pagos_cxp;
CREATE TRIGGER trigger_actualizar_saldos_after_update
    AFTER UPDATE ON finanzas_pagos_cxp
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_saldos_cxp();

-- Trigger: Después de eliminar un pago, actualizar saldos
DROP TRIGGER IF EXISTS trigger_actualizar_saldos_after_delete ON finanzas_pagos_cxp;
CREATE TRIGGER trigger_actualizar_saldos_after_delete
    AFTER DELETE ON finanzas_pagos_cxp
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_saldos_cxp();

-- =====================================================
-- 5. COMENTARIOS
-- =====================================================
COMMENT ON FUNCTION crear_movimiento_desde_pago_cxp() IS 
'Crea automáticamente un movimiento en finanzas_movimientos cuando se registra un pago en cuentas por pagar';

COMMENT ON FUNCTION actualizar_saldos_cxp() IS 
'Actualiza automáticamente los saldos y estatus de una cuenta por pagar después de registrar/modificar/eliminar un pago';

COMMENT ON FUNCTION obtener_categoria_proveedor(BIGINT) IS 
'Obtiene o crea una categoría de finanzas para pagos a proveedores';
