/*
  # Crear tabla de métricas de venta
  
  1. Nueva Tabla
    - `metricas_venta`
      - `id` (uuid, primary key)
      - `pedido_id` (bigint, foreign key a pedidos) - Referencia al pedido relacionado
      - `vendedor_id` (uuid, foreign key a auth.users) - Usuario que realizó la venta
      - `ofrecio_acompanamiento` (boolean) - Si se ofreció acompañamiento al cliente
      - `acepto_acompanamiento` (boolean) - Si el cliente aceptó el acompañamiento
      - `ofrecio_postre` (boolean) - Si se ofreció postre al cliente
      - `acepto_postre` (boolean) - Si el cliente aceptó el postre
      - `tiempo_entrega_prometido` (integer) - Tiempo de entrega en minutos que se prometió al cliente
      - `fecha_hora` (timestamptz) - Fecha y hora de la interacción
      - `notas` (text, nullable) - Notas adicionales opcionales
      - `created_at` (timestamptz)
      
  2. Índices
    - Índice en `vendedor_id` para análisis por vendedor
    - Índice en `fecha_hora` para análisis temporal
    - Índice en `pedido_id` para relacionar con pedidos
    
  3. Seguridad
    - Habilitar RLS
    - Políticas para usuarios autenticados
    
  4. Propósito Estratégico
    - Rastrear el desempeño de vendedores en ofrecer complementos
    - Analizar tendencias de tiempos de entrega por horario
    - Identificar oportunidades de capacitación para vendedores
    - Optimizar estrategias de venta cruzada
*/

-- Crear tabla de métricas de venta
CREATE TABLE IF NOT EXISTS metricas_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id bigint REFERENCES pedidos(id) ON DELETE CASCADE,
  vendedor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ofrecio_acompanamiento boolean NOT NULL DEFAULT false,
  acepto_acompanamiento boolean NOT NULL DEFAULT false,
  ofrecio_postre boolean NOT NULL DEFAULT false,
  acepto_postre boolean NOT NULL DEFAULT false,
  tiempo_entrega_prometido integer NOT NULL,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  notas text,
  created_at timestamptz DEFAULT now()
);

-- Crear índices para optimizar consultas analíticas
CREATE INDEX IF NOT EXISTS idx_metricas_venta_vendedor ON metricas_venta(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_metricas_venta_fecha ON metricas_venta(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_metricas_venta_pedido ON metricas_venta(pedido_id);

-- Comentarios descriptivos
COMMENT ON TABLE metricas_venta IS 'Registro de interacciones de venta para análisis estratégico y seguimiento de desempeño';
COMMENT ON COLUMN metricas_venta.ofrecio_acompanamiento IS 'Indica si el vendedor ofreció productos de acompañamiento al cliente';
COMMENT ON COLUMN metricas_venta.acepto_acompanamiento IS 'Indica si el cliente aceptó agregar productos de acompañamiento';
COMMENT ON COLUMN metricas_venta.ofrecio_postre IS 'Indica si el vendedor ofreció postres al cliente';
COMMENT ON COLUMN metricas_venta.acepto_postre IS 'Indica si el cliente aceptó agregar postres';
COMMENT ON COLUMN metricas_venta.tiempo_entrega_prometido IS 'Tiempo de entrega en minutos prometido al cliente';

-- Habilitar RLS
ALTER TABLE metricas_venta ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Usuarios autenticados pueden ver métricas"
  ON metricas_venta
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar métricas"
  ON metricas_venta
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar sus métricas"
  ON metricas_venta
  FOR UPDATE
  TO authenticated
  USING (vendedor_id = auth.uid())
  WITH CHECK (vendedor_id = auth.uid());
