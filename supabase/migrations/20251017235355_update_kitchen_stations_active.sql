/*
  # Desactivar estaciones de cocina no necesarias

  1. Cambios
    - Desactivar estaciones: Bebidas y Ensaladas
    - Mantener activas solo: Parrilla, Freidora y Postres
  
  2. Notas
    - Las estaciones desactivadas no se eliminar\u00e1n para mantener integridad referencial
    - Los items de cocina existentes en esas estaciones no se ver\u00e1n afectados
    - Solo se actualiza el campo active a false
*/

-- Desactivar estaciones de Bebidas y Ensaladas
UPDATE estaciones_cocina
SET active = false
WHERE LOWER(nombre) IN ('bebidas', 'ensaladas');

-- Verificar que solo Parrilla, Freidora y Postres est\u00e9n activas
UPDATE estaciones_cocina
SET active = true
WHERE LOWER(nombre) IN ('parrilla', 'freidora', 'postres');
