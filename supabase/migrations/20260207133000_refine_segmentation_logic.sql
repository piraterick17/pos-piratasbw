/*
  # Update CRM Segmentation Logic

  Refines the customer segmentation rules as requested:
  1.  **Nuevo**: Registered on or after 2026-01-01.
  2.  **VIP**: > 4 purchases per month (approx. frequency < 7.5 days).
  3.  **Regular**: 2-3 purchases per month (approx. frequency 10-15 days).
  4.  **En Riesgo**: Not purchased in > 30 days.
  5.  **Inactivo (Perdido)**: Not purchased in > 60 days (kept previous logic for 'Perdidos').

  Also updates the `calcular_segmento_cliente` function.
*/

CREATE OR REPLACE FUNCTION calcular_segmento_cliente(p_cliente_id uuid)
RETURNS text AS $$
DECLARE
  v_total_pedidos integer;
  v_total_gastado numeric;
  v_ultima_compra date;
  v_dias_sin_comprar integer;
  v_fecha_registro timestamptz;
  v_frecuencia_dias numeric;
  v_segmento text;
  v_meses_activo numeric;
  v_ventas_por_mes numeric;
BEGIN
  -- Obtener estadísticas del cliente
  SELECT 
    COUNT(p.id),
    COALESCE(SUM(p.total), 0),
    MAX(DATE(p.insert_date))
  INTO v_total_pedidos, v_total_gastado, v_ultima_compra
  FROM pedidos p
  WHERE p.cliente_id = p_cliente_id
    AND p.deleted_at IS NULL
    AND p.estado IN ('completado', 'enviado');
  
  -- Obtener fecha registro (usando insert_date)
  SELECT insert_date INTO v_fecha_registro FROM clientes WHERE id = p_cliente_id;

  -- Calcular días sin comprar
  v_dias_sin_comprar := COALESCE(CURRENT_DATE - v_ultima_compra, 0);

  -- Calcular meses activo (mínimo 1 para evitar división por cero)
  v_meses_activo := GREATEST(EXTRACT(EPOCH FROM (now() - v_fecha_registro)) / 2592000, 1);
  
  -- Calcular ventas por mes
  v_ventas_por_mes := v_total_pedidos / v_meses_activo;
  
  -- Reglas de Negocio
  
  -- 1. En Riesgo / Inactivo (Prioridad por inactividad reciente)
  IF v_ultima_compra IS NOT NULL AND v_dias_sin_comprar > 60 THEN
     v_segmento := 'inactivo'; -- "Perdido"
  ELSIF v_ultima_compra IS NOT NULL AND v_dias_sin_comprar > 30 THEN
     v_segmento := 'en_riesgo';
  
  -- 2. VIP (> 4 compras al mes)
  ELSIF v_ventas_por_mes > 4 THEN
     v_segmento := 'vip';

  -- 3. Regular (2-3 compras al mes)
  ELSIF v_ventas_por_mes >= 2 THEN
     v_segmento := 'regular';

  -- 4. Nuevo (Registrado en 2026)
  ELSIF v_fecha_registro >= '2026-01-01'::date THEN
     v_segmento := 'nuevo';

  -- Default para otros casos (baja frecuencia, antiguos)
  ELSE
     v_segmento := 'regular'; 
  END IF;

  RETURN v_segmento;
END;
$$ LANGUAGE plpgsql;

-- Forzar recalculo de todos los segmentos
SELECT actualizar_segmentos_clientes();
