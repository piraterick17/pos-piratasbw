/*
  # Sistema de Inventario Inteligente
  
  1. Nuevas Tablas
    - `alertas_inventario` - Registro de alertas de stock bajo
      - `id` (bigint, PK, auto-increment)
      - `insumo_id` (bigint, FK a insumos)
      - `tipo_alerta` (text) - 'critico', 'advertencia', 'normal'
      - `dias_restantes` (integer) - Días estimados antes de agotarse
      - `cantidad_sugerida_compra` (numeric) - Cantidad recomendada
      - `mensaje` (text) - Descripción de la alerta
      - `fecha_alerta` (timestamptz)
      - `resuelta` (boolean) - Si ya se atendió
      - `fecha_resolucion` (timestamptz)
      
    - `predicciones_consumo` - Historial de predicciones vs. realidad
      - `id` (bigint, PK, auto-increment)
      - `insumo_id` (bigint, FK a insumos)
      - `fecha_prediccion` (date)
      - `consumo_predicho` (numeric)
      - `consumo_real` (numeric)
      - `precision_porcentaje` (numeric)
      
  2. Vistas
    - `v_consumo_historico_insumos` - Consumo de insumos en el tiempo
    - `v_insumos_criticos` - Insumos que necesitan atención inmediata
    
  3. Funciones
    - `calcular_consumo_promedio_diario` - Calcular consumo promedio
    - `calcular_dias_restantes` - Predecir cuándo se agotará
    - `generar_sugerencias_compra` - Sugerencias inteligentes
    - `actualizar_alertas_inventario` - Actualizar alertas automáticamente
    
  4. Security
    - RLS habilitado en todas las tablas
    - Políticas para usuarios autenticados
*/

-- Tabla: Alertas de Inventario
CREATE TABLE IF NOT EXISTS alertas_inventario (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  insumo_id bigint NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  tipo_alerta text NOT NULL CHECK (tipo_alerta IN ('critico', 'advertencia', 'normal')),
  dias_restantes integer,
  cantidad_sugerida_compra numeric DEFAULT 0,
  mensaje text NOT NULL,
  fecha_alerta timestamptz DEFAULT now(),
  resuelta boolean DEFAULT false,
  fecha_resolucion timestamptz,
  insert_by_user uuid REFERENCES auth.users(id),
  
  CONSTRAINT dias_restantes_valido CHECK (dias_restantes >= 0)
);

ALTER TABLE alertas_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver alertas"
  ON alertas_inventario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear alertas"
  ON alertas_inventario FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar alertas"
  ON alertas_inventario FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla: Predicciones de Consumo
CREATE TABLE IF NOT EXISTS predicciones_consumo (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  insumo_id bigint NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  fecha_prediccion date NOT NULL,
  consumo_predicho numeric NOT NULL DEFAULT 0,
  consumo_real numeric,
  precision_porcentaje numeric,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT consumo_no_negativo CHECK (consumo_predicho >= 0 AND (consumo_real IS NULL OR consumo_real >= 0))
);

ALTER TABLE predicciones_consumo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver predicciones"
  ON predicciones_consumo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar predicciones"
  ON predicciones_consumo FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Vista: Consumo Histórico de Insumos
CREATE OR REPLACE VIEW v_consumo_historico_insumos AS
SELECT 
  i.id as insumo_id,
  i.nombre as insumo_nombre,
  DATE(mi.fecha) as fecha,
  SUM(CASE WHEN mi.tipo_movimiento = 'salida' THEN mi.cantidad ELSE 0 END) as consumo_dia,
  SUM(CASE WHEN mi.tipo_movimiento = 'entrada' THEN mi.cantidad ELSE 0 END) as entradas_dia,
  COUNT(*) as num_movimientos
FROM insumos i
LEFT JOIN movimientos_insumo mi ON i.id = mi.insumo_id
WHERE mi.fecha >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY i.id, i.nombre, DATE(mi.fecha)
ORDER BY i.nombre, DATE(mi.fecha) DESC;

-- Vista: Insumos Críticos (necesitan atención)
CREATE OR REPLACE VIEW v_insumos_criticos AS
SELECT 
  i.id,
  i.nombre,
  i.stock_actual,
  i.stock_minimo,
  i.unidad_medida,
  i.costo_unitario,
  COALESCE(a.tipo_alerta, 'normal') as tipo_alerta,
  a.dias_restantes,
  a.cantidad_sugerida_compra,
  a.mensaje as mensaje_alerta,
  a.fecha_alerta,
  p.nombre as proveedor_preferido,
  pi.costo_especifico as costo_proveedor
