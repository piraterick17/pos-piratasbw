/*
  # Sistema de CRM y Fidelización de Clientes
  
  1. Nuevas Tablas
    - `clientes_segmentos` - Segmentación automática de clientes
      - `id` (bigint, PK, auto-increment)
      - `cliente_id` (uuid, FK a clientes)
      - `segmento` (text) - 'vip', 'regular', 'nuevo', 'en_riesgo', 'inactivo'
      - `total_pedidos` (integer)
      - `total_gastado` (numeric)
      - `ticket_promedio` (numeric)
      - `ultima_compra` (date)
      - `dias_sin_comprar` (integer)
      - `frecuencia_compra_dias` (numeric) - Promedio de días entre compras
      - `fecha_calculo` (timestamptz)
      
    - `programa_puntos` - Sistema de puntos y recompensas
      - `id` (bigint, PK, auto-increment)
      - `cliente_id` (uuid, FK a clientes)
      - `puntos_actuales` (integer)
      - `puntos_acumulados_historico` (integer)
      - `puntos_canjeados_historico` (integer)
      - `nivel` (text) - 'bronce', 'plata', 'oro', 'platino'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `movimientos_puntos` - Historial de puntos
      - `id` (bigint, PK, auto-increment)
      - `cliente_id` (uuid, FK a clientes)
      - `tipo_movimiento` (text) - 'ganancia', 'canje', 'expiracion', 'ajuste'
      - `puntos` (integer)
      - `pedido_id` (bigint) - Pedido asociado si aplica
      - `motivo` (text)
      - `fecha` (timestamptz)
      - `insert_by_user` (uuid)
      
  2. Vistas
    - `v_metricas_clientes` - Métricas completas por cliente
    - `v_clientes_vip` - Clientes VIP
    - `v_clientes_en_riesgo` - Clientes que dejaron de comprar
    - `v_productos_favoritos_cliente` - Productos más comprados por cliente
    
  3. Funciones
    - `calcular_segmento_cliente` - Clasificar cliente automáticamente
    - `actualizar_segmentos_clientes` - Actualizar todos los segmentos
    - `calcular_puntos_pedido` - Calcular puntos ganados en un pedido
    - `canjear_puntos` - Canjear puntos por descuento
    - `calcular_ltv` - Lifetime Value del cliente
    
  4. Security
    - RLS habilitado en todas las tablas
    - Políticas restrictivas
*/

-- Tabla: Segmentos de Clientes
CREATE TABLE IF NOT EXISTS clientes_segmentos (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  segmento text NOT NULL CHECK (segmento IN ('vip', 'regular', 'nuevo', 'en_riesgo', 'inactivo')),
  total_pedidos integer DEFAULT 0,
  total_gastado numeric DEFAULT 0,
  ticket_promedio numeric DEFAULT 0,
  ultima_compra date,
  dias_sin_comprar integer DEFAULT 0,
  frecuencia_compra_dias numeric DEFAULT 0,
  fecha_calculo timestamptz DEFAULT now(),
  
  CONSTRAINT unique_cliente_segmento UNIQUE (cliente_id)
);

ALTER TABLE clientes_segmentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver segmentos"
  ON clientes_segmentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear segmentos"
  ON clientes_segmentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar segmentos"
  ON clientes_segmentos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla: Programa de Puntos
