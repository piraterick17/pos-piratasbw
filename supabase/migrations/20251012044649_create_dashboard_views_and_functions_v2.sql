/*
  # Crear vistas y funciones para Dashboard de Análisis
  
  1. Vistas Materializadas
    - `v_metricas_vendedores` - Métricas agregadas por vendedor
    - `v_productos_mas_vendidos` - Ranking de productos más vendidos
    - `v_analisis_tiempos_entrega` - Análisis de tiempos de entrega por horario
    
  2. Funciones
    - `get_metricas_vendedor_periodo` - Obtener métricas de vendedor en un período
    - `get_tendencia_tiempos_entrega` - Obtener tendencias de tiempos de entrega
    - `get_productos_top_ventas` - Obtener top productos por ventas
    - `get_resumen_ventas_dia` - Obtener resumen de ventas del día
    
  3. Propósito
    - Optimizar consultas del dashboard
    - Proveer datos agregados para gráficos
    - Facilitar análisis de tendencias temporales
*/

-- Vista: Métricas de Vendedores
CREATE OR REPLACE VIEW v_metricas_vendedores AS
SELECT 
  mv.vendedor_id,
  au.email as vendedor_email,
  au.raw_user_meta_data->>'nombre' as vendedor_nombre,
  COUNT(mv.id) as total_ventas,
  COUNT(CASE WHEN mv.ofrecio_acompanamiento = true THEN 1 END) as veces_ofrecio_acompanamiento,
  COUNT(CASE WHEN mv.acepto_acompanamiento = true THEN 1 END) as veces_acepto_acompanamiento,
  COUNT(CASE WHEN mv.ofrecio_postre = true THEN 1 END) as veces_ofrecio_postre,
  COUNT(CASE WHEN mv.acepto_postre = true THEN 1 END) as veces_acepto_postre,
  CASE 
    WHEN COUNT(CASE WHEN mv.ofrecio_acompanamiento = true THEN 1 END) > 0 
    THEN ROUND((COUNT(CASE WHEN mv.acepto_acompanamiento = true THEN 1 END)::numeric / 
                COUNT(CASE WHEN mv.ofrecio_acompanamiento = true THEN 1 END)::numeric * 100), 2)
    ELSE 0 
  END as tasa_conversion_acompanamiento,
  CASE 
    WHEN COUNT(CASE WHEN mv.ofrecio_postre = true THEN 1 END) > 0 
    THEN ROUND((COUNT(CASE WHEN mv.acepto_postre = true THEN 1 END)::numeric / 
                COUNT(CASE WHEN mv.ofrecio_postre = true THEN 1 END)::numeric * 100), 2)
    ELSE 0 
  END as tasa_conversion_postre,
  AVG(mv.tiempo_entrega_prometido) as tiempo_entrega_promedio
FROM metricas_venta mv
LEFT JOIN auth.users au ON mv.vendedor_id = au.id
GROUP BY mv.vendedor_id, au.email, au.raw_user_meta_data->>'nombre';

-- Vista: Productos Más Vendidos
CREATE OR REPLACE VIEW v_productos_mas_vendidos AS
SELECT 
  dp.producto_id,
  p.nombre as producto_nombre,
  p.categoria_id,
  c.nombre as categoria_nombre,
  COUNT(dp.id) as cantidad_pedidos,
  SUM(dp.cantidad) as unidades_vendidas,
  SUM(dp.subtotal) as ingresos_totales,
  AVG(dp.precio_unitario) as precio_promedio,
  MAX(ped.insert_date) as ultima_venta
FROM detalles_pedido dp
INNER JOIN productos p ON dp.producto_id = p.id
LEFT JOIN categorias c ON p.categoria_id = c.id
INNER JOIN pedidos ped ON dp.pedido_id = ped.id
WHERE ped.estado IN ('completado', 'preparando', 'enviado', 'pendiente')
GROUP BY dp.producto_id, p.nombre, p.categoria_id, c.nombre;

