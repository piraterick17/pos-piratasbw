# Cambio: Repartidores ahora son Usuarios con Rol

## Resumen

Se ha cambiado el sistema de repartidores para que ahora sean usuarios del sistema con el rol "Repartidor", en lugar de usar una tabla separada `repartidores`. Esto unifica la gestión de usuarios y simplifica la autenticación.

---

## Problema de Foreign Keys Ambiguas (RESUELTO)

### Error Original

```
Error: PGRST201
Could not embed because more than one relationship was found for 'usuarios' and 'usuario_roles'
```

### Causa

La tabla `usuario_roles` tiene **dos foreign keys** hacia `usuarios`:
1. `usuario_roles_usuario_id_fkey` - Relación principal (usuario_id → usuarios.id)
2. `usuario_roles_asignado_por_fkey` - Auditoría (asignado_por → usuarios.id)

Cuando se hace un `select` con join implícito, Supabase no sabe cuál usar.

### Solución

**❌ Query Ambiguo (No Funciona):**
```typescript
.select(`
  id, nombre, email, activo,
  usuario_roles!inner(
    rol_id,
    roles!inner(nombre)
  )
`)
```

**✅ Query Explícito (Funciona):**
```typescript
.select(`
  id, nombre, email, activo,
  usuario_roles!usuario_roles_usuario_id_fkey!inner(
    rol_id,
    roles!inner(nombre)
  )
`)
```

Se especifica explícitamente el nombre de la foreign key: `!usuario_roles_usuario_id_fkey`

---

## Cambios en Base de Datos

### Migración: `change_repartidor_id_to_uuid_complete.sql`

**Cambios Principales:**

1. **Columna `repartidor_id` en `asignaciones_entrega`**
   - ❌ **Antes:** `bigint` (apuntaba a `repartidores.id`)
   - ✅ **Ahora:** `uuid` (apunta a `usuarios.id`)

2. **Foreign Key Actualizada**
   ```sql
   FOREIGN KEY (repartidor_id)
   REFERENCES usuarios(id)
   ON DELETE SET NULL
   ```

3. **Índice Creado**
   ```sql
   CREATE INDEX idx_asignaciones_repartidor_id
   ON asignaciones_entrega(repartidor_id)
   WHERE repartidor_id IS NOT NULL;
   ```

### Políticas RLS Actualizadas

**Antes:**
```sql
-- Verificaba en tabla repartidores con usuario_id
repartidor_id IN (
  SELECT id FROM repartidores
  WHERE usuario_id = auth.uid()
)
```

**Ahora:**
```sql
-- Verifica directamente con el UUID del usuario
repartidor_id = auth.uid()
```

### Vistas Actualizadas

Se recrearon 4 vistas para trabajar con usuarios:

1. **`v_asignaciones_pendientes`** - Sin cambios funcionales
2. **`v_entregas_activas`** - Ahora hace JOIN con `usuarios` en lugar de `repartidores`
3. **`v_desempeno_repartidores`** - Ahora busca usuarios con rol "Repartidor"
4. **`v_pedidos_sin_asignar`** - Sin cambios funcionales

---

## Cambios en Frontend

### 1. Tipos TypeScript (`asignacionesStore.ts`)

**Interfaz `Repartidor` actualizada:**

```typescript
// Antes
export interface Repartidor {
  id: number;
  usuario_id?: string;
  nombre: string;
  telefono: string;
  vehiculo_tipo?: string;
  placa_vehiculo?: string;
  estado: 'disponible' | 'en_ruta' | 'no_disponible' | 'inactivo';
  activo: boolean;
}

// Ahora
export interface Repartidor {
  id: string;              // UUID del usuario
  nombre: string;
  email: string;
  telefono?: string;
  activo: boolean;
  rol_nombre?: string;
}
```

**Interfaz `AsignacionEntrega` actualizada:**

```typescript
// Cambio en el tipo de repartidor_id
repartidor_id?: string;  // Era: number
```

### 2. Query de Repartidores (`asignacionesStore.ts`)

**Antes:**
```typescript
const { data } = await supabase
  .from('repartidores')
  .select('*')
  .eq('activo', true);
```

**Ahora:**
```typescript
const { data } = await supabase
  .from('usuarios')
  .select(`
    id,
    nombre,
    email,
    activo,
    usuario_roles!inner(
      rol_id,
      roles!inner(nombre)
    )
  `)
  .eq('activo', true)
  .eq('usuario_roles.roles.nombre', 'Repartidor');
```

### 3. Query de Asignaciones (`asignacionesStore.ts`)

**Antes:**
```typescript
repartidor:repartidores(
  id,
  nombre,
  telefono,
  vehiculo_tipo,
  placa_vehiculo,
  estado
)
```

**Ahora:**
```typescript
repartidor:usuarios(
  id,
  nombre,
  email,
  activo
)
```

### 4. Función `asignarRepartidor` (`asignacionesStore.ts`)

**Antes:**
```typescript
asignarRepartidor: async (asignacionId: number, repartidorId: number)
```

**Ahora:**
```typescript
asignarRepartidor: async (asignacionId: number, repartidorId: string)
```

### 5. Función `handleAsignarRapido` (`GestionEnvios.tsx`)

**Antes:**
```typescript
handleAsignarRapido(pedidoId: number, asignacionId: number | undefined, repartidorId: number)
```

