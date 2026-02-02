/*
  # Añadir flag de estado final a pedido_estados

  1. Nueva columna
    - Añadir `es_estado_final` a la tabla `pedido_estados`
    - Marcar estados 'Completado' y 'Cancelado' como finales
  
  2. Comentarios
    - Documentar el propósito de la nueva columna
*/

-- Agrega la nueva columna a la tabla de estados de pedido
ALTER TABLE public.pedido_estados
ADD COLUMN IF NOT EXISTS es_estado_final BOOLEAN NOT NULL DEFAULT FALSE;

-- Comentario para la nueva columna
COMMENT ON COLUMN public.pedido_estados.es_estado_final IS 'Indica si el estado es final y el pedido ya no se considera activo (ej. Completado, Cancelado)';

-- Actualiza los estados existentes para marcar 'Completado' y 'Cancelado' como finales
UPDATE public.pedido_estados
SET es_estado_final = TRUE
WHERE nombre IN ('Completado', 'Cancelado');