/*
  # CRM Analytics Functions

  1.  `get_top_products_by_segment`: Returns top selling products filtered by customer segment.
*/

CREATE OR REPLACE FUNCTION get_top_products_by_segment(p_segmento text)
RETURNS TABLE (
  producto_id bigint,
  producto_nombre text,
  veces_comprado bigint,
  total_gastado_producto numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    prod.id as producto_id,
    prod.nombre as producto_nombre,
    COUNT(dp.id) as veces_comprado,
    SUM(dp.subtotal) as total_gastado_producto
  FROM pedidos p
  INNER JOIN clientes_segmentos cs ON p.cliente_id = cs.cliente_id
  INNER JOIN detalles_pedido dp ON p.id = dp.pedido_id
  INNER JOIN productos prod ON dp.producto_id = prod.id
  WHERE p.estado IN ('completado', 'enviado')
    AND p.deleted_at IS NULL
    AND cs.segmento = p_segmento
  GROUP BY prod.id, prod.nombre
  ORDER BY veces_comprado DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_products_by_segment TO authenticated;
