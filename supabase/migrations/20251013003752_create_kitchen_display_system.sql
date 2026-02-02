/*
  # Sistema de Cocina Mejorado (Kitchen Display System - KDS)

  1. Nuevas Tablas
    - `estaciones_cocina`
      - `id` (uuid, primary key)
      - `nombre` (text) - nombre de la estación: 'Parrilla', 'Freidora', 'Bebidas', etc
      - `orden` (integer) - orden de visualización
      - `color` (text) - color identificador (#hex)
      - `active` (boolean) - si está activa
      - `created_at` (timestamptz)
    
    - `productos_estaciones`
      - `producto_id` (bigint, foreign key)
      - `estacion_id` (uuid, foreign key)
      - `tiempo_preparacion` (integer) - minutos estimados
      - `complejidad` (integer) - escala 1-5
      - PRIMARY KEY (producto_id, estacion_id)
    
    - `cocina_items`
      - `id` (uuid, primary key)
      - `pedido_id` (bigint, foreign key)
      - `detalle_pedido_id` (bigint, foreign key)
      - `estacion_id` (uuid, foreign key)
      - `estado` (text) - 'pendiente', 'preparando', 'listo', 'entregado'
      - `prioridad` (integer) - calculado automáticamente (1-5, 5 = más urgente)
      - `tiempo_estimado` (integer) - minutos
      - `inicio_preparacion` (timestamptz)
      - `fin_preparacion` (timestamptz)
      - `notas` (text) - notas especiales del pedido
      - `created_at` (timestamptz)
    
    - `recetas`
      - `id` (uuid, primary key)
      - `producto_id` (bigint, foreign key)
      - `paso` (integer) - número de paso (1, 2, 3, ...)
      - `descripcion` (text) - descripción del paso
      - `tiempo_estimado` (integer) - minutos para este paso

  2. Índices
    - Índice en cocina_items.estado para filtrado rápido
    - Índice en cocina_items.prioridad para ordenamiento
    - Índice compuesto en (pedido_id, estado)

  3. Seguridad
    - Enable RLS en todas las tablas
    - Usuarios autenticados pueden ver y actualizar
    
  4. Funciones
    - Calcular prioridad automáticamente
    - Actualizar timers automáticamente
    - Generar items de cocina al crear pedido
*/

-- Tabla de estaciones de cocina
CREATE TABLE IF NOT EXISTS estaciones_cocina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  color TEXT DEFAULT '#64748b',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de relación producto-estación
CREATE TABLE IF NOT EXISTS productos_estaciones (
  producto_id BIGINT REFERENCES productos(id) ON DELETE CASCADE,
  estacion_id UUID REFERENCES estaciones_cocina(id) ON DELETE CASCADE,
  tiempo_preparacion INTEGER DEFAULT 10,
  complejidad INTEGER DEFAULT 3 CHECK (complejidad BETWEEN 1 AND 5),
  PRIMARY KEY (producto_id, estacion_id)
);

-- Tabla de items en preparación en cocina
CREATE TABLE IF NOT EXISTS cocina_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE CASCADE,
  detalle_pedido_id BIGINT REFERENCES detalles_pedido(id) ON DELETE CASCADE,
  estacion_id UUID REFERENCES estaciones_cocina(id),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'preparando', 'listo', 'entregado')),
  prioridad INTEGER DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
  tiempo_estimado INTEGER,
  inicio_preparacion TIMESTAMPTZ,
  fin_preparacion TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de recetas (pasos de preparación)
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id BIGINT REFERENCES productos(id) ON DELETE CASCADE,
  paso INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  tiempo_estimado INTEGER DEFAULT 5
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cocina_items_estado ON cocina_items(estado);
CREATE INDEX IF NOT EXISTS idx_cocina_items_prioridad ON cocina_items(prioridad DESC);
CREATE INDEX IF NOT EXISTS idx_cocina_items_pedido_estado ON cocina_items(pedido_id, estado);
CREATE INDEX IF NOT EXISTS idx_cocina_items_estacion ON cocina_items(estacion_id);
CREATE INDEX IF NOT EXISTS idx_cocina_items_created ON cocina_items(created_at);

-- Enable RLS
ALTER TABLE estaciones_cocina ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_estaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocina_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;

