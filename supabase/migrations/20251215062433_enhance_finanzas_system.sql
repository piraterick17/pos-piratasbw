/*
  # Mejoras al Sistema de Finanzas

  1. Mejoras a finanzas_movimientos:
    - Agregar campo `referencia` para folio/número de factura

  2. Mejoras a finanzas_pagos_recurrentes:
    - Agregar campo `proveedor_id` para asociar con proveedores
    - Agregar campo `metodo_pago` para registrar el método de pago
    - Actualizar frecuencias permitidas para incluir 'quincenal' y 'trimestral'

  3. Seguridad:
    - Sin cambios en RLS, se mantienen las políticas existentes
*/

-- Agregar campo referencia a finanzas_movimientos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finanzas_movimientos' AND column_name = 'referencia'
  ) THEN
    ALTER TABLE public.finanzas_movimientos ADD COLUMN referencia TEXT;
    COMMENT ON COLUMN public.finanzas_movimientos.referencia IS 'Número de referencia, folio o factura del movimiento';
  END IF;
END $$;

-- Agregar campos a finanzas_pagos_recurrentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finanzas_pagos_recurrentes' AND column_name = 'proveedor_id'
  ) THEN
    ALTER TABLE public.finanzas_pagos_recurrentes ADD COLUMN proveedor_id BIGINT REFERENCES public.proveedores(id);
    COMMENT ON COLUMN public.finanzas_pagos_recurrentes.proveedor_id IS 'Proveedor asociado al pago recurrente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finanzas_pagos_recurrentes' AND column_name = 'metodo_pago'
  ) THEN
    ALTER TABLE public.finanzas_pagos_recurrentes ADD COLUMN metodo_pago TEXT;
    COMMENT ON COLUMN public.finanzas_pagos_recurrentes.metodo_pago IS 'Método de pago del gasto recurrente';
  END IF;
END $$;

-- Actualizar el constraint de frecuencia para incluir más opciones
DO $$
BEGIN
  -- Eliminar el constraint existente si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'finanzas_pagos_recurrentes' AND constraint_name LIKE '%frecuencia%'
  ) THEN
    ALTER TABLE public.finanzas_pagos_recurrentes DROP CONSTRAINT IF EXISTS finanzas_pagos_recurrentes_frecuencia_check;
  END IF;

  -- Crear el nuevo constraint con todas las frecuencias
  ALTER TABLE public.finanzas_pagos_recurrentes
    ADD CONSTRAINT finanzas_pagos_recurrentes_frecuencia_check
    CHECK (frecuencia IN ('diario', 'semanal', 'quincenal', 'mensual', 'trimestral', 'anual'));
END $$;

-- Crear índice para optimizar búsquedas por proveedor en pagos recurrentes
CREATE INDEX IF NOT EXISTS idx_finanzas_pagos_recurrentes_proveedor
ON public.finanzas_pagos_recurrentes(proveedor_id);

-- Crear índice para optimizar búsquedas por referencia en movimientos
CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_referencia
ON public.finanzas_movimientos(referencia) WHERE referencia IS NOT NULL;