FROM insumos i
LEFT JOIN LATERAL (
  SELECT * FROM alertas_inventario 
  WHERE insumo_id = i.id AND resuelta = false 
  ORDER BY fecha_alerta DESC 
  LIMIT 1
) a ON true
LEFT JOIN proveedor_insumos pi ON pi.insumo_id = i.id AND pi.es_proveedor_activo = true
LEFT JOIN proveedores p ON p.id = pi.proveedor_id
WHERE i.stock_actual <= i.stock_minimo * 1.5 OR a.id IS NOT NULL
ORDER BY 
  CASE 
    WHEN a.tipo_alerta = 'critico' THEN 1
    WHEN a.tipo_alerta = 'advertencia' THEN 2
    ELSE 3
  END,
  i.stock_actual / NULLIF(i.stock_minimo, 0) ASC;

-- Función: Calcular Consumo Promedio Diario
CREATE OR REPLACE FUNCTION calcular_consumo_promedio_diario(p_insumo_id bigint, p_dias integer DEFAULT 30)
RETURNS numeric AS $$
DECLARE
  v_consumo_promedio numeric;
BEGIN
  SELECT 
    COALESCE(
      SUM(mi.cantidad) / NULLIF(COUNT(DISTINCT DATE(mi.fecha)), 0),
      0
    )
  INTO v_consumo_promedio
  FROM movimientos_insumo mi
  WHERE mi.insumo_id = p_insumo_id
    AND mi.tipo_movimiento = 'salida'
    AND mi.fecha >= CURRENT_DATE - (p_dias || ' days')::interval;
    
  RETURN COALESCE(v_consumo_promedio, 0);
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular Días Restantes
CREATE OR REPLACE FUNCTION calcular_dias_restantes(p_insumo_id bigint)
RETURNS integer AS $$
DECLARE
  v_stock_actual numeric;
  v_consumo_promedio numeric;
  v_dias_restantes integer;
BEGIN
  -- Obtener stock actual
  SELECT stock_actual INTO v_stock_actual
  FROM insumos
  WHERE id = p_insumo_id;
  
  -- Calcular consumo promedio de últimos 30 días
  v_consumo_promedio := calcular_consumo_promedio_diario(p_insumo_id, 30);
  
  -- Si no hay consumo, retornar un valor alto
  IF v_consumo_promedio <= 0 THEN
    RETURN 999;
  END IF;
  
  -- Calcular días restantes
  v_dias_restantes := FLOOR(v_stock_actual / v_consumo_promedio);
  
  RETURN GREATEST(v_dias_restantes, 0);
END;
$$ LANGUAGE plpgsql;

-- Función: Generar Sugerencias de Compra
CREATE OR REPLACE FUNCTION generar_sugerencias_compra(p_insumo_id bigint)
RETURNS TABLE(
  cantidad_sugerida numeric,
  dias_cobertura integer,
  justificacion text,
  costo_estimado numeric
) AS $$
DECLARE
  v_consumo_promedio numeric;
  v_stock_actual numeric;
  v_stock_minimo numeric;
  v_costo_unitario numeric;
  v_dias_cobertura_deseada integer := 14; -- 2 semanas de cobertura