-- Policies para estaciones_cocina
CREATE POLICY "Anyone can view kitchen stations"
  ON estaciones_cocina FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert kitchen stations"
  ON estaciones_cocina FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kitchen stations"
  ON estaciones_cocina FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies para productos_estaciones
CREATE POLICY "Anyone can view product stations"
  ON productos_estaciones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product stations"
  ON productos_estaciones FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies para cocina_items
CREATE POLICY "Anyone can view kitchen items"
  ON cocina_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert kitchen items"
  ON cocina_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kitchen items"
  ON cocina_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete kitchen items"
  ON cocina_items FOR DELETE
  TO authenticated
  USING (true);

-- Policies para recetas
CREATE POLICY "Anyone can view recipes"
  ON recetas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage recipes"
  ON recetas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Función para calcular prioridad de item de cocina
CREATE OR REPLACE FUNCTION calcular_prioridad_cocina(
  p_pedido_id BIGINT,
  p_tiempo_estimado INTEGER,
  p_complejidad INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tiempo_espera INTEGER;
  v_prioridad INTEGER := 3;
  v_tipo_pedido TEXT;
BEGIN
  -- Obtener tiempo de espera en minutos
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 INTO v_tiempo_espera
  FROM pedidos
  WHERE id = p_pedido_id;

  -- Obtener tipo de pedido
  SELECT tipo_pedido INTO v_tipo_pedido
  FROM pedidos
  WHERE id = p_pedido_id;

  -- Calcular prioridad base
  v_prioridad := 3;

  -- Ajustar por tiempo de espera
  IF v_tiempo_espera > 30 THEN
    v_prioridad := 5; -- Urgente
  ELSIF v_tiempo_espera > 20 THEN
    v_prioridad := 4; -- Alto
  ELSIF v_tiempo_espera > 10 THEN
    v_prioridad := 3; -- Normal
  END IF;

  -- Ajustar por tipo de pedido
  IF v_tipo_pedido = 'delivery' THEN
    v_prioridad := LEAST(v_prioridad + 1, 5);
  END IF;

  -- Ajustar por complejidad
  IF p_complejidad >= 4 THEN
    v_prioridad := LEAST(v_prioridad + 1, 5);
  END IF;

  RETURN v_prioridad;
END;
$$;

-- Función para crear items de cocina automáticamente al insertar detalle de pedido
CREATE OR REPLACE FUNCTION crear_items_cocina()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estacion RECORD;
  v_tiempo_estimado INTEGER;
  v_complejidad INTEGER;
  v_prioridad INTEGER;
BEGIN
  -- Para cada estación asociada al producto
  FOR v_estacion IN 
    SELECT pe.estacion_id, pe.tiempo_preparacion, pe.complejidad
    FROM productos_estaciones pe
    WHERE pe.producto_id = NEW.producto_id
  LOOP
    v_tiempo_estimado := v_estacion.tiempo_preparacion * NEW.cantidad;
    v_complejidad := v_estacion.complejidad;
    v_prioridad := calcular_prioridad_cocina(NEW.pedido_id, v_tiempo_estimado, v_complejidad);

    INSERT INTO cocina_items (
      pedido_id,
      detalle_pedido_id,
      estacion_id,
      tiempo_estimado,
      prioridad,
      notas
    ) VALUES (
      NEW.pedido_id,
      NEW.id,
      v_estacion.estacion_id,
      v_tiempo_estimado,
      v_prioridad,
      NEW.notas
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger para crear items de cocina
DROP TRIGGER IF EXISTS trigger_crear_items_cocina ON detalles_pedido;
CREATE TRIGGER trigger_crear_items_cocina
  AFTER INSERT ON detalles_pedido
  FOR EACH ROW
  EXECUTE FUNCTION crear_items_cocina();

-- Insertar estaciones por defecto
INSERT INTO estaciones_cocina (nombre, orden, color) VALUES
  ('Parrilla', 1, '#ef4444'),
  ('Freidora', 2, '#f59e0b'),
  ('Bebidas', 3, '#3b82f6'),
  ('Postres', 4, '#ec4899'),
  ('Ensaladas', 5, '#10b981')
ON CONFLICT DO NOTHING;