-- Vista: Análisis de Tiempos de Entrega por Horario
CREATE OR REPLACE VIEW v_analisis_tiempos_entrega AS
SELECT 
  EXTRACT(HOUR FROM mv.fecha_hora) as hora_del_dia,
  EXTRACT(DOW FROM mv.fecha_hora) as dia_semana,
  COUNT(mv.id) as cantidad_pedidos,
  AVG(mv.tiempo_entrega_prometido) as tiempo_promedio_prometido,
  MIN(mv.tiempo_entrega_prometido) as tiempo_minimo,
  MAX(mv.tiempo_entrega_prometido) as tiempo_maximo,
  STDDEV(mv.tiempo_entrega_prometido) as desviacion_estandar
FROM metricas_venta mv
GROUP BY EXTRACT(HOUR FROM mv.fecha_hora), EXTRACT(DOW FROM mv.fecha_hora);

-- Función: Obtener métricas de vendedor en un período específico
CREATE OR REPLACE FUNCTION get_metricas_vendedor_periodo(
  p_vendedor_id uuid,
  p_fecha_inicio timestamptz,
  p_fecha_fin timestamptz
)
RETURNS TABLE(
  total_ventas bigint,
  ofrecio_acompanamiento bigint,
  acepto_acompanamiento bigint,
  ofrecio_postre bigint,
  acepto_postre bigint,
  tasa_conversion_acompanamiento numeric,
  tasa_conversion_postre numeric,
  tiempo_entrega_promedio numeric,
  total_ingresos numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(mv.id)::bigint as total_ventas,
    COUNT(CASE WHEN mv.ofrecio_acompanamiento = true THEN 1 END)::bigint as ofrecio_acompanamiento,
    COUNT(CASE WHEN mv.acepto_acompanamiento = true THEN 1 END)::bigint as acepto_acompanamiento,
    COUNT(CASE WHEN mv.ofrecio_postre = true THEN 1 END)::bigint as ofrecio_postre,
    COUNT(CASE WHEN mv.acepto_postre = true THEN 1 END)::bigint as acepto_postre,
    CASE 
      WHEN COUNT(CASE WHEN mv.ofrecio_acompanamiento = true THEN 1 END) > 0 
      THEN ROUND((COUNT(CASE WHEN mv.acepto_acompanamiento = true THEN 1 END)::numeric / 
                  COUNT(CASE WHEN mv.ofrecio_acompanamiento = true THEN 1 END)::numeric * 100), 2)
      ELSE 0 
    END as tasa_conversion_acompanamiento,
    CASE 
      WHEN COUNT(CASE WHEN mv.ofrecio_postre = true THEN 1 END) > 0 
      THEN ROUND((COUNT(CASE WHEN mv.acepto_postre = true THEN 1 END)::numeric / 
                  COUNT(CASE WHEN mv.ofrecio_postre = true THEN 1 END)::numeric * 100), 2)
      ELSE 0 
    END as tasa_conversion_postre,
    ROUND(AVG(mv.tiempo_entrega_prometido), 2) as tiempo_entrega_promedio,
    COALESCE(SUM(p.total), 0) as total_ingresos
  FROM metricas_venta mv
  LEFT JOIN pedidos p ON mv.pedido_id = p.id
  WHERE mv.vendedor_id = p_vendedor_id
    AND mv.fecha_hora BETWEEN p_fecha_inicio AND p_fecha_fin;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener tendencia de tiempos de entrega
CREATE OR REPLACE FUNCTION get_tendencia_tiempos_entrega(
  p_fecha_inicio timestamptz,
  p_fecha_fin timestamptz
)
RETURNS TABLE(
  hora integer,
  dia_semana integer,
  cantidad_pedidos bigint,
  tiempo_promedio numeric,
  tiempo_minimo integer,
  tiempo_maximo integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM mv.fecha_hora)::integer as hora,
    EXTRACT(DOW FROM mv.fecha_hora)::integer as dia_semana,
    COUNT(mv.id)::bigint as cantidad_pedidos,
    ROUND(AVG(mv.tiempo_entrega_prometido), 2) as tiempo_promedio,
    MIN(mv.tiempo_entrega_prometido) as tiempo_minimo,
    MAX(mv.tiempo_entrega_prometido) as tiempo_maximo
  FROM metricas_venta mv
  WHERE mv.fecha_hora BETWEEN p_fecha_inicio AND p_fecha_fin
  GROUP BY EXTRACT(HOUR FROM mv.fecha_hora), EXTRACT(DOW FROM mv.fecha_hora)
  ORDER BY hora, dia_semana;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener top productos por ventas
CREATE OR REPLACE FUNCTION get_productos_top_ventas(
  p_fecha_inicio timestamptz,
  p_fecha_fin timestamptz,
  p_limite integer DEFAULT 10
)
RETURNS TABLE(
  producto_id bigint,
  producto_nombre text,
  categoria_nombre text,
  unidades_vendidas bigint,
  ingresos_totales numeric,
  cantidad_pedidos bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.producto_id,
    p.nombre as producto_nombre,
    c.nombre as categoria_nombre,
    SUM(dp.cantidad)::bigint as unidades_vendidas,
    ROUND(SUM(dp.subtotal), 2) as ingresos_totales,
    COUNT(DISTINCT dp.pedido_id)::bigint as cantidad_pedidos
  FROM detalles_pedido dp
  INNER JOIN productos p ON dp.producto_id = p.id
  LEFT JOIN categorias c ON p.categoria_id = c.id
  INNER JOIN pedidos ped ON dp.pedido_id = ped.id
  WHERE ped.insert_date BETWEEN p_fecha_inicio AND p_fecha_fin
    AND ped.estado IN ('completado', 'preparando', 'enviado', 'pendiente')
  GROUP BY dp.producto_id, p.nombre, c.nombre
  ORDER BY unidades_vendidas DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener resumen de ventas del día
CREATE OR REPLACE FUNCTION get_resumen_ventas_dia(p_fecha date)
RETURNS TABLE(
  total_pedidos bigint,
  pedidos_completados bigint,
  pedidos_pendientes bigint,
  ingresos_totales numeric,
  ticket_promedio numeric,
  tiempo_entrega_promedio numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(p.id)::bigint as total_pedidos,
    COUNT(CASE WHEN p.estado = 'completado' THEN 1 END)::bigint as pedidos_completados,
    COUNT(CASE WHEN p.estado IN ('pendiente', 'preparando') THEN 1 END)::bigint as pedidos_pendientes,
    ROUND(COALESCE(SUM(CASE WHEN p.estado = 'completado' THEN p.total END), 0), 2) as ingresos_totales,
    ROUND(COALESCE(AVG(CASE WHEN p.estado = 'completado' THEN p.total END), 0), 2) as ticket_promedio,
    ROUND(COALESCE(AVG(p.tiempo_entrega_minutos), 0), 2) as tiempo_entrega_promedio
  FROM pedidos p
  WHERE DATE(p.insert_date) = p_fecha;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON VIEW v_metricas_vendedores IS 'Vista agregada de métricas de desempeño por vendedor';
COMMENT ON VIEW v_productos_mas_vendidos IS 'Ranking de productos por volumen de ventas y ingresos';
COMMENT ON VIEW v_analisis_tiempos_entrega IS 'Análisis de tiempos de entrega por hora del día y día de la semana';
COMMENT ON FUNCTION get_metricas_vendedor_periodo IS 'Obtiene métricas detalladas de un vendedor en un período específico';
COMMENT ON FUNCTION get_tendencia_tiempos_entrega IS 'Analiza tendencias de tiempos de entrega por hora y día';
COMMENT ON FUNCTION get_productos_top_ventas IS 'Obtiene los productos más vendidos en un período';
COMMENT ON FUNCTION get_resumen_ventas_dia IS 'Obtiene resumen general de ventas de un día específico';