CREATE TABLE IF NOT EXISTS programa_puntos (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  puntos_actuales integer DEFAULT 0 CHECK (puntos_actuales >= 0),
  puntos_acumulados_historico integer DEFAULT 0,
  puntos_canjeados_historico integer DEFAULT 0,
  nivel text DEFAULT 'bronce' CHECK (nivel IN ('bronce', 'plata', 'oro', 'platino')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_cliente_puntos UNIQUE (cliente_id)
);

ALTER TABLE programa_puntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver puntos"
  ON programa_puntos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear puntos"
  ON programa_puntos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar puntos"
  ON programa_puntos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla: Movimientos de Puntos
CREATE TABLE IF NOT EXISTS movimientos_puntos (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_movimiento text NOT NULL CHECK (tipo_movimiento IN ('ganancia', 'canje', 'expiracion', 'ajuste')),
  puntos integer NOT NULL,
  pedido_id bigint REFERENCES pedidos(id) ON DELETE SET NULL,
  motivo text,
  fecha timestamptz DEFAULT now(),
  insert_by_user uuid REFERENCES auth.users(id)
);

ALTER TABLE movimientos_puntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver movimientos puntos"
  ON movimientos_puntos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear movimientos puntos"
  ON movimientos_puntos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Vista: Métricas Completas de Clientes
CREATE OR REPLACE VIEW v_metricas_clientes AS
SELECT 
  c.id as cliente_id,
  c.nombre,
  c.telefono,
  c.email,
  cs.segmento,
  cs.total_pedidos,
  cs.total_gastado,
  cs.ticket_promedio,
  cs.ultima_compra,
  cs.dias_sin_comprar,
  cs.frecuencia_compra_dias,
  pp.puntos_actuales,
  pp.nivel as nivel_lealtad,
  pp.puntos_acumulados_historico,
  c.permite_credito,
  c.saldo_actual as saldo_credito,
  CASE 
    WHEN cs.segmento = 'vip' THEN 1
    WHEN cs.segmento = 'regular' THEN 2
    WHEN cs.segmento = 'nuevo' THEN 3
    WHEN cs.segmento = 'en_riesgo' THEN 4
    ELSE 5
  END as orden_importancia
FROM clientes c
LEFT JOIN clientes_segmentos cs ON c.id = cs.cliente_id
LEFT JOIN programa_puntos pp ON c.id = pp.cliente_id
WHERE c.deleted_at IS NULL
ORDER BY orden_importancia, cs.total_gastado DESC NULLS LAST;

-- Vista: Clientes VIP
CREATE OR REPLACE VIEW v_clientes_vip AS
SELECT 
  c.id,
  c.nombre,
  c.telefono,
  c.email,
  cs.total_pedidos,
  cs.total_gastado,
  cs.ticket_promedio,
  cs.ultima_compra,
  pp.puntos_actuales,
  pp.nivel
FROM clientes c
INNER JOIN clientes_segmentos cs ON c.id = cs.cliente_id
LEFT JOIN programa_puntos pp ON c.id = pp.cliente_id
WHERE cs.segmento = 'vip'
  AND c.deleted_at IS NULL
ORDER BY cs.total_gastado DESC;

-- Vista: Clientes en Riesgo
CREATE OR REPLACE VIEW v_clientes_en_riesgo AS
SELECT 
  c.id,
  c.nombre,
  c.telefono,
  c.email,
  cs.total_pedidos,
  cs.total_gastado,
  cs.ultima_compra,
  cs.dias_sin_comprar,
  cs.frecuencia_compra_dias,
  CASE 
    WHEN cs.dias_sin_comprar > 60 THEN 'Alto riesgo'
    WHEN cs.dias_sin_comprar > 45 THEN 'Riesgo medio'
    ELSE 'Riesgo bajo'
  END as nivel_riesgo
FROM clientes c
INNER JOIN clientes_segmentos cs ON c.id = cs.cliente_id
WHERE cs.segmento IN ('en_riesgo', 'inactivo')
  AND c.deleted_at IS NULL
ORDER BY cs.dias_sin_comprar DESC;

-- Vista: Productos Favoritos por Cliente
CREATE OR REPLACE VIEW v_productos_favoritos_cliente AS
SELECT 
  p.cliente_id,
  c.nombre as cliente_nombre,
  prod.id as producto_id,
  prod.nombre as producto_nombre,
  COUNT(dp.id) as veces_comprado,
  SUM(dp.cantidad) as unidades_totales,
  SUM(dp.subtotal) as total_gastado_producto,
  MAX(p.insert_date) as ultima_vez_comprado
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
INNER JOIN detalles_pedido dp ON p.id = dp.pedido_id
INNER JOIN productos prod ON dp.producto_id = prod.id
WHERE p.estado IN ('completado', 'enviado')
  AND p.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY p.cliente_id, c.nombre, prod.id, prod.nombre
ORDER BY p.cliente_id, veces_comprado DESC;

-- Función: Calcular Segmento de Cliente
CREATE OR REPLACE FUNCTION calcular_segmento_cliente(p_cliente_id uuid)
RETURNS text AS $$
DECLARE
  v_total_pedidos integer;
  v_total_gastado numeric;
  v_ultima_compra date;
  v_dias_sin_comprar integer;
  v_segmento text;
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
  
  -- Calcular días sin comprar
  v_dias_sin_comprar := COALESCE(CURRENT_DATE - v_ultima_compra, 0);
  
  -- Determinar segmento según reglas de negocio
  IF v_total_pedidos = 0 THEN
    v_segmento := 'nuevo';
  ELSIF v_total_gastado >= 5000 OR v_total_pedidos >= 20 THEN
    IF v_dias_sin_comprar > 45 THEN
      v_segmento := 'en_riesgo';
    ELSE
      v_segmento := 'vip';
    END IF;
  ELSIF v_total_gastado >= 1000 OR v_total_pedidos >= 5 THEN
    IF v_dias_sin_comprar > 30 THEN
      v_segmento := 'en_riesgo';
    ELSE
      v_segmento := 'regular';
    END IF;
  ELSIF v_total_pedidos <= 3 THEN
    v_segmento := 'nuevo';
  ELSIF v_dias_sin_comprar > 60 THEN
    v_segmento := 'inactivo';
  ELSIF v_dias_sin_comprar > 30 THEN
    v_segmento := 'en_riesgo';
  ELSE
    v_segmento := 'regular';
  END IF;
  
  RETURN v_segmento;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar Segmentos de Clientes (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION actualizar_segmentos_clientes()
RETURNS integer AS $$
DECLARE
  v_cliente RECORD;
  v_segmento text;
  v_ticket_promedio numeric;
  v_frecuencia numeric;
  v_clientes_actualizados integer := 0;
BEGIN
  FOR v_cliente IN 
    SELECT 
      c.id,
      COUNT(p.id) as total_pedidos,
      COALESCE(SUM(p.total), 0) as total_gastado,
      MAX(DATE(p.insert_date)) as ultima_compra,
      COALESCE(CURRENT_DATE - MAX(DATE(p.insert_date)), 0) as dias_sin_comprar
    FROM clientes c
    LEFT JOIN pedidos p ON c.id = p.cliente_id 
      AND p.deleted_at IS NULL 
      AND p.estado IN ('completado', 'enviado')
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
  LOOP
    -- Calcular segmento
    v_segmento := calcular_segmento_cliente(v_cliente.id);
    
    -- Calcular ticket promedio
    IF v_cliente.total_pedidos > 0 THEN
      v_ticket_promedio := v_cliente.total_gastado / v_cliente.total_pedidos;
    ELSE
      v_ticket_promedio := 0;
    END IF;
    
    -- Calcular frecuencia de compra
    IF v_cliente.total_pedidos > 1 THEN
      SELECT 
        AVG(dias_entre_compras)
      INTO v_frecuencia
      FROM (
        SELECT 
          DATE(p.insert_date) - LAG(DATE(p.insert_date)) OVER (ORDER BY p.insert_date) as dias_entre_compras
        FROM pedidos p
        WHERE p.cliente_id = v_cliente.id
          AND p.deleted_at IS NULL
          AND p.estado IN ('completado', 'enviado')
      ) diffs
      WHERE dias_entre_compras IS NOT NULL;
    ELSE
      v_frecuencia := 0;
    END IF;
    
    -- Insertar o actualizar segmento
    INSERT INTO clientes_segmentos (
      cliente_id,
      segmento,
      total_pedidos,
      total_gastado,
      ticket_promedio,
      ultima_compra,
      dias_sin_comprar,
      frecuencia_compra_dias,
      fecha_calculo
    ) VALUES (
      v_cliente.id,
      v_segmento,
      v_cliente.total_pedidos,
      v_cliente.total_gastado,
      v_ticket_promedio,
      v_cliente.ultima_compra,
      v_cliente.dias_sin_comprar,
      v_frecuencia,
      now()
    )
    ON CONFLICT (cliente_id) 
    DO UPDATE SET
      segmento = EXCLUDED.segmento,
      total_pedidos = EXCLUDED.total_pedidos,
      total_gastado = EXCLUDED.total_gastado,
      ticket_promedio = EXCLUDED.ticket_promedio,
      ultima_compra = EXCLUDED.ultima_compra,
      dias_sin_comprar = EXCLUDED.dias_sin_comprar,
      frecuencia_compra_dias = EXCLUDED.frecuencia_compra_dias,
      fecha_calculo = EXCLUDED.fecha_calculo;
    
    v_clientes_actualizados := v_clientes_actualizados + 1;
  END LOOP;
  
  RETURN v_clientes_actualizados;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular Puntos por Pedido (1 punto por cada $10)
CREATE OR REPLACE FUNCTION calcular_puntos_pedido(p_total_pedido numeric)
RETURNS integer AS $$
BEGIN
  RETURN FLOOR(p_total_pedido / 10)::integer;
END;
$$ LANGUAGE plpgsql;

-- Función: Otorgar Puntos por Pedido
CREATE OR REPLACE FUNCTION otorgar_puntos_pedido(p_cliente_id uuid, p_pedido_id bigint, p_total numeric)
RETURNS void AS $$
DECLARE
  v_puntos integer;
  v_nuevo_nivel text;
  v_puntos_totales integer;
BEGIN
  -- Calcular puntos
  v_puntos := calcular_puntos_pedido(p_total);
  
  IF v_puntos <= 0 THEN
    RETURN;
  END IF;
  
  -- Crear registro de programa de puntos si no existe
  INSERT INTO programa_puntos (cliente_id, puntos_actuales, puntos_acumulados_historico)
  VALUES (p_cliente_id, 0, 0)
  ON CONFLICT (cliente_id) DO NOTHING;
  
  -- Actualizar puntos
  UPDATE programa_puntos
  SET 
    puntos_actuales = puntos_actuales + v_puntos,
    puntos_acumulados_historico = puntos_acumulados_historico + v_puntos,
    updated_at = now()
  WHERE cliente_id = p_cliente_id
  RETURNING puntos_acumulados_historico INTO v_puntos_totales;
  
  -- Determinar nivel según puntos acumulados
  IF v_puntos_totales >= 5000 THEN
    v_nuevo_nivel := 'platino';
  ELSIF v_puntos_totales >= 2000 THEN
    v_nuevo_nivel := 'oro';
  ELSIF v_puntos_totales >= 500 THEN
    v_nuevo_nivel := 'plata';
  ELSE
    v_nuevo_nivel := 'bronce';
  END IF;
  
  -- Actualizar nivel
  UPDATE programa_puntos
  SET nivel = v_nuevo_nivel
  WHERE cliente_id = p_cliente_id;
  
  -- Registrar movimiento
  INSERT INTO movimientos_puntos (cliente_id, tipo_movimiento, puntos, pedido_id, motivo)
  VALUES (p_cliente_id, 'ganancia', v_puntos, p_pedido_id, format('Puntos ganados por compra #%s', p_pedido_id));
END;
$$ LANGUAGE plpgsql;

-- Función: Canjear Puntos (100 puntos = $10 de descuento)
CREATE OR REPLACE FUNCTION canjear_puntos(p_cliente_id uuid, p_puntos_a_canjear integer, p_motivo text DEFAULT NULL)
RETURNS numeric AS $$
DECLARE
  v_puntos_disponibles integer;
  v_descuento numeric;
BEGIN
  -- Verificar puntos disponibles
  SELECT puntos_actuales INTO v_puntos_disponibles
  FROM programa_puntos
  WHERE cliente_id = p_cliente_id;
  
  IF v_puntos_disponibles IS NULL OR v_puntos_disponibles < p_puntos_a_canjear THEN
    RAISE EXCEPTION 'Puntos insuficientes';
  END IF;
  
  -- Calcular descuento (100 puntos = $10)
  v_descuento := (p_puntos_a_canjear::numeric / 100) * 10;
  
  -- Descontar puntos
  UPDATE programa_puntos
  SET 
    puntos_actuales = puntos_actuales - p_puntos_a_canjear,
    puntos_canjeados_historico = puntos_canjeados_historico + p_puntos_a_canjear,
    updated_at = now()
  WHERE cliente_id = p_cliente_id;
  
  -- Registrar movimiento
  INSERT INTO movimientos_puntos (cliente_id, tipo_movimiento, puntos, motivo)
  VALUES (p_cliente_id, 'canje', -p_puntos_a_canjear, COALESCE(p_motivo, 'Canje de puntos por descuento'));
  
  RETURN v_descuento;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular Lifetime Value (LTV)
CREATE OR REPLACE FUNCTION calcular_ltv(p_cliente_id uuid)
RETURNS numeric AS $$
DECLARE
  v_ltv numeric;
BEGIN
  SELECT COALESCE(SUM(total), 0)
  INTO v_ltv
  FROM pedidos
  WHERE cliente_id = p_cliente_id
    AND deleted_at IS NULL
    AND estado IN ('completado', 'enviado');
    
  RETURN v_ltv;
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_segmentos_cliente_id ON clientes_segmentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_segmentos_segmento ON clientes_segmentos(segmento);
CREATE INDEX IF NOT EXISTS idx_programa_puntos_cliente_id ON programa_puntos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_puntos_cliente_id ON movimientos_puntos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_puntos_fecha ON movimientos_puntos(fecha);

-- Comentarios
COMMENT ON TABLE clientes_segmentos IS 'Segmentación automática de clientes basada en comportamiento de compra';
COMMENT ON TABLE programa_puntos IS 'Sistema de puntos de lealtad con niveles (bronce, plata, oro, platino)';
COMMENT ON TABLE movimientos_puntos IS 'Historial de ganancias y canjes de puntos';
COMMENT ON FUNCTION calcular_segmento_cliente IS 'Clasifica un cliente en: VIP, Regular, Nuevo, En Riesgo o Inactivo';
COMMENT ON FUNCTION actualizar_segmentos_clientes IS 'Recalcula y actualiza la segmentación de todos los clientes';
COMMENT ON FUNCTION otorgar_puntos_pedido IS 'Otorga puntos automáticamente al completar un pedido (1 punto por cada $10)';
COMMENT ON FUNCTION canjear_puntos IS 'Canjea puntos por descuento (100 puntos = $10)';
