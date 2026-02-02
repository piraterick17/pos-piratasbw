/*
  # Robustecimiento del módulo de productos

  1. Modificaciones a tablas existentes
    - Añadir nuevos campos a la tabla `productos`
    - Habilitar RLS en `categorias`
  
  2. Nueva tabla
    - `movimientos_stock` para control de inventario
  
  3. Funciones y triggers
    - Automatización de actualización de stock
  
  4. Políticas de seguridad
    - Actualizar políticas existentes
    - Crear políticas para nuevas funcionalidades
*/

-- =================================================================
-- SCRIPT SEGURO PARA ROBUSTECER EL MÓDULO DE PRODUCTOS
-- Utiliza ALTER TABLE para modificar y DROP IF EXISTS para políticas.
-- =================================================================

-- 1. MODIFICAR LA TABLA 'categorias' (si es necesario)
-- Por ahora, la estructura que tenemos es suficiente, pero habilitamos RLS.
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de categorías a usuarios autenticados" ON public.categorias;
DROP POLICY IF EXISTS "Permitir gestión de categorías a admins" ON public.categorias;
CREATE POLICY "Permitir lectura de categorías a usuarios autenticados" ON public.categorias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gestión de categorías a admins" ON public.categorias FOR ALL USING (check_permission('categorias.gestionar'));

-- 2. MODIFICAR LA TABLA 'productos' PARA AÑADIR NUEVOS CAMPOS
-- Añadimos las columnas que faltaban del diseño.
DO $$
BEGIN
  -- Añadir columnas solo si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'codigo') THEN
    ALTER TABLE public.productos ADD COLUMN codigo text UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'precio_regular') THEN
    ALTER TABLE public.productos ADD COLUMN precio_regular numeric CHECK (precio_regular >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'precio_descuento') THEN
    ALTER TABLE public.productos ADD COLUMN precio_descuento numeric CHECK (precio_descuento >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'destacado') THEN
    ALTER TABLE public.productos ADD COLUMN destacado boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'disponible_catalogo') THEN
    ALTER TABLE public.productos ADD COLUMN disponible_catalogo boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'imagenes_urls') THEN
    ALTER TABLE public.productos ADD COLUMN imagenes_urls text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'etiqueta_nombre') THEN
    ALTER TABLE public.productos ADD COLUMN etiqueta_nombre text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'etiqueta_color') THEN
    ALTER TABLE public.productos ADD COLUMN etiqueta_color text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'controlar_stock') THEN
    ALTER TABLE public.productos ADD COLUMN controlar_stock boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'stock_minimo') THEN
    ALTER TABLE public.productos ADD COLUMN stock_minimo numeric DEFAULT 0;
  END IF;
  
  -- Renombrar la columna stock a stock_actual si es necesario
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'stock') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'stock_actual') THEN
    ALTER TABLE public.productos RENAME COLUMN stock TO stock_actual;
  END IF;
  
  -- Si no existe stock_actual, crearla
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'stock_actual') THEN
    ALTER TABLE public.productos ADD COLUMN stock_actual numeric DEFAULT 0;
  END IF;
END $$;

-- Actualizar valores por defecto para campos existentes
UPDATE public.productos SET 
  stock_actual = COALESCE(stock_actual, 0),
  unidad_medida = COALESCE(unidad_medida, 'unidad'),
  destacado = COALESCE(destacado, false),
  disponible_catalogo = COALESCE(disponible_catalogo, true),
  controlar_stock = COALESCE(controlar_stock, false),
  stock_minimo = COALESCE(stock_minimo, 0)
WHERE stock_actual IS NULL OR unidad_medida IS NULL OR destacado IS NULL 
   OR disponible_catalogo IS NULL OR controlar_stock IS NULL OR stock_minimo IS NULL;

-- Reemplazamos las políticas de productos para asegurar consistencia.
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de productos a usuarios autenticados" ON public.productos;
DROP POLICY IF EXISTS "Permitir inserción de productos a admins" ON public.productos;
DROP POLICY IF EXISTS "Permitir actualización de productos a admins" ON public.productos;
DROP POLICY IF EXISTS "Permitir eliminación de productos a admins" ON public.productos;
CREATE POLICY "Permitir lectura de productos a usuarios autenticados" ON public.productos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir inserción de productos a admins" ON public.productos FOR INSERT WITH CHECK (check_permission('productos.gestionar'));
CREATE POLICY "Permitir actualización de productos a admins" ON public.productos FOR UPDATE USING (check_permission('productos.gestionar'));
CREATE POLICY "Permitir eliminación de productos a admins" ON public.productos FOR DELETE USING (check_permission('productos.gestionar'));

-- 3. CREAR LA NUEVA TABLA 'movimientos_stock'
-- Esta tabla es nueva, por lo que 'CREATE TABLE IF NOT EXISTS' es seguro.
CREATE TABLE IF NOT EXISTS public.movimientos_stock (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    producto_id bigint NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    tipo_movimiento text NOT NULL, -- ej: 'compra', 'venta', 'ajuste_manual', 'devolucion'
    cantidad numeric NOT NULL,
    motivo text,
    fecha timestamptz DEFAULT now(),
    usuario_id uuid DEFAULT auth.uid(),
    CONSTRAINT movimientos_stock_tipo_check CHECK (tipo_movimiento IN ('compra', 'venta', 'ajuste_manual', 'devolucion', 'merma'))
);

ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de movimientos a autenticados" ON public.movimientos_stock;
DROP POLICY IF EXISTS "Permitir inserción de movimientos a admins" ON public.movimientos_stock;
CREATE POLICY "Permitir lectura de movimientos a autenticados" ON public.movimientos_stock FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir inserción de movimientos a admins" ON public.movimientos_stock FOR INSERT WITH CHECK (check_permission('stock.gestionar'));

-- 4. CREAR LA FUNCIÓN Y TRIGGER PARA AUTOMATIZAR EL STOCK
-- 'CREATE OR REPLACE' es seguro y actualizará la función si ya existe.
CREATE OR REPLACE FUNCTION public.actualizar_stock_producto()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualiza si el control de stock está activado para el producto
  IF (SELECT controlar_stock FROM public.productos WHERE id = NEW.producto_id) THEN
    UPDATE public.productos
    SET stock_actual = stock_actual + NEW.cantidad
    WHERE id = NEW.producto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos el trigger antiguo si existe, para evitar duplicados, y lo creamos.
DROP TRIGGER IF EXISTS on_movimiento_stock_insert ON public.movimientos_stock;
CREATE TRIGGER on_movimiento_stock_insert
AFTER INSERT ON public.movimientos_stock
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_stock_producto();

-- 5. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON public.productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_destacado ON public.productos(destacado);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON public.movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_fecha ON public.movimientos_stock(fecha);