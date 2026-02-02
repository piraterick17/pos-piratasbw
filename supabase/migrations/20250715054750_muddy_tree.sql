/*
  # Añadir estado "En Reparto" y sus transiciones

  1. New States
    - Añade el estado "En Reparto" a la tabla pedido_estados
  
  2. Transitions
    - Configura las transiciones válidas para el nuevo estado:
      - De "Listo para Entrega" a "En Reparto"
      - De "En Reparto" a "Completado"
*/

-- 1. Añadir el nuevo estado
INSERT INTO public.pedido_estados (nombre, descripcion, color_hex, es_estado_final)
VALUES ('En Reparto', 'El pedido ha salido del local y está en camino al cliente.', '#4F46E5', FALSE)
ON CONFLICT (nombre) DO NOTHING;

-- 2. Añadir las nuevas transiciones válidas
INSERT INTO public.estado_transiciones (estado_origen_id, estado_destino_id)
VALUES
    -- De Listo para Entrega -> a En Reparto
    ((SELECT id FROM public.pedido_estados WHERE nombre = 'Listo para Entrega'), (SELECT id FROM public.pedido_estados WHERE nombre = 'En Reparto')),
    -- De En Reparto -> a Completado
    ((SELECT id FROM public.pedido_estados WHERE nombre = 'En Reparto'), (SELECT id FROM public.pedido_estados WHERE nombre = 'Completado'))
ON CONFLICT (estado_origen_id, estado_destino_id) DO NOTHING;