/*
  # Agregar campo de tiempo de entrega a pedidos

  1. Cambios
    - Agregar columna `tiempo_entrega_minutos` a la tabla `pedidos`
      - Tipo: integer
      - Permite registrar el tiempo estimado de entrega en minutos
      - Nullable: permite valores NULL para pedidos antiguos
    
  2. Notas
    - Este campo ayuda a rastrear si un pedido está en tiempo o demorado
    - Se registra el tiempo que se le comentó al cliente al momento de hacer el pedido
*/

-- Agregar columna de tiempo de entrega
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'tiempo_entrega_minutos'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN tiempo_entrega_minutos integer;
  END IF;
END $$;

-- Agregar comentario explicativo
COMMENT ON COLUMN pedidos.tiempo_entrega_minutos IS 'Tiempo de entrega estimado en minutos que se le comunicó al cliente';
