/*
  # Sistema híbrido de cálculo de costos para productos

  1. Cambios en Tablas
    - Añade columna `costo_manual_activo` a la tabla `productos`
    - Actualiza comentarios en columna `costo` existente
  
  2. Nuevas Funciones
    - `calcular_costo_desde_receta`: Calcula el costo de un producto basado en su receta
  
  3. Nuevos Triggers
    - `on_receta_change_update_costo`: Actualiza el costo cuando cambia la receta
    - `on_insumo_cost_change_update_product_cost`: Actualiza el costo cuando cambia el precio de un insumo
*/

-- 1. MODIFICAR LA TABLA DE PRODUCTOS
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS costo_manual_activo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.productos.costo_manual_activo IS 'Si es TRUE, se utiliza el valor de la columna "costo" como un valor manual y no se recalcula automáticamente. Si es FALSE, "costo" se actualiza desde la receta.';
COMMENT ON COLUMN public.productos.costo IS 'Costo efectivo del producto. Puede ser un valor manual o calculado desde la receta, dependiendo de "costo_manual_activo".';


-- 2. FUNCIÓN PARA CALCULAR EL COSTO DE UN PRODUCTO DESDE SU RECETA
CREATE OR REPLACE FUNCTION public.calcular_costo_desde_receta(p_producto_id BIGINT)
RETURNS void AS $$
DECLARE
    v_calculated_cost NUMERIC(10, 2);
BEGIN
    -- Calcula el costo sumando el costo de cada insumo en la receta
    -- Utiliza el costo del proveedor activo para cada insumo
    SELECT COALESCE(SUM(pi.cantidad_requerida * prov_i.costo_especifico), 0)
    INTO v_calculated_cost
    FROM public.producto_insumos pi
    JOIN public.proveedor_insumos prov_i ON pi.insumo_id = prov_i.insumo_id
    WHERE pi.producto_id = p_producto_id
      AND prov_i.es_proveedor_activo = TRUE;

    -- Actualiza el costo del producto solo si no se está usando el costo manual
    UPDATE public.productos
    SET costo = v_calculated_cost
    WHERE id = p_producto_id
      AND costo_manual_activo = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. TRIGGER PARA ACTUALIZAR EL COSTO CUANDO CAMBIA LA RECETA
CREATE OR REPLACE FUNCTION public.trigger_update_costo_on_receta_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.calcular_costo_desde_receta(OLD.producto_id);
    ELSE
        PERFORM public.calcular_costo_desde_receta(NEW.producto_id);
    END IF;
    RETURN NULL; -- El resultado es ignorado ya que es un trigger AFTER
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_receta_change_update_costo ON public.producto_insumos;
CREATE TRIGGER on_receta_change_update_costo
AFTER INSERT OR UPDATE OR DELETE ON public.producto_insumos
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_costo_on_receta_change();


-- 4. TRIGGER PARA ACTUALIZAR EL COSTO CUANDO CAMBIA EL PRECIO DE UN INSUMO
CREATE OR REPLACE FUNCTION public.trigger_update_costo_on_insumo_cost_change()
RETURNS TRIGGER AS $$
DECLARE
    prod_id BIGINT;
BEGIN
    -- Si el costo del proveedor activo cambió, recalcular para todos los productos que lo usan
    IF (TG_OP = 'UPDATE' AND NEW.es_proveedor_activo = TRUE AND NEW.costo_especifico IS DISTINCT FROM OLD.costo_especifico) OR
       (TG_OP = 'INSERT' AND NEW.es_proveedor_activo = TRUE) THEN
        FOR prod_id IN
            SELECT producto_id FROM public.producto_insumos WHERE insumo_id = NEW.insumo_id
        LOOP
            PERFORM public.calcular_costo_desde_receta(prod_id);
        END LOOP;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_insumo_cost_change_update_product_cost ON public.proveedor_insumos;
CREATE TRIGGER on_insumo_cost_change_update_product_cost
AFTER INSERT OR UPDATE ON public.proveedor_insumos
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_costo_on_insumo_cost_change();