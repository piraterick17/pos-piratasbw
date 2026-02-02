/*
  # Sistema de WhatsApp

  1. Nuevas Tablas
    - `whatsapp_config`
      - `id` (uuid, primary key)
      - `api_provider` (text) - 'meta' o 'twilio'
      - `phone_number` (text) - número de teléfono de la empresa
      - `api_token` (text) - token de acceso (cifrado)
      - `phone_number_id` (text) - ID del número (Meta)
      - `webhook_verify_token` (text) - token de verificación del webhook
      - `active` (boolean) - si está activa la configuración
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `whatsapp_templates`
      - `id` (uuid, primary key)
      - `name` (text) - nombre identificador
      - `category` (text) - 'pedido', 'promocion', 'recordatorio', 'stock'
      - `template` (text) - plantilla del mensaje con variables
      - `variables` (jsonb) - array de variables: ["{nombre}", "{total}"]
      - `active` (boolean) - si está activa
      - `created_at` (timestamptz)
    
    - `whatsapp_messages`
      - `id` (uuid, primary key)
      - `cliente_id` (uuid) - foreign key a clientes
      - `pedido_id` (bigint) - foreign key a pedidos (opcional)
      - `phone_number` (text) - número de teléfono destinatario
      - `template_id` (uuid) - foreign key a whatsapp_templates (opcional)
      - `message_content` (text) - contenido del mensaje enviado
      - `status` (text) - 'pending', 'sent', 'delivered', 'read', 'failed'
      - `whatsapp_message_id` (text) - ID del mensaje en WhatsApp
      - `error_message` (text) - mensaje de error si falló
      - `sent_at` (timestamptz)
      - `delivered_at` (timestamptz)
      - `read_at` (timestamptz)

  2. Seguridad
    - Enable RLS en todas las tablas
    - Solo usuarios autenticados pueden ver/gestionar

  3. Datos Iniciales
    - Plantillas de ejemplo para diferentes eventos
*/

-- Tabla de configuración de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_provider TEXT CHECK (api_provider IN ('meta', 'twilio')),
  phone_number TEXT,
  api_token TEXT,
  phone_number_id TEXT,
  webhook_verify_token TEXT,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de plantillas de mensajes
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('pedido', 'promocion', 'recordatorio', 'stock')),
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de mensajes enviados (historial)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_cliente ON whatsapp_messages(cliente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_pedido ON whatsapp_messages(pedido_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent ON whatsapp_messages(sent_at DESC);

-- Enable RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_config
CREATE POLICY "Anyone can view whatsapp config"
  ON whatsapp_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage whatsapp config"
  ON whatsapp_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies para whatsapp_templates
CREATE POLICY "Anyone can view whatsapp templates"
  ON whatsapp_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage whatsapp templates"
  ON whatsapp_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies para whatsapp_messages
CREATE POLICY "Anyone can view whatsapp messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert whatsapp messages"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update whatsapp messages"
  ON whatsapp_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insertar plantillas de ejemplo
INSERT INTO whatsapp_templates (name, category, template, variables) VALUES
(
  'nuevo_pedido',
  'pedido',
  'Hola {nombre}! 👋

Tu pedido #{pedido_id} ha sido confirmado.

📦 Total: ${total}
🕐 Tiempo estimado: {tiempo} minutos

Te avisaremos cuando esté listo!',
  '["nombre", "pedido_id", "total", "tiempo"]'::jsonb
),
(
  'pedido_preparando',
  'pedido',
  'Tu pedido #{pedido_id} está en preparación 👨‍🍳

Pronto estará listo!',
  '["pedido_id"]'::jsonb
),
(
  'pedido_listo',
  'pedido',
  '✅ Tu pedido #{pedido_id} está listo!

Puedes pasar a recogerlo.',
  '["pedido_id"]'::jsonb
),
(
  'pedido_en_camino',
  'pedido',
  '🚗 Tu pedido #{pedido_id} va en camino!

Repartidor: {repartidor}
Tiempo estimado: {tiempo} minutos',
  '["pedido_id", "repartidor", "tiempo"]'::jsonb
),
(
  'pedido_entregado',
  'pedido',
  '✅ Pedido #{pedido_id} entregado!

Gracias por tu preferencia. Esperamos verte pronto! 🍕',
  '["pedido_id"]'::jsonb
),
(
  'stock_bajo',
  'stock',
  '⚠️ Alerta de Stock Bajo

El insumo "{insumo}" tiene stock bajo ({cantidad} {unidad}).

Por favor, realizar pedido al proveedor.',
  '["insumo", "cantidad", "unidad"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;