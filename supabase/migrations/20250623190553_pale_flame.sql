-- =================================================================
-- MIGRACIÓN DEFINITIVA: SISTEMA DE ENTREGAS Y CORRECCIÓN DE VISTA
-- Este script unifica la creación de tablas, alteración de 'pedidos' y la corrección de 'pedidos_vista'.
-- =================================================================

-- FASE 1: Crear nuevas tablas de soporte para el sistema de entregas.
CREATE TABLE IF NOT EXISTS public.tipos_entrega (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    requiere_direccion BOOLEAN NOT NULL DEFAULT FALSE,
    tiene_costo_asociado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.tipos_entrega IS 'Almacena los tipos de servicio para un pedido (ej. A domicilio, Para llevar).';

CREATE TABLE IF NOT EXISTS public.zonas_entrega (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    costo NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    monto_minimo_envio_gratis NUMERIC(10, 2),
    localidades_incluidas TEXT[],
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.zonas_entrega IS 'Define zonas geográficas para calcular costos de envío.';
COMMENT ON COLUMN public.zonas_entrega.monto_minimo_envio_gratis IS 'Si el subtotal del pedido supera este monto, el envío es gratuito.';

-- FASE 2: Añadir TODAS las columnas nuevas a la tabla 'pedidos' de una sola vez.
-- Esto se hace ANTES de recrear la vista para asegurar que las columnas existan.
ALTER TABLE public.pedidos
    ADD COLUMN IF NOT EXISTS tipo_entrega_id INTEGER REFERENCES public.tipos_entrega(id),
    ADD COLUMN IF NOT EXISTS zona_entrega_id INTEGER REFERENCES public.zonas_entrega(id),
    ADD COLUMN IF NOT EXISTS costo_envio NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS direccion_envio JSONB,
    ADD COLUMN IF NOT EXISTS notas_entrega TEXT,
    ADD COLUMN IF NOT EXISTS fecha_listo_para_entrega TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fecha_en_ruta TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fecha_entregado TIMESTAMPTZ;

-- FASE 3: Insertar los datos iniciales para los tipos de entrega.
INSERT INTO public.tipos_entrega (nombre, descripcion, requiere_direccion, tiene_costo_asociado)
VALUES
    ('A domicilio', 'El pedido se entrega en la dirección del cliente.', TRUE, TRUE),
    ('Para llevar', 'El cliente recoge el pedido en el local.', FALSE, FALSE),
    ('Comer aquí', 'El cliente consume el pedido en el local.', FALSE, FALSE)
ON CONFLICT (nombre) DO NOTHING;

-- FASE 4: Corregir y recrear la vista 'pedidos_vista' de forma definitiva.
DROP VIEW IF EXISTS public.pedidos_vista; -- Se elimina primero para evitar conflictos.

CREATE VIEW public.pedidos_vista AS
SELECT
    -- Columnas de la tabla pedidos (p)
    p.id, p.cliente_id, p.estado, p.metodo_pago, p.subtotal,
    p.descuentos, p.impuestos, p.total, p.notas, p.deleted_at,
    p.insert_date, p.updated_at, p.estado_id, p.cobrado_por_usuario_id,
    p.fecha_finalizacion, p.tipo_entrega_id, p.zona_entrega_id, p.costo_envio,
    p.direccion_envio, p.notas_entrega, p.fecha_listo_para_entrega,
    p.fecha_en_ruta, p.fecha_entregado,
    -- Columnas de tablas relacionadas
    pe.nombre AS estado_nombre,
    pe.descripcion AS estado_descripcion,
    pe.color_hex AS estado_color,
    c.nombre AS cliente_nombre,
    c.telefono AS cliente_telefono,
    te.nombre AS tipo_entrega_nombre
FROM
    public.pedidos p
LEFT JOIN public.pedido_estados pe ON p.estado_id = pe.id
LEFT JOIN public.clientes c ON p.cliente_id = c.id
LEFT JOIN public.tipos_entrega te ON p.tipo_entrega_id = te.id;

-- FASE 5: Aplicar políticas de seguridad a las nuevas tablas.
ALTER TABLE public.tipos_entrega ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de tipos_entrega a usuarios autenticados" ON public.tipos_entrega;
CREATE POLICY "Permitir lectura de tipos_entrega a usuarios autenticados"
    ON public.tipos_entrega FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE public.zonas_entrega ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir gestión de zonas de entrega a admins" ON public.zonas_entrega;
CREATE POLICY "Permitir gestión de zonas de entrega a admins"
    ON public.zonas_entrega FOR ALL USING (auth.role() = 'authenticated');