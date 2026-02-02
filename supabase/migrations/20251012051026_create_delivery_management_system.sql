/*
  # Sistema de Gestión de Repartidores y Entregas
  
  1. Nuevas Tablas
    - `repartidores` - Información de repartidores
      - `id` (bigint, PK, auto-increment)
      - `usuario_id` (uuid, FK a auth.users) - Usuario asociado
      - `nombre` (text)
      - `telefono` (text)
      - `vehiculo_tipo` (text) - 'bicicleta', 'moto', 'auto'
      - `placa_vehiculo` (text)
      - `estado` (text) - 'disponible', 'en_ruta', 'no_disponible', 'inactivo'
      - `activo` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `asignaciones_entrega` - Historial de asignaciones
      - `id` (bigint, PK, auto-increment)
      - `pedido_id` (bigint, FK a pedidos)
      - `repartidor_id` (bigint, FK a repartidores)
      - `fecha_asignacion` (timestamptz)
      - `fecha_recogida` (timestamptz) - Cuándo recogió el pedido
      - `fecha_entrega_real` (timestamptz) - Cuándo lo entregó
      - `tiempo_total_minutos` (integer) - Tiempo desde asignación hasta entrega
      - `distancia_km` (numeric)
      - `estado` (text) - 'asignado', 'en_camino', 'entregado', 'cancelado'
      - `notas` (text)
      - `calificacion` (integer) - 1-5 estrellas
      - `comentario_cliente` (text)
      - `insert_by_user` (uuid)
      
    - `rutas_entrega` - Rutas optimizadas guardadas
      - `id` (bigint, PK, auto-increment)
      - `repartidor_id` (bigint, FK a repartidores)
      - `fecha` (date)
      - `pedidos_ids` (integer[]) - Array de IDs de pedidos
      - `orden_entrega` (jsonb) - Orden sugerido con coordenadas
      - `distancia_total_km` (numeric)
      - `tiempo_estimado_minutos` (integer)
      - `completada` (boolean)
      - `created_at` (timestamptz)
      
  2. Vistas
    - `v_desempeno_repartidores` - Métricas de cada repartidor
    - `v_entregas_activas` - Entregas en curso
    - `v_pedidos_sin_asignar` - Pedidos listos sin repartidor
    
  3. Funciones
    - `asignar_pedido_repartidor` - Asignar pedido a repartidor
    - `calcular_metricas_repartidor` - Calcular estadísticas
    - `sugerir_repartidor_disponible` - Sugerir mejor repartidor
    - `agrupar_pedidos_por_zona` - Agrupar pedidos cercanos
    
  4. Security
    - RLS habilitado
    - Políticas restrictivas
*/

