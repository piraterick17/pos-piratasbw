/*
  # Sistema de Notificaciones en Tiempo Real

  1. Nuevas Tablas
    - `notificaciones`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tipo` (text) - tipo de notificación: 'pedido', 'stock', 'mensaje', 'pago', 'entrega'
      - `titulo` (text) - título de la notificación
      - `mensaje` (text) - cuerpo del mensaje
      - `icono` (text) - emoji o clase de icono
      - `link` (text) - URL a donde navegar al hacer click
      - `leida` (boolean) - si fue leída o no
      - `data` (jsonb) - datos adicionales relacionados
      - `created_at` (timestamptz)
    
    - `notificaciones_config`
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `nuevo_pedido` (boolean) - activar/desactivar notificaciones de nuevos pedidos
      - `stock_bajo` (boolean) - activar/desactivar alertas de stock
      - `pedido_listo` (boolean) - activar/desactivar cuando pedido está listo
      - `mensajes` (boolean) - activar/desactivar mensajes
      - `sonido` (boolean) - activar/desactivar sonidos
      - `push_enabled` (boolean) - activar/desactivar push notifications
      - `push_subscription` (jsonb) - subscription data para Web Push API
      - `updated_at` (timestamptz)

  2. Índices
    - Índice en `notificaciones.user_id` para búsqueda rápida
    - Índice en `notificaciones.leida` para filtrar no leídas
    - Índice en `notificaciones.created_at` para ordenar

  3. Seguridad
    - Enable RLS en ambas tablas
    - Los usuarios solo pueden ver sus propias notificaciones
    - Los usuarios solo pueden actualizar su propia configuración
    - Sistema puede insertar notificaciones para cualquier usuario

  4. Funciones
    - Función para crear notificación y retornar contador de no leídas
    - Función para marcar todas como leídas
    - Función para obtener contador de no leídas
*/

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pedido', 'stock', 'mensaje', 'pago', 'entrega', 'sistema', 'cocina')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  icono TEXT DEFAULT '🔔',
  link TEXT,
  leida BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de configuración de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nuevo_pedido BOOLEAN DEFAULT true,
  stock_bajo BOOLEAN DEFAULT true,
  pedido_listo BOOLEAN DEFAULT true,
  mensajes BOOLEAN DEFAULT true,
  sonido BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  push_subscription JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida) WHERE leida = false;
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);

-- Enable RLS
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_config ENABLE ROW LEVEL SECURITY;

-- Policies para notificaciones
CREATE POLICY "Users can view own notifications"
  ON notificaciones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notificaciones FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notificaciones FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notificaciones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para notificaciones_config
CREATE POLICY "Users can view own config"
  ON notificaciones_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON notificaciones_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON notificaciones_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Función para obtener contador de notificaciones no leídas
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notificaciones
    WHERE user_id = p_user_id AND leida = false
  );
END;
$$;

-- Función para marcar todas como leídas
CREATE OR REPLACE FUNCTION mark_all_as_read(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notificaciones
  SET leida = true
  WHERE user_id = p_user_id AND leida = false;
END;
$$;

-- Función para crear notificación
CREATE OR REPLACE FUNCTION crear_notificacion(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_icono TEXT DEFAULT '🔔',
  p_link TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notificacion_id UUID;
BEGIN
  INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, icono, link, data)
  VALUES (p_user_id, p_tipo, p_titulo, p_mensaje, p_icono, p_link, p_data)
  RETURNING id INTO v_notificacion_id;
  
  RETURN v_notificacion_id;
END;
$$;

-- Trigger para crear configuración por defecto al crear usuario
CREATE OR REPLACE FUNCTION create_default_notification_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notificaciones_config (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created_notification_config
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_config();