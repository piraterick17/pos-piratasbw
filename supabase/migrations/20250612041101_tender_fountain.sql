/*
  # Esquema completo para gestión de pedidos (V2 - CON EDICIÓN)

  1. Modificaciones a tabla pedidos
    - Añadir campos para estado, método de pago, subtotal, descuentos, impuestos
    - Asegurar que todos los campos necesarios existan
  
  2. Modificaciones a tabla detalles_pedido
    - Añadir campos para precio original y descuentos por producto
    - Mejorar la robustez del sistema
  
  3. Permisos y políticas de seguridad
    - Crear permisos específicos para pedidos
    - Aplicar políticas de seguridad apropiadas
  
  4. Índices y optimizaciones
    - Crear índices para mejorar el rendimiento
*/

-- =================================================================
-- ESQUEMA COMPLETO PARA GESTIÓN DE PEDIDOS (V2 - CON EDICIÓN)
-- =================================================================

-- 1. MODIFICAR LA TABLA 'pedidos' CON TODOS LOS CAMPOS NECESARIOS
DO $$
BEGIN
  -- Añadir columnas solo si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'estado') THEN
    ALTER TABLE public.pedidos ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'metodo_pago') THEN
    ALTER TABLE public.pedidos ADD COLUMN metodo_pago TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'subtotal') THEN
    ALTER TABLE public.pedidos ADD COLUMN subtotal NUMERIC(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'descuentos') THEN
    ALTER TABLE public.pedidos ADD COLUMN descuentos NUMERIC(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'impuestos') THEN
    ALTER TABLE public.pedidos ADD COLUMN impuestos NUMERIC(10, 2);
  END IF;
  
  -- Renombrar observaciones a notas si existe
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'observaciones') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'notas') THEN
    ALTER TABLE public.pedidos RENAME COLUMN observaciones TO notas;
  END IF;
  
  -- Si no existe notas, crearla
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'notas') THEN
    ALTER TABLE public.pedidos ADD COLUMN notas TEXT;
  END IF;
  
  -- Asegurar que la columna 'total' exista
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'total') THEN
    ALTER TABLE public.pedidos ADD COLUMN total NUMERIC(10, 2);
  END IF;
END $$;

-- Añadir constraint para el estado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'pedidos_estado_check') THEN
    ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_estado_check 
    CHECK (estado IN ('borrador', 'pendiente', 'completado', 'cancelado'));
  END IF;
END $$;

-- 2. MODIFICAR LA TABLA 'detalles_pedido' PARA SER MÁS ROBUSTA
DO $$
BEGIN
  -- Añadir columnas solo si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'detalles_pedido' AND column_name = 'precio_unitario_original') THEN
    ALTER TABLE public.detalles_pedido ADD COLUMN precio_unitario_original NUMERIC(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'detalles_pedido' AND column_name = 'descuento_aplicado') THEN
    ALTER TABLE public.detalles_pedido ADD COLUMN descuento_aplicado NUMERIC(10, 2);
  END IF;
END $$;

-- 3. AÑADIR LOS PERMISOS DE SEGURIDAD NECESARIOS
INSERT INTO public.permisos (nombre, descripcion)
VALUES
    ('pedidos.crear', 'Permite crear nuevos pedidos'),
    ('pedidos.leer', 'Permite ver la lista de pedidos'),
    ('pedidos.actualizar', 'Permite editar pedidos existentes'),
    ('pedidos.eliminar', 'Permite eliminar pedidos')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT
    (SELECT id FROM public.roles WHERE nombre = 'admin'),
    p.id
FROM public.permisos p WHERE p.nombre LIKE 'pedidos.%'
ON CONFLICT DO NOTHING;

-- 4. APLICAR POLÍTICAS DE SEGURIDAD
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir gestión de pedidos a usuarios autenticados" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir gestión de pedidos a admins" ON public.pedidos;
CREATE POLICY "Permitir gestión de pedidos a usuarios autenticados" ON public.pedidos
FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.detalles_pedido ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir gestión de detalles de pedido a usuarios autenticados" ON public.detalles_pedido;
DROP POLICY IF EXISTS "Permitir gestión de detalles a admins" ON public.detalles_pedido;
CREATE POLICY "Permitir gestión de detalles de pedido a usuarios autenticados" ON public.detalles_pedido
FOR ALL USING (auth.role() = 'authenticated');

-- 5. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON public.pedidos(insert_date);
CREATE INDEX IF NOT EXISTS idx_detalles_pedido_pedido ON public.detalles_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_detalles_pedido_producto ON public.detalles_pedido(producto_id);

-- 6. ACTUALIZAR VALORES POR DEFECTO PARA CAMPOS EXISTENTES
UPDATE public.pedidos SET 
  estado = COALESCE(estado, 'pendiente'),
  total = COALESCE(total, 0),
  subtotal = COALESCE(subtotal, 0),
  descuentos = COALESCE(descuentos, 0),
  impuestos = COALESCE(impuestos, 0)
WHERE estado IS NULL OR total IS NULL OR subtotal IS NULL OR descuentos IS NULL OR impuestos IS NULL;

-- 7. FUNCIÓN PARA CALCULAR TOTALES AUTOMÁTICAMENTE (OPCIONAL)
CREATE OR REPLACE FUNCTION public.calcular_total_pedido(pedido_id_param BIGINT)
RETURNS VOID AS $$
DECLARE
  nuevo_subtotal NUMERIC(10, 2);
BEGIN
  -- Calcular subtotal sumando todos los subtotales de los detalles
  SELECT COALESCE(SUM(subtotal), 0) INTO nuevo_subtotal
  FROM public.detalles_pedido
  WHERE pedido_id = pedido_id_param;
  
  -- Actualizar el pedido con el nuevo subtotal y total
  UPDATE public.pedidos
  SET 
    subtotal = nuevo_subtotal,
    total = nuevo_subtotal - COALESCE(descuentos, 0) + COALESCE(impuestos, 0)
  WHERE id = pedido_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRIGGER PARA ACTUALIZAR TOTALES AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.actualizar_totales_pedido()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar totales cuando se modifica un detalle
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.calcular_total_pedido(NEW.pedido_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.calcular_total_pedido(OLD.pedido_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_actualizar_totales_pedido ON public.detalles_pedido;
CREATE TRIGGER trigger_actualizar_totales_pedido
  AFTER INSERT OR UPDATE OR DELETE ON public.detalles_pedido
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_totales_pedido();