/*
  # Agregar campo active a categorias (tabla de categor\u00edas de productos)

  1. Cambios
    - Agregar columna active (boolean) a la tabla categorias
    - Establecer default true para todas las categor\u00edas existentes
    - Crear \u00edndice para optimizar consultas filtradas por active
  
  2. Seguridad
    - No se requieren cambios en RLS ya que la tabla ya tiene pol\u00edticas configuradas
  
  3. Notas
    - Las categor\u00edas existentes se mantendr\u00e1n activas por defecto
    - Las categor\u00edas desactivadas no aparecer\u00e1n en la interfaz de venta
*/

-- Agregar columna active si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categorias' AND column_name = 'active'
  ) THEN
    ALTER TABLE categorias ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Asegurar que todas las categor\u00edas existentes est\u00e9n activas
UPDATE categorias
SET active = true
WHERE active IS NULL;

-- Crear \u00edndice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_categorias_active 
ON categorias(active) 
WHERE active = true;
