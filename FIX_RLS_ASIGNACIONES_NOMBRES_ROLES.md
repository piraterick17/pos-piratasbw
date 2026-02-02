# Fix RLS: Nombres de Roles Incorrectos en Políticas

## Problema Original

```
POST /rest/v1/asignaciones_entrega 403 Forbidden
Error: new row violates row-level security policy for table "asignaciones_entrega"
```

### Causa Raíz

Las políticas RLS de `asignaciones_entrega` usaban **nombres de roles incorrectos**:

**❌ Nombres en Políticas (Incorrectos):**
- 'Administrador'
- 'Gerente'
- 'Staff'

**✅ Nombres Reales en BD:**
- 'admin'
- 'vendedor'
- 'Encargada'
- 'Repartidor'

Como los nombres no coincidían, **ningún usuario podía crear asignaciones** (INSERT), causando el error 403.

---

## Solución Implementada

### Migración: `fix_asignaciones_rls_roles_correctos.sql`

Se eliminaron todas las políticas antiguas y se crearon nuevas con los **nombres correctos** de roles:

#### Políticas para Staff (admin, vendedor, Encargada)

| Operación | Política | Descripción |
|-----------|----------|-------------|
| SELECT | "Staff puede ver asignaciones" | Ve todas las asignaciones |
| INSERT | "Staff crea asignaciones" | Crea nuevas asignaciones |
| UPDATE | "Staff actualiza asignaciones" | Actualiza cualquier asignación |
| DELETE | "Admin elimina asignaciones" | Solo admin elimina |

#### Políticas para Repartidores

| Operación | Política | Descripción |
|-----------|----------|-------------|
| SELECT | "Repartidores ven sus asignaciones" | Solo ve donde `repartidor_id = auth.uid()` |
| UPDATE | "Repartidores actualizan sus asignaciones" | Solo actualiza sus propias asignaciones |

### Ejemplo de Política Corregida

**Antes (No funcionaba):**
```sql
CREATE POLICY "Staff puede crear asignaciones"
  ON asignaciones_entrega
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND r.nombre IN ('Administrador', 'Gerente', 'Staff')  -- ❌
    )
  );
```

**Después (Funciona):**
```sql
CREATE POLICY "Staff crea asignaciones"
  ON asignaciones_entrega
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre IN ('admin', 'vendedor', 'Encargada')  -- ✅
    )
  );
```

---

## Validación

### Roles en Sistema

```sql
SELECT nombre FROM roles;

-- Resultado:
admin
vendedor
Encargada
Repartidor
```

### Usuarios por Rol

| Usuario | Email | Rol |
|---------|-------|-----|
| Erick Nuñez | meriick17@gmail.com | admin |
| Alejandra Reyes | alecaro234@gmail.com | vendedor |
| Julia Reyes | bw.thepirate@gmail.com | Encargada |
| Repartidor Pirata | repartopirata@gmail.com | Repartidor |

---

## Resultado

✅ **Ahora los usuarios con roles 'admin', 'vendedor' y 'Encargada' pueden:**
- Ver todas las asignaciones
- Crear nuevas asignaciones
- Actualizar asignaciones
- Eliminar asignaciones (solo admin)

✅ **Los repartidores pueden:**
- Ver solo sus propias asignaciones
- Actualizar solo sus propias asignaciones

---

## Lección Aprendida

**SIEMPRE verificar que los nombres de roles en las políticas RLS coincidan EXACTAMENTE con los nombres en la tabla `roles`.**

Los nombres de roles son **case-sensitive** y deben coincidir exactamente.
