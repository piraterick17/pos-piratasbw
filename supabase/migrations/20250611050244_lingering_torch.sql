/*
  # Añadir columna costo a productos

  1. Modificaciones
    - Añadir columna `costo` a la tabla `productos`
    - Validación para que el costo sea mayor o igual a 0
*/

-- ======================================================
-- PARCHE PARA AÑADIR COSTO A LA TABLA DE PRODUCTOS
-- ======================================================
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS costo numeric CHECK (costo >= 0);