BEGIN
  -- Obtener datos del insumo
  SELECT 
    i.stock_actual,
    i.stock_minimo,
    i.costo_unitario,
    calcular_consumo_promedio_diario(i.id, 30)
  INTO v_stock_actual, v_stock_minimo, v_costo_unitario, v_consumo_promedio
  FROM insumos i
  WHERE i.id = p_insumo_id;
  
  -- Calcular cantidad necesaria para tener cobertura deseada
  cantidad_sugerida := GREATEST(
    (v_consumo_promedio * v_dias_cobertura_deseada) - v_stock_actual,
    v_stock_minimo - v_stock_actual,
    0
  );
  
  dias_cobertura := v_dias_cobertura_deseada;
  costo_estimado := cantidad_sugerida * v_costo_unitario;
  
  justificacion := format(
    'Basado en consumo promedio de %.2f unidades/día. Stock actual: %.2f, se sugiere comprar %.2f para cubrir %s días.',
    v_consumo_promedio,
    v_stock_actual,
    cantidad_sugerida,
    v_dias_cobertura_deseada
  );
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar Alertas de Inventario (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION actualizar_alertas_inventario()
RETURNS integer AS $$
DECLARE
  v_insumo RECORD;
  v_dias_restantes integer;
  v_tipo_alerta text;
  v_mensaje text;
  v_cantidad_sugerida numeric;
  v_alertas_creadas integer := 0;
BEGIN
  -- Marcar alertas antiguas como resueltas si el stock mejoró
  UPDATE alertas_inventario ai
  SET resuelta = true, fecha_resolucion = now()
  FROM insumos i
  WHERE ai.insumo_id = i.id
    AND ai.resuelta = false
    AND i.stock_actual > i.stock_minimo * 2;
  
  -- Crear nuevas alertas para insumos con stock bajo
  FOR v_insumo IN 
    SELECT id, nombre, stock_actual, stock_minimo, unidad_medida
    FROM insumos
    WHERE stock_actual <= stock_minimo * 2
  LOOP
    -- Calcular días restantes
    v_dias_restantes := calcular_dias_restantes(v_insumo.id);
    
    -- Determinar tipo de alerta
    IF v_dias_restantes <= 3 THEN
      v_tipo_alerta := 'critico';
      v_mensaje := format('CRÍTICO: %s se agotará en %s días', v_insumo.nombre, v_dias_restantes);
    ELSIF v_dias_restantes <= 7 THEN
      v_tipo_alerta := 'advertencia';
      v_mensaje := format('ADVERTENCIA: %s tiene stock bajo (quedan %s días)', v_insumo.nombre, v_dias_restantes);
    ELSE
      v_tipo_alerta := 'normal';
      v_mensaje := format('Stock de %s por debajo del nivel deseado', v_insumo.nombre);
    END IF;
    
    -- Calcular cantidad sugerida
    SELECT gs.cantidad_sugerida INTO v_cantidad_sugerida
    FROM generar_sugerencias_compra(v_insumo.id) gs;
    
    -- Verificar si ya existe una alerta activa reciente
    IF NOT EXISTS (
      SELECT 1 FROM alertas_inventario
      WHERE insumo_id = v_insumo.id
        AND resuelta = false
        AND fecha_alerta >= CURRENT_DATE - INTERVAL '1 day'
    ) THEN
      -- Crear alerta
      INSERT INTO alertas_inventario (
        insumo_id,
        tipo_alerta,
        dias_restantes,
        cantidad_sugerida_compra,
        mensaje
      ) VALUES (
        v_insumo.id,
        v_tipo_alerta,
        v_dias_restantes,
        v_cantidad_sugerida,
        v_mensaje
      );
      
      v_alertas_creadas := v_alertas_creadas + 1;
    END IF;
  END LOOP;
  
  RETURN v_alertas_creadas;
END;
$$ LANGUAGE plpgsql;

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_alertas_inventario_insumo_id ON alertas_inventario(insumo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_inventario_tipo_resuelta ON alertas_inventario(tipo_alerta, resuelta);
CREATE INDEX IF NOT EXISTS idx_predicciones_insumo_fecha ON predicciones_consumo(insumo_id, fecha_prediccion);
CREATE INDEX IF NOT EXISTS idx_movimientos_insumo_fecha ON movimientos_insumo(fecha);

-- Comentarios
COMMENT ON TABLE alertas_inventario IS 'Registro de alertas automáticas de stock bajo con sugerencias de compra';
COMMENT ON TABLE predicciones_consumo IS 'Historial de predicciones de consumo vs. consumo real para mejorar el algoritmo';
COMMENT ON FUNCTION calcular_consumo_promedio_diario IS 'Calcula el consumo promedio diario de un insumo basado en histórico';
COMMENT ON FUNCTION calcular_dias_restantes IS 'Predice en cuántos días se agotará un insumo basado en consumo actual';
COMMENT ON FUNCTION generar_sugerencias_compra IS 'Genera sugerencias inteligentes de compra con cantidad y justificación';
COMMENT ON FUNCTION actualizar_alertas_inventario IS 'Función para ejecutar periódicamente que actualiza todas las alertas de inventario';
