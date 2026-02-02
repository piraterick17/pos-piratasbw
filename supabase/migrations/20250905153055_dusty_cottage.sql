/*
  # Añadir columna updated_by_user a tabla insumos

  1. Cambios
    - Añadir columna `updated_by_user` a la tabla `insumos`
    - La columna será de tipo `uuid` y referenciará al usuario que realizó la última actualización
    - Se inicializará con NULL para registros existentes

  2. Consistencia
    - Hace que la tabla `insumos` sea consistente con otras tablas del sistema como `clientes`, `productos`, etc.
    - Permite que el trigger `handle_updated_at()` funcione correctamente
*/

-- Añadir la columna updated_by_user a la tabla insumos
ALTER TABLE insumos 
ADD COLUMN IF NOT EXISTS updated_by_user uuid;

-- Añadir comentario a la columna
COMMENT ON COLUMN insumos.updated_by_user IS 'Usuario que realizó la última actualización del registro';