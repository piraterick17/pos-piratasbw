# Fix RLS - Gestión de Roles y Permisos

## Problema Identificado

Al intentar actualizar roles (nombre, descripción) o modificar permisos asociados, se presentaban errores 403:

```
Error: new row violates row-level security policy for table "rol_permisos"
code: "42501"
```

### Causa Raíz

Las políticas RLS (Row Level Security) en las tablas `roles` y `rol_permisos` estaban configuradas para que **SOLO** el `service_role` pudiera modificarlas. Esto impedía que usuarios autenticados (incluso con el permiso `roles.gestionar`) pudieran hacer cambios.

## Solución Implementada

### 1. Función Auxiliar `tiene_permiso`

Se creó una función de base de datos que verifica si el usuario actual tiene un permiso específico:

```sql
CREATE FUNCTION tiene_permiso(permiso_nombre text) RETURNS boolean
```

**Funcionalidad:**
- Consulta las tablas `usuario_roles`, `rol_permisos` y `permisos`
- Verifica si el usuario actual (`auth.uid()`) tiene el permiso solicitado
- Retorna `true` o `false`
- Ejecutada con `SECURITY DEFINER` para acceso consistente

### 2. Nuevas Políticas RLS para tabla `roles`

#### Política UPDATE
```sql
CREATE POLICY "Users with roles.gestionar can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (tiene_permiso('roles.gestionar'))
  WITH CHECK (tiene_permiso('roles.gestionar'));
```

**Permite:**
- Usuarios con permiso `roles.gestionar` pueden actualizar nombre y descripción de roles

#### Política INSERT
```sql
CREATE POLICY "Users with roles.gestionar can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (tiene_permiso('roles.gestionar'));
```

**Permite:**
- Usuarios con permiso `roles.gestionar` pueden crear nuevos roles

#### Política DELETE
```sql
CREATE POLICY "Service role can delete roles"
  ON roles FOR DELETE
  TO service_role
  USING (true);
```

**Restricción:**
- Solo `service_role` puede eliminar roles (protección adicional)

### 3. Nuevas Políticas RLS para tabla `rol_permisos`

#### Política INSERT
```sql
CREATE POLICY "Users with roles.gestionar can insert rol_permisos"
  ON rol_permisos FOR INSERT
  TO authenticated
  WITH CHECK (tiene_permiso('roles.gestionar'));
```

**Permite:**
- Agregar permisos a roles existentes

#### Política DELETE
```sql
CREATE POLICY "Users with roles.gestionar can delete rol_permisos"
  ON rol_permisos FOR DELETE
  TO authenticated
  USING (tiene_permiso('roles.gestionar'));
```

**Permite:**
- Remover permisos de roles existentes

## Operaciones Ahora Permitidas

### ✅ Con permiso `roles.gestionar`

1. **Actualizar información de roles**
   - Cambiar nombre del rol
   - Modificar descripción del rol

2. **Gestionar permisos de roles**
   - Agregar nuevos permisos a un rol
   - Remover permisos de un rol

3. **Crear nuevos roles**
   - Definir nombre y descripción
   - Asignar permisos iniciales

### ❌ Operaciones Restringidas

1. **Eliminar roles**
   - Solo permitido a `service_role`
   - Protección contra eliminación accidental

## Verificación

### Usuario Admin (meriick17@gmail.com)
- ✅ Tiene permiso `roles.gestionar`
- ✅ Puede actualizar roles
- ✅ Puede gestionar permisos

### Usuario Vendedor (alecaro234@gmail.com)
- ❌ NO tiene permiso `roles.gestionar`
- ❌ NO puede modificar roles ni permisos
- ✅ Puede VER roles y permisos (política SELECT)

## Seguridad

### Capas de Protección

1. **Autenticación:** Usuario debe estar autenticado
2. **Autorización:** Usuario debe tener permiso `roles.gestionar`
3. **RLS:** Políticas verifican permiso antes de cada operación
4. **Función SECURITY DEFINER:** Consulta consistente de permisos

### Políticas Mantenidas

- **SELECT:** Todos los usuarios autenticados pueden VER roles y permisos
- **DELETE roles:** Solo service_role
- **Auditoría:** Campos `insert_by_user`, `updated_by_user` mantienen trazabilidad

## Pruebas Recomendadas

### Como Admin (meriick17@gmail.com)
1. ✅ Ir a sección "Roles y Permisos"
2. ✅ Editar un rol existente (cambiar nombre/descripción)
3. ✅ Agregar/remover permisos de un rol
4. ✅ Crear un nuevo rol
5. ✅ Verificar que los cambios se guardan correctamente

### Como Vendedor (alecaro234@gmail.com)
1. ❌ Intentar acceder a "Roles y Permisos"
2. ✅ Debería ver "Acceso Denegado"
3. ✅ No aparece la opción en el menú

## Archivos Modificados

### Migración Nueva
- `supabase/migrations/YYYYMMDD_fix_roles_rls_permissions.sql`

### Componentes (sin cambios)
- Sistema de permisos ya implementado en migración anterior
- Frontend ya tenía validación de permisos

## Notas Técnicas

- La función `tiene_permiso` se ejecuta en cada operación
- Performance optimizada con índices existentes en las tablas
- No hay cambios en el frontend, todo es a nivel de base de datos
- Compatible con sistema de permisos existente

## Próximos Pasos

Si necesitas:
1. Agregar más permisos granulares (ej: `roles.crear`, `roles.editar` separados)
2. Auditoría de cambios en roles/permisos
3. Notificaciones cuando se modifican roles
4. Historial de cambios en permisos

Estos pueden implementarse sin afectar la estructura actual.
