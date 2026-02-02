/*
  # Añadir soporte para Plus Codes de Google

  1. Nuevas columnas
    - Añadir columna `plus_code` a la tabla `pedidos`
    - Añadir columna `plus_code` a la tabla `clientes`
  
  2. Comentarios
    - Documentar el propósito de las nuevas columnas
    - Explicar el formato esperado de Plus Codes
*/

-- Añadir columna plus_code a la tabla pedidos
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS plus_code TEXT;

-- Añadir columna plus_code a la tabla clientes
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS plus_code TEXT;

-- Comentarios para documentar las nuevas columnas
COMMENT ON COLUMN public.pedidos.plus_code IS 'Plus Code de Google para ubicación precisa del envío (formato: 8FW4V75V+8Q)';
COMMENT ON COLUMN public.clientes.plus_code IS 'Plus Code de Google para ubicación precisa del cliente (formato: 8FW4V75V+8Q)';

-- Crear índices para mejorar el rendimiento de búsquedas por plus_code
CREATE INDEX IF NOT EXISTS idx_pedidos_plus_code ON public.pedidos(plus_code);
CREATE INDEX IF NOT EXISTS idx_clientes_plus_code ON public.clientes(plus_code);