**Ahora:**
```typescript
handleAsignarRapido(pedidoId: number, asignacionId: number | undefined, repartidorId: string)
```

### 6. Dropdown de Repartidores (`GestionEnvios.tsx`)

**Antes:**
```tsx
onChange={(e) => {
  handleAsignarRapido(pedido.id, asignacion?.id, parseInt(e.target.value));
}}
```

**Ahora:**
```tsx
onChange={(e) => {
  handleAsignarRapido(pedido.id, asignacion?.id, e.target.value);
}}
```

### 7. Modal de Asignación (`AsignarRepartidorModal.tsx`)

**Antes:**
```typescript
const [selectedRepartidorId, setSelectedRepartidorId] = useState<number | null>(null);
```

**Ahora:**
```typescript
const [selectedRepartidorId, setSelectedRepartidorId] = useState<string | null>(null);
```

**Cambios en UI:**
- ❌ Removido: Campos de `telefono`, `vehiculo_tipo`, `placa_vehiculo`, `estado`
- ✅ Agregado: Campo `email`
- ✅ Badge fijo: "Repartidor" en lugar de estado dinámico

---

## Cómo Usar

### Ver Repartidores Disponibles

**Antes:**
- Ir a "Repartidores"
- Ver lista de repartidores con vehículos

**Ahora:**
1. Ir a **"Usuarios"**
2. Los usuarios con rol **"Repartidor"** aparecen en el dropdown de asignación
3. Ejemplo: `repartopirata@gmail.com` → Usuario "Repartidor Pirata"

### Asignar Repartidor a Pedido

1. Ve a **Gestión de Envíos → Entregas Pendientes**
2. En la tarjeta del pedido, verás la sección naranja **"Asignar Repartidor"**
3. Selecciona un usuario del dropdown (solo usuarios con rol "Repartidor")
4. Se asigna automáticamente

### Crear Nuevo Repartidor

**Antes:**
- Ir a "Repartidores" → Crear

**Ahora:**
1. Ir a **"Usuarios"** → Crear nuevo usuario
2. Asignar rol **"Repartidor"**
3. El usuario podrá:
   - Iniciar sesión en la aplicación
   - Ver solo sus entregas asignadas
   - Actualizar el estado de sus entregas

---

## Beneficios del Cambio

### ✅ 1. Autenticación Integrada
Los repartidores pueden iniciar sesión directamente con su email y contraseña, sin necesidad de vincular cuentas.

### ✅ 2. Permisos Granulares
Usando el sistema de roles y permisos, se puede controlar exactamente qué puede ver y hacer cada repartidor.

### ✅ 3. Gestión Centralizada
Todos los usuarios (admin, staff, repartidores) se gestionan desde el mismo lugar.

### ✅ 4. Escalabilidad
Más fácil agregar nuevos roles y permisos en el futuro.

### ✅ 5. Auditoría
Todas las acciones se registran con el UUID del usuario autenticado.

---

## Usuario de Prueba

**Email:** `repartopirata@gmail.com`
**Rol:** Repartidor
**Nombre:** Repartidor Pirata

Puedes iniciar sesión con este usuario para probar las funcionalidades del repartidor.

---

## Datos Importantes

### ⚠️ Asignaciones Existentes

**IMPORTANTE:** Como parte de la migración, todas las asignaciones existentes tuvieron su `repartidor_id` establecido a `NULL` porque el tipo de dato cambió de `bigint` a `uuid`.

**Esto significa que:**
- Los pedidos con repartidores asignados **perdieron su asignación**
- Necesitas **re-asignar** los repartidores desde la UI

**Cómo re-asignar:**
1. Ve a **Gestión de Envíos**
2. Para cada pedido sin repartidor, selecciona uno del dropdown
3. Guarda la asignación

---

## Testing

### Caso 1: Asignar Repartidor Nuevo
1. Crear un pedido a domicilio
2. Ir a Gestión de Envíos
3. Seleccionar "Repartidor Pirata" del dropdown
4. **Debe:** Asignarse correctamente y cambiar a sección verde

### Caso 2: Ver Entregas como Repartidor
1. Cerrar sesión
2. Iniciar sesión como `repartopirata@gmail.com`
3. Ir a "Mis Entregas"
4. **Debe:** Ver solo sus entregas asignadas

### Caso 3: Actualizar Estado de Entrega
1. Como repartidor, ir a "Mis Entregas"
2. Marcar entrega como "Recogido" o "En Camino"
3. **Debe:** Actualizar el estado correctamente

---

## Notas Técnicas

### UUID vs BigInt

**Por qué UUID:**
- Los usuarios en Supabase Auth usan UUID por defecto
- UUID es el estándar para identificadores de usuario
- Mejor para sistemas distribuidos y seguridad

**Por qué NO BigInt:**
- BigInt es auto-incremental, predecible
- No es compatible con Supabase Auth
- Requiere tabla adicional para mapeo

### Relación con Tabla `repartidores`

**Estado actual:**
- La tabla `repartidores` **TODAVÍA EXISTE** en la base de datos
- **NO se usa** en el nuevo sistema
- Se mantiene por compatibilidad con datos históricos

**Futuro:**
- Se puede eliminar la tabla `repartidores` si no se necesitan los datos antiguos
- O mantenerla como tabla de solo lectura para auditoría

---

## Build

✅ **Compilación exitosa** en 12.34s sin errores TypeScript