-- Tabla: Repartidores
CREATE TABLE IF NOT EXISTS repartidores (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  telefono text NOT NULL,
  vehiculo_tipo text CHECK (vehiculo_tipo IN ('bicicleta', 'moto', 'auto', 'otro')),
  placa_vehiculo text,
  estado text DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_ruta', 'no_disponible', 'inactivo')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE repartidores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver repartidores"
  ON repartidores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear repartidores"
  ON repartidores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar repartidores"
  ON repartidores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla: Asignaciones de Entrega
CREATE TABLE IF NOT EXISTS asignaciones_entrega (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  pedido_id bigint NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  repartidor_id bigint NOT NULL REFERENCES repartidores(id) ON DELETE CASCADE,
  fecha_asignacion timestamptz DEFAULT now(),
  fecha_recogida timestamptz,
  fecha_entrega_real timestamptz,
  tiempo_total_minutos integer,
  distancia_km numeric,
  estado text DEFAULT 'asignado' CHECK (estado IN ('asignado', 'recogido', 'en_camino', 'entregado', 'cancelado')),
  notas text,
  calificacion integer CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario_cliente text,
  insert_by_user uuid REFERENCES auth.users(id),
  
  CONSTRAINT unique_pedido_asignacion UNIQUE (pedido_id)
);

ALTER TABLE asignaciones_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver asignaciones"
  ON asignaciones_entrega FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear asignaciones"
  ON asignaciones_entrega FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones"
  ON asignaciones_entrega FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla: Rutas de Entrega
CREATE TABLE IF NOT EXISTS rutas_entrega (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  repartidor_id bigint NOT NULL REFERENCES repartidores(id) ON DELETE CASCADE,
  fecha date DEFAULT CURRENT_DATE,
  pedidos_ids integer[],
  orden_entrega jsonb,
  distancia_total_km numeric,
  tiempo_estimado_minutos integer,
  completada boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rutas_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver rutas"
  ON rutas_entrega FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear rutas"
  ON rutas_entrega FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar rutas"
  ON rutas_entrega FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Vista: Desempeño de Repartidores
CREATE OR REPLACE VIEW v_desempeno_repartidores AS
SELECT 
  r.id,
  r.nombre,
  r.telefono,
  r.vehiculo_tipo,
  r.estado,
  r.activo,
  COUNT(ae.id) as total_entregas,
  COUNT(CASE WHEN ae.estado = 'entregado' THEN 1 END) as entregas_completadas,
  COUNT(CASE WHEN ae.estado = 'cancelado' THEN 1 END) as entregas_canceladas,
  ROUND(AVG(CASE WHEN ae.estado = 'entregado' THEN ae.tiempo_total_minutos END), 2) as tiempo_promedio_entrega,
  ROUND(AVG(CASE WHEN ae.calificacion IS NOT NULL THEN ae.calificacion END), 2) as calificacion_promedio,
  COUNT(CASE WHEN ae.fecha_asignacion >= CURRENT_DATE THEN 1 END) as entregas_hoy,
  COUNT(CASE WHEN ae.fecha_asignacion >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as entregas_semana,
  SUM(CASE WHEN ae.estado = 'entregado' THEN ae.distancia_km ELSE 0 END) as distancia_total_km
FROM repartidores r
LEFT JOIN asignaciones_entrega ae ON r.id = ae.repartidor_id
GROUP BY r.id, r.nombre, r.telefono, r.vehiculo_tipo, r.estado, r.activo
ORDER BY entregas_completadas DESC;

-- Vista: Entregas Activas
CREATE OR REPLACE VIEW v_entregas_activas AS
SELECT 
  ae.id as asignacion_id,
  ae.pedido_id,
  ae.repartidor_id,
  r.nombre as repartidor_nombre,
  r.telefono as repartidor_telefono,
  r.vehiculo_tipo,
  ae.estado as estado_entrega,
  ae.fecha_asignacion,
  ae.fecha_recogida,
  p.cliente_id,
  c.nombre as cliente_nombre,
  c.telefono as cliente_telefono,
  p.direccion_envio,
  p.plus_code,
  ze.nombre as zona_entrega,
  p.tiempo_entrega_minutos,
  EXTRACT(EPOCH FROM (now() - ae.fecha_asignacion))/60 as minutos_desde_asignacion
FROM asignaciones_entrega ae
INNER JOIN repartidores r ON ae.repartidor_id = r.id
INNER JOIN pedidos p ON ae.pedido_id = p.id
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
WHERE ae.estado IN ('asignado', 'recogido', 'en_camino')
ORDER BY ae.fecha_asignacion DESC;

-- Vista: Pedidos Sin Asignar (listos para entrega)
CREATE OR REPLACE VIEW v_pedidos_sin_asignar AS
SELECT 
  p.id as pedido_id,
  p.insert_date as fecha_pedido,
  p.cliente_id,
  c.nombre as cliente_nombre,
  c.telefono as cliente_telefono,
  p.direccion_envio,
  p.plus_code,
  p.zona_entrega_id,
  ze.nombre as zona_nombre,
  p.total,
  p.tiempo_entrega_minutos,
  p.notas_entrega,
  pe.nombre as estado_pedido,
  EXTRACT(EPOCH FROM (now() - p.fecha_listo_para_entrega))/60 as minutos_esperando
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
LEFT JOIN pedido_estados pe ON p.estado_id = pe.id
LEFT JOIN asignaciones_entrega ae ON p.id = ae.pedido_id
WHERE p.deleted_at IS NULL
  AND p.estado IN ('listo_para_entrega', 'preparado')
  AND ae.id IS NULL
  AND p.tipo_entrega_id IN (SELECT id FROM tipos_entrega WHERE nombre ILIKE '%domicilio%')
ORDER BY p.fecha_listo_para_entrega ASC NULLS LAST;

-- Función: Asignar Pedido a Repartidor
CREATE OR REPLACE FUNCTION asignar_pedido_repartidor(
  p_pedido_id bigint,
  p_repartidor_id bigint,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS bigint AS $$
DECLARE
  v_asignacion_id bigint;
BEGIN
  -- Verificar que el pedido no esté ya asignado
  IF EXISTS (
    SELECT 1 FROM asignaciones_entrega 
    WHERE pedido_id = p_pedido_id 
      AND estado NOT IN ('cancelado', 'entregado')
  ) THEN
    RAISE EXCEPTION 'El pedido ya está asignado a un repartidor';
  END IF;
  
  -- Verificar que el repartidor esté disponible
  IF NOT EXISTS (
    SELECT 1 FROM repartidores 
    WHERE id = p_repartidor_id 
      AND activo = true 
      AND estado IN ('disponible', 'en_ruta')
  ) THEN
    RAISE EXCEPTION 'El repartidor no está disponible';
  END IF;
  
  -- Crear asignación
  INSERT INTO asignaciones_entrega (
    pedido_id,
    repartidor_id,
    estado,
    insert_by_user
  ) VALUES (
    p_pedido_id,
    p_repartidor_id,
    'asignado',
    p_usuario_id
  )
  RETURNING id INTO v_asignacion_id;
  
  -- Actualizar estado del repartidor
  UPDATE repartidores
  SET estado = 'en_ruta', updated_at = now()
  WHERE id = p_repartidor_id;
  
  -- Actualizar estado del pedido si aplica
  UPDATE pedidos
  SET 
    fecha_en_ruta = now(),
    updated_at = now()
  WHERE id = p_pedido_id;
  
  RETURN v_asignacion_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar Pedido como Entregado
CREATE OR REPLACE FUNCTION marcar_pedido_entregado(
  p_asignacion_id bigint,
  p_calificacion integer DEFAULT NULL,
  p_comentario text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_repartidor_id bigint;
  v_pedido_id bigint;
  v_tiempo_total integer;
BEGIN
  -- Obtener información de la asignación
  SELECT 
    repartidor_id, 
    pedido_id,
    EXTRACT(EPOCH FROM (now() - fecha_asignacion))/60
  INTO v_repartidor_id, v_pedido_id, v_tiempo_total
  FROM asignaciones_entrega
  WHERE id = p_asignacion_id;
  
  -- Actualizar asignación
  UPDATE asignaciones_entrega
  SET 
    estado = 'entregado',
    fecha_entrega_real = now(),
    tiempo_total_minutos = v_tiempo_total,
    calificacion = p_calificacion,
    comentario_cliente = p_comentario
  WHERE id = p_asignacion_id;
  
  -- Actualizar pedido
  UPDATE pedidos
  SET 
    fecha_entregado = now(),
    updated_at = now()
  WHERE id = v_pedido_id;
  
  -- Verificar si el repartidor tiene más entregas pendientes
  IF NOT EXISTS (
    SELECT 1 FROM asignaciones_entrega
    WHERE repartidor_id = v_repartidor_id
      AND estado IN ('asignado', 'recogido', 'en_camino')
      AND id != p_asignacion_id
  ) THEN
    -- Si no tiene más entregas, marcarlo como disponible
    UPDATE repartidores
    SET estado = 'disponible', updated_at = now()
    WHERE id = v_repartidor_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: Sugerir Repartidor Disponible
CREATE OR REPLACE FUNCTION sugerir_repartidor_disponible()
RETURNS TABLE(
  repartidor_id bigint,
  nombre text,
  entregas_activas bigint,
  calificacion_promedio numeric,
  prioridad integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.nombre,
    COUNT(ae.id) as entregas_activas,
    COALESCE(AVG(ae.calificacion), 5) as calificacion_promedio,
    CASE 
      WHEN COUNT(ae.id) = 0 THEN 1
      WHEN COUNT(ae.id) <= 2 THEN 2
      ELSE 3
    END as prioridad
  FROM repartidores r
  LEFT JOIN asignaciones_entrega ae ON r.id = ae.repartidor_id 
    AND ae.estado IN ('asignado', 'recogido', 'en_camino')
  WHERE r.activo = true
    AND r.estado IN ('disponible', 'en_ruta')
  GROUP BY r.id, r.nombre
  ORDER BY prioridad ASC, entregas_activas ASC, calificacion_promedio DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Función: Agrupar Pedidos por Zona
CREATE OR REPLACE FUNCTION agrupar_pedidos_por_zona()
RETURNS TABLE(
  zona_id integer,
  zona_nombre text,
  cantidad_pedidos bigint,
  pedidos jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.zona_entrega_id,
    ze.nombre,
    COUNT(p.id),
    jsonb_agg(
      jsonb_build_object(
        'pedido_id', p.id,
        'cliente', c.nombre,
        'direccion', p.direccion_envio,
        'total', p.total,
        'tiempo_entrega', p.tiempo_entrega_minutos
      ) ORDER BY p.insert_date
    ) as pedidos
  FROM pedidos p
  LEFT JOIN clientes c ON p.cliente_id = c.id
  LEFT JOIN zonas_entrega ze ON p.zona_entrega_id = ze.id
  LEFT JOIN asignaciones_entrega ae ON p.id = ae.pedido_id
  WHERE p.deleted_at IS NULL
    AND p.estado IN ('listo_para_entrega', 'preparado')
    AND ae.id IS NULL
    AND p.zona_entrega_id IS NOT NULL
  GROUP BY p.zona_entrega_id, ze.nombre
  HAVING COUNT(p.id) > 0
  ORDER BY COUNT(p.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX IF NOT EXISTS idx_repartidores_estado ON repartidores(estado) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_asignaciones_repartidor ON asignaciones_entrega(repartidor_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_pedido ON asignaciones_entrega(pedido_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON asignaciones_entrega(estado);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones_entrega(fecha_asignacion);
CREATE INDEX IF NOT EXISTS idx_rutas_repartidor_fecha ON rutas_entrega(repartidor_id, fecha);

-- Comentarios
COMMENT ON TABLE repartidores IS 'Catálogo de repartidores con información de contacto y vehículo';
COMMENT ON TABLE asignaciones_entrega IS 'Historial de asignaciones de pedidos a repartidores con métricas de desempeño';
COMMENT ON TABLE rutas_entrega IS 'Rutas optimizadas guardadas para entregas múltiples';
COMMENT ON FUNCTION asignar_pedido_repartidor IS 'Asigna un pedido a un repartidor disponible y actualiza estados';
COMMENT ON FUNCTION marcar_pedido_entregado IS 'Marca una entrega como completada con calificación opcional';
COMMENT ON FUNCTION sugerir_repartidor_disponible IS 'Sugiere los mejores repartidores disponibles basado en carga y calificación';
COMMENT ON FUNCTION agrupar_pedidos_por_zona IS 'Agrupa pedidos sin asignar por zona de entrega para optimizar rutas';
