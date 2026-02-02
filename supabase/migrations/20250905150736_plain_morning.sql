/*
  # Añadir columna updated_at a tabla insumos

  1. Nuevas Columnas
    - `updated_at` (timestamp with time zone) - Fecha de última modificación del registro

  2. Triggers
    - Añade trigger `on_insumos_update` que llama a `handle_updated_at()` antes de cada UPDATE
    - Esto asegura que `updated_at` se actualice automáticamente cuando se modifique cualquier campo del insumo

  3. Inicialización
    - Establece `updated_at` con la fecha actual para todos los registros existentes
*/

-- Añadir la columna updated_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insumos' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE insumos ADD COLUMN updated_at timestamptz;
  END IF;
END $$;

-- Inicializar updated_at para registros existentes
UPDATE insumos 
SET updated_at = created_at 
WHERE updated_at IS NULL AND created_at IS NOT NULL;

-- Para registros sin created_at, usar la fecha actual
UPDATE insumos 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Crear el trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS on_insumos_update ON insumos;

CREATE TRIGGER on_insumos_update
  BEFORE UPDATE ON insumos
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();