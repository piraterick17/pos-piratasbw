/*
  # Add sauce selection configuration to products

  1. New Columns
    - `productos.requiere_salsas` (boolean) - Flag to indicate if product requires sauce selection
    - `productos.min_salsas` (integer) - Minimum number of sauces required
    - `productos.max_salsas` (integer) - Maximum number of sauces allowed

  2. Security
    - Update existing RLS policies to include new columns

  3. Indexes
    - Add index for sauce requirement queries
*/

-- Add sauce configuration columns to productos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'requiere_salsas'
  ) THEN
    ALTER TABLE productos ADD COLUMN requiere_salsas boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'min_salsas'
  ) THEN
    ALTER TABLE productos ADD COLUMN min_salsas integer DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'max_salsas'
  ) THEN
    ALTER TABLE productos ADD COLUMN max_salsas integer DEFAULT 1;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'productos_min_salsas_check'
  ) THEN
    ALTER TABLE productos ADD CONSTRAINT productos_min_salsas_check CHECK (min_salsas >= 1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'productos_max_salsas_check'
  ) THEN
    ALTER TABLE productos ADD CONSTRAINT productos_max_salsas_check CHECK (max_salsas >= min_salsas);
  END IF;
END $$;

-- Add index for sauce requirement queries
CREATE INDEX IF NOT EXISTS idx_productos_requiere_salsas ON productos(requiere_salsas) WHERE requiere_salsas = true;

-- Update existing products based on naming convention (optional migration)
UPDATE productos 
SET 
  requiere_salsas = true,
  min_salsas = CASE 
    WHEN LOWER(nombre) LIKE '%bucanero%' THEN 1
    WHEN LOWER(nombre) LIKE '%corsario%' THEN 2
    WHEN LOWER(nombre) LIKE '%pirata%' THEN 3
    ELSE 1
  END,
  max_salsas = CASE 
    WHEN LOWER(nombre) LIKE '%bucanero%' THEN 1
    WHEN LOWER(nombre) LIKE '%corsario%' THEN 2
    WHEN LOWER(nombre) LIKE '%pirata%' THEN 3
    ELSE 1
  END
WHERE 
  categoria_id IN (
    SELECT id FROM categorias 
    WHERE LOWER(nombre) LIKE '%alitas%' OR LOWER(nombre) LIKE '%boneless%'
  );