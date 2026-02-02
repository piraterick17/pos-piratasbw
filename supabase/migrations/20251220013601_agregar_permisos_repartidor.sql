/*
  # Agregar permisos específicos para repartidores
  
  1. Nuevos Permisos
    - `envios.repartidor.ver` 
      - Permite a repartidores ver sus entregas asignadas
      - Solo sus propias asignaciones, no todas
    
    - `envios.repartidor.actualizar`
      - Permite actualizar el estado de entregas propias
      - Marcar como recogido, en camino, entregado
      - Agregar notas y tiempo de entrega
  
  2. Modificaciones
    - Se agregan a la tabla permisos
    - Pueden ser asignados a roles de tipo "Repartidor"
*/

-- Insertar los nuevos permisos para repartidores
INSERT INTO permisos (nombre, descripcion) VALUES
  (
    'envios.repartidor.ver', 
    'Permite ver las entregas asignadas al repartidor (solo sus propias entregas)'
  ),
  (
    'envios.repartidor.actualizar', 
    'Permite actualizar el estado de entregas propias (recoger, iniciar entrega, marcar entregado)'
  )
ON CONFLICT (nombre) DO NOTHING;

-- Comentario para documentación
COMMENT ON TABLE permisos IS 
  'Tabla de permisos del sistema. Los permisos de repartidor permiten gestionar entregas asignadas';
