-- Function to get monthly trends for Business Health Chart
CREATE OR REPLACE FUNCTION get_business_health_trends(months_back INT DEFAULT 6)
RETURNS TABLE (
    mes TEXT,
    nuevos BIGINT,
    en_riesgo BIGINT,
    perdidos BIGINT
) AS $$
DECLARE
    i INT;
    start_date DATE;
    end_date DATE;
    curr_month DATE;
BEGIN
    FOR i IN 0..months_back - 1 LOOP
        curr_month := date_trunc('month', CURRENT_DATE - (i || ' month')::INTERVAL);
        start_date := curr_month;
        end_date := (curr_month + INTERVAL '1 month') - INTERVAL '1 day';
        
        RETURN QUERY
        SELECT 
            TO_CHAR(curr_month, 'Mon') as mes,
            
            -- Nuevos: Registered in this month
            (SELECT COUNT(*) 
             FROM clientes 
             WHERE date_trunc('month', insert_date) = curr_month),
             
            -- En Riesgo: Became "At Risk" in this month (last purchase was 30 days before a date in this month)
            -- Approx: Last purchase was in (Month - 1 month)
            -- Logic: If they bought on Jan 1, they become At Risk on Jan 31 (Jan).
            -- If they bought on Jan 31, they become At Risk on Mar 2 (Mar).
            -- Effectively: Count clients whose `ultima_compra` + 30 days falls in this month.
             (SELECT COUNT(*)
              FROM (
                SELECT c.id, MAX(p.insert_date) as last_purchase
                FROM clientes c
                JOIN pedidos p ON c.id = p.cliente_id
                WHERE p.estado IN ('completado', 'enviado') AND p.deleted_at IS NULL
                GROUP BY c.id
              ) as last_purchases
              WHERE date_trunc('month', last_purchase + INTERVAL '30 days') = curr_month),

            -- Perdidos: Became "Lost" in this month (last purchase was 60 days before a date in this month)
             (SELECT COUNT(*)
              FROM (
                SELECT c.id, MAX(p.insert_date) as last_purchase
                FROM clientes c
                JOIN pedidos p ON c.id = p.cliente_id
                WHERE p.estado IN ('completado', 'enviado') AND p.deleted_at IS NULL
                GROUP BY c.id
              ) as last_purchases
              WHERE date_trunc('month', last_purchase + INTERVAL '60 days') = curr_month);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get Top Products by Segment and Date Range
CREATE OR REPLACE FUNCTION get_top_products_by_segment(
    p_segment TEXT,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP
)
RETURNS TABLE (
    producto TEXT,
    cantidad BIGINT,
    total_ventas NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        prod.nombre as producto,
        COUNT(*) as cantidad,
        SUM(dp.precio_unitario * dp.cantidad) as total_ventas
    FROM detalles_pedido dp
    JOIN pedidos p ON dp.pedido_id = p.id
    JOIN productos prod ON dp.producto_id = prod.id
    JOIN clientes_segmentos cs ON p.cliente_id = cs.cliente_id
    WHERE 
        p.estado IN ('completado', 'enviado') 
        AND p.deleted_at IS NULL
        AND p.insert_date >= p_start_date
        AND p.insert_date <= p_end_date
        AND (p_segment = 'todos' OR cs.segmento = p_segment)
    GROUP BY prod.nombre
    ORDER BY cantidad DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to get Sales Distribution by Segment and Date Range
CREATE OR REPLACE FUNCTION get_sales_by_segment(
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP
)
RETURNS TABLE (
    segmento TEXT,
    total_ventas NUMERIC,
    cantidad_pedidos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.segmento,
        SUM(p.total) as total_ventas,
        COUNT(p.id) as cantidad_pedidos
    FROM pedidos p
    JOIN clientes_segmentos cs ON p.cliente_id = cs.cliente_id
    WHERE 
        p.estado IN ('completado', 'enviado') 
        AND p.deleted_at IS NULL
        AND p.insert_date >= p_start_date
        AND p.insert_date <= p_end_date
    GROUP BY cs.segmento
    ORDER BY total_ventas DESC;
END;
$$ LANGUAGE plpgsql;
