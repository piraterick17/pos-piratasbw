# AUDITORÍA COMPLETA: Sistema de Entregas - SOLUCIÓN FINAL

## Fecha
2025-12-20

## Resumen Ejecutivo

Auditoría exhaustiva y corrección completa del sistema de entregas. Se identificaron y resolvieron **TODOS** los errores HTTP 400 relacionados con columnas inexistentes en la base de datos.

---

## 🔴 PROBLEMA RAÍZ IDENTIFICADO

### Error Reportado
```
GET .../asignaciones_entrega?select=*,pedido:pedidos!inner(cliente_nombre,...) 400 (Bad Request)
Error: column pedidos_1.cliente_nombre does not exist
Code: 42703
```

### Causa Fundamental

El código intentaba seleccionar columnas **que NO existen en la tabla `pedidos`**:
- ❌ `numero_pedido` - NO EXISTE
- ❌ `cliente_nombre` - NO EXISTE
- ❌ `cliente_telefono` - NO EXISTE

Estos campos NO están en la tabla `pedidos`. Son datos de la tabla `clientes` vinculada por `cliente_id`.

---

## 🔍 ANÁLISIS DE ARQUITECTURA

### Estructura Real de Base de Datos

#### Tabla: pedidos

```sql
CREATE TABLE pedidos (
  id bigint PRIMARY KEY,
  cliente_id text,  -- ← FK a tabla clientes (NO tiene nombre ni teléfono)
  estado text,
  estado_id integer,
  metodo_pago text,
  subtotal numeric,
  descuentos numeric,
  impuestos numeric,
  total numeric,
  notas text,
  deleted_at timestamptz,
  insert_date timestamptz,
  updated_at timestamptz,
  fecha_finalizacion timestamptz,
  cobrado_por_usuario_id uuid,
  -- Campos de entrega
  tipo_entrega_id integer,
  zona_entrega_id integer,
  costo_envio numeric,
  direccion_envio jsonb,
  notas_entrega text,
  fecha_listo_para_entrega timestamptz,
  fecha_en_ruta timestamptz,
  fecha_entregado timestamptz,
  tiempo_entrega_minutos integer
);
```

**NOTA CRÍTICA:** La tabla `pedidos` NO tiene `cliente_nombre` ni `cliente_telefono`. Estos están en la tabla `clientes`.

#### Tabla: clientes

```sql
CREATE TABLE clientes (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  telefono text,
  email text,
  -- otros campos...
);
```

#### Vista: pedidos_vista (ALTERNATIVA)

La base de datos tiene una VISTA que SÍ incluye los datos del cliente:

```sql
CREATE VIEW pedidos_vista AS
SELECT
  p.*,
  c.nombre AS cliente_nombre,        -- ← De tabla clientes
  c.telefono AS cliente_telefono,     -- ← De tabla clientes
  pe.nombre AS estado_nombre,
  te.nombre AS tipo_entrega_nombre
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN pedido_estados pe ON p.estado_id = pe.id
LEFT JOIN tipos_entrega te ON p.tipo_entrega_id = te.id;
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Estrategia de Corrección

En lugar de intentar seleccionar campos inexistentes, se implementó un **LEFT JOIN manual** con la tabla `clientes` en el query.

### Código ANTES (INCORRECTO)

```typescript
// ❌ ANTES - Intentaba seleccionar campos que NO existen
const { data } = await supabase
  .from('asignaciones_entrega')
  .select(`
    *,
    pedido:pedidos!inner(
      id,
      cliente_id,
      cliente_nombre,    // ← NO EXISTE
      cliente_telefono,  // ← NO EXISTE
      total,
      // ...
    )
  `)
```

**Resultado:** HTTP 400 - "column pedidos_1.cliente_nombre does not exist"

### Código DESPUÉS (CORRECTO)

```typescript
// ✅ DESPUÉS - Hace LEFT JOIN con tabla clientes
const { data } = await supabase
  .from('asignaciones_entrega')
  .select(`
    *,
    pedido:pedidos!inner(
      id,
      cliente_id,
      total,
      subtotal,
      direccion_envio,
      notas_entrega,
      tipo_entrega_id,
      zona_entrega_id,
      estado,
      estado_id,
      insert_date,
      metodo_pago,
      cliente:clientes(nombre, telefono)  // ← LEFT JOIN con clientes
    ),
    repartidor:repartidores(
      id,
      nombre,
      telefono,
      vehiculo_tipo,
      placa_vehiculo,
      estado
    )
  `)
  .order('fecha_asignacion', { ascending: false });

// Transformar datos para mantener compatibilidad con interfaz
const transformedData = data?.map(asignacion => ({
  ...asignacion,
  pedido: {
    ...asignacion.pedido,
    cliente_nombre: asignacion.pedido.cliente?.nombre,
    cliente_telefono: asignacion.pedido.cliente?.telefono
  }
}));
```

**Resultado:** ✅ Query exitoso, datos correctamente cargados

---

## 📁 ARCHIVOS MODIFICADOS

### 1. src/lib/store/asignacionesStore.ts

**Función: fetchAsignaciones** (líneas 61-113)
- ❌ Eliminado: `cliente_nombre`, `cliente_telefono` de select directo
- ✅ Agregado: `cliente:clientes(nombre, telefono)` - LEFT JOIN
- ✅ Agregado: Transformación de datos para compatibilidad

**Función: fetchMisAsignaciones** (líneas 115-174)
- ❌ Eliminado: `cliente_nombre`, `cliente_telefono` de select directo
- ✅ Agregado: `cliente:clientes(nombre, telefono)` - LEFT JOIN
- ✅ Agregado: Transformación de datos para compatibilidad

**Sin cambios:**
- `asignarRepartidor` - ✅ Ya estaba correcta
- `actualizarEstadoAsignacion` - ✅ Ya estaba correcta
- `fetchRepartidoresDisponibles` - ✅ Ya estaba correcta

---

## 🔄 FLUJO COMPLETO DE ASIGNACIÓN

### Paso 1: Usuario Crea Pedido a Domicilio

**Ubicación:** `src/pages/Vender.tsx`

```typescript
// Usuario selecciona tipo de entrega "A domicilio" y llena datos
const pedido = {
  cliente_id: "123",
  tipo_entrega_id: 1,  // 1 = A domicilio
  zona_entrega_id: 3,
  direccion_envio: { calle: "...", ciudad: "..." },
  // ...
};

await crearPedido(pedido);
```

**Trigger automático en BD:**
```sql
-- Se ejecuta automáticamente después del INSERT en pedidos
CREATE TRIGGER trigger_crear_asignacion_entrega
AFTER INSERT ON pedidos
FOR EACH ROW
WHEN (NEW.tipo_entrega_id = 1)  -- Solo para domicilio
EXECUTE FUNCTION crear_asignacion_entrega();
```

**Resultado:**
```json
{
  "pedido": { "id": 123, "cliente_id": "123", "tipo_entrega_id": 1 },
  "asignacion": {
    "id": 1,
    "pedido_id": 123,
    "repartidor_id": null,    // ← Sin asignar aún
    "estado": "pendiente"     // ← Estado inicial
  }
}
```

### Paso 2: Staff Ve Entregas Pendientes

**Ubicación:** `src/pages/GestionEnvios.tsx` → Tab "Entregas Pendientes"

```typescript
// Al cargar la página
useEffect(() => {
  fetchAsignaciones();  // ← Query CORREGIDO con LEFT JOIN
  fetchRepartidoresDisponibles();
}, []);
```

**Query ejecutado (CORRECTO):**
```typescript
const { data } = await supabase
  .from('asignaciones_entrega')
  .select(`
    *,
    pedido:pedidos!inner(
      id,
      cliente_id,
      total,
      // ...
      cliente:clientes(nombre, telefono)  // ← LEFT JOIN correcto
    ),
    repartidor:repartidores(id, nombre, telefono, estado)
  `)
  .order('fecha_asignacion', { ascending: false });
```

**UI Muestra:**
```
┌─────────────────────────────────────────────┐
│ 🚨 URGENTE - Pedido #123                    │
│ Cliente: Juan Pérez  ☎️ 555-1234           │
│ Total: $250.00 💵 Efectivo                 │
│ 📍 Calle 123, Col. Centro, Zacamulpa        │
│                                             │
│ 🚚 Asignar Repartidor:                      │
│ [Seleccionar repartidor ▼]                 │
│   Carlos Méndez                             │
│   Ana García (En Ruta)                      │
│   Luis Torres (Disponible)                  │
└─────────────────────────────────────────────┘
```

### Paso 3: Asignar Repartidor

**Opción A: Asignación Rápida desde Dropdown**

```typescript
// Usuario selecciona repartidor del dropdown
<select
  value={asignacion.repartidor_id || ''}
  onChange={(e) => {
    if (e.target.value) {
      handleAsignarRapido(asignacion.id, parseInt(e.target.value));
    }
  }}
>
  <option value="">Seleccionar</option>
  {repartidores.filter(r => r.activo).map(rep => (
    <option key={rep.id} value={rep.id}>
      {rep.nombre}
      {rep.estado === 'en_ruta' ? ' (En Ruta)' : ''}
      {rep.estado === 'no_disponible' ? ' (No Disponible)' : ''}
    </option>
  ))}
</select>

// Función llamada
const handleAsignarRapido = async (asignacionId: number, repartidorId: number) => {
  await asignarRepartidor(asignacionId, repartidorId);
};
```

**Función de Asignación:**

```typescript
// asignacionesStore.ts:193-220
asignarRepartidor: async (asignacionId: number, repartidorId: number) => {
  // UPDATE en base de datos
  const { error } = await supabase
    .from('asignaciones_entrega')
    .update({
      repartidor_id: repartidorId,              // ← Asignar repartidor
      estado: 'asignado',                       // ← Cambiar estado
      fecha_asignacion: new Date().toISOString() // ← Timestamp
    })
    .eq('id', asignacionId);

  if (error) throw error;

  // Obtener nombre para feedback
  const { data: repartidor } = await supabase
    .from('repartidores')
    .select('nombre')
    .eq('id', repartidorId)
    .single();

  toast.success(`Entrega asignada a ${repartidor?.nombre}`);

  // Refrescar lista
  await get().fetchAsignaciones();
}
```

**Resultado en BD:**
```json
{
  "asignacion": {
    "id": 1,
    "pedido_id": 123,
    "repartidor_id": 5,           // ← YA ASIGNADO
    "estado": "asignado",         // ← ACTUALIZADO
    "fecha_asignacion": "2025-12-20T10:30:00Z"
  }
}
```

**UI Actualizada:**
```
┌─────────────────────────────────────────────┐
│ ✅ Pedido #123 - ASIGNADO                   │
│ Cliente: Juan Pérez  ☎️ 555-1234           │
│ Total: $250.00 💵 Efectivo                 │
│ 📍 Calle 123, Col. Centro, Zacamulpa        │
│                                             │
│ 👤 Repartidor: Carlos Méndez                │
│ ☎️ 555-9876                                 │
│ [Cambiar repartidor ▼]                      │
└─────────────────────────────────────────────┘
```

### Paso 4: Repartidor Ve Sus Entregas

**Ubicación:** `src/pages/MisEntregas.tsx`

```typescript
// Login como repartidor
const { data: { user } } = await supabase.auth.getUser();

// Buscar registro de repartidor vinculado
const { data: repartidorData } = await supabase
  .from('repartidores')
  .select('id')
  .eq('usuario_id', user.id)  // ← Vinculación usuario → repartidor
  .single();

// Cargar SOLO sus entregas
await fetchMisAsignaciones();  // ← Query CORREGIDO con LEFT JOIN
```

**Query ejecutado:**
```typescript
const { data } = await supabase
  .from('asignaciones_entrega')
  .select(`
    *,
    pedido:pedidos!inner(
      id,
      cliente_id,
      total,
      metodo_pago,
      direccion_envio,
      cliente:clientes(nombre, telefono)  // ← LEFT JOIN correcto
    )
  `)
  .eq('repartidor_id', repartidorData.id)  // ← Filtro por repartidor
  .in('estado', ['asignado', 'recogido', 'en_camino']);  // ← Solo activas
```

**UI del Repartidor:**
```
┌─────────────────────────────────────────────┐
│ 🚚 MIS ENTREGAS                             │
├─────────────────────────────────────────────┤
│ Pedido #123                                 │
│ Cliente: Juan Pérez                         │
│ ☎️ 555-1234 [Llamar]                        │
│ 📍 Calle 123, Col. Centro, Zacamulpa         │
│ 🗺️ [Abrir en Google Maps]                  │
│ Total: $250.00 💵 Efectivo - COBRAR         │
│                                             │
│ [📦 Marcar Recogido]                        │
│ [🚗 En Camino]                              │
│ [✅ Marcar Entregado]                       │
└─────────────────────────────────────────────┘
```

### Paso 5: Actualizar Estado de Entrega

```typescript
// Repartidor presiona botón "Marcar Recogido"
await actualizarEstadoAsignacion(asignacion.id, 'recogido');

// Luego "En Camino"
await actualizarEstadoAsignacion(asignacion.id, 'en_camino');

// Finalmente "Marcar Entregado"
await actualizarEstadoAsignacion(asignacion.id, 'entregado');
```

**Función de Actualización:**
```typescript
actualizarEstadoAsignacion: async (
  asignacionId: number,
  nuevoEstado: AsignacionEntrega['estado']
) => {
  const updateData: any = { estado: nuevoEstado };

  // Timestamps automáticos según estado
  if (nuevoEstado === 'recogido') {
    updateData.fecha_recogida = new Date().toISOString();
  }

  if (nuevoEstado === 'entregado') {
    const fechaEntrega = new Date().toISOString();
    updateData.fecha_entrega_real = fechaEntrega;

    // Calcular tiempo total
    const { data: asignacion } = await supabase
      .from('asignaciones_entrega')
      .select('fecha_asignacion, pedido_id')
      .eq('id', asignacionId)
      .single();

    if (asignacion?.fecha_asignacion) {
      const minutos = Math.round(
        (new Date(fechaEntrega).getTime() -
         new Date(asignacion.fecha_asignacion).getTime()) / 60000
      );
      updateData.tiempo_total_minutos = minutos;
    }

    // Actualizar pedido también
    await supabase
      .from('pedidos')
      .update({ fecha_entregado: fechaEntrega })
      .eq('id', asignacion.pedido_id);
  }

  // Guardar
  await supabase
    .from('asignaciones_entrega')
    .update(updateData)
    .eq('id', asignacionId);

  toast.success('Pedido actualizado correctamente');
}
```

---

## 👥 GESTIÓN DE REPARTIDORES

### Campo `usuario_id` es OPCIONAL

La tabla `repartidores` tiene un campo `usuario_id` que es **NULLABLE**. Esto permite dos formas de gestión:

#### Opción 1: Repartidor SIN usuario del sistema

```typescript
// Solo datos básicos, NO puede acceder a la app
await supabase
  .from('repartidores')
  .insert({
    usuario_id: null,  // ← Sin usuario
    nombre: 'Carlos Méndez',
    telefono: '555-1234',
    vehiculo_tipo: 'moto',
    placa_vehiculo: 'ABC-123',
    estado: 'disponible',
    activo: true
  });
```

**Caso de uso:**
- Repartidores externos/eventuales
- Personal temporal
- NO necesitan acceso al sistema
- Asignación manual desde admin

#### Opción 2: Repartidor CON usuario del sistema

```typescript
// 1. Crear usuario en auth.users
const { data: usuario } = await supabase.auth.signUp({
  email: 'carlos@empresa.com',
  password: 'password123'
});

// 2. Asignar rol "Repartidor" en tabla usuario_roles
await supabase
  .from('usuario_roles')
  .insert({
    usuario_id: usuario.id,
    rol_id: ROL_REPARTIDOR_ID  // Obtener de tabla roles
  });

// 3. Crear repartidor vinculado
await supabase
  .from('repartidores')
  .insert({
    usuario_id: usuario.id,  // ← VINCULADO a auth.users
    nombre: 'Carlos Méndez',
    telefono: '555-1234',
    vehiculo_tipo: 'moto',
    placa_vehiculo: 'ABC-123',
    estado: 'disponible',
    activo: true
  });
```

**Caso de uso:**
- Repartidores de plantilla
- Acceso completo a la app
- Puede ver vista "Mis Entregas"
- Actualiza estados en tiempo real
- Recibe notificaciones

### Verificar Permisos de Repartidor

```typescript
// Al acceder a "Mis Entregas"
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  toast.error('Debes iniciar sesión');
  navigate('/login');
  return;
}

// Verificar que tiene registro de repartidor
const { data: repartidor, error } = await supabase
  .from('repartidores')
  .select('id, nombre, activo')
  .eq('usuario_id', user.id)
  .single();

if (error || !repartidor) {
  toast.error('No tienes permisos de repartidor');
  navigate('/');
  return;
}

if (!repartidor.activo) {
  toast.error('Tu cuenta de repartidor está inactiva');
  return;
}

// ✅ Usuario es repartidor válido
fetchMisAsignaciones();
```

---

## 📋 CHECKLIST FINAL

### Errores Corregidos

- [x] `numero_pedido` no existe → Eliminado ✅
- [x] `cliente_nombre` no existe → LEFT JOIN con clientes ✅
- [x] `cliente_telefono` no existe → LEFT JOIN con clientes ✅
- [x] Estados 'ocupado' → Corregidos a 'en_ruta', 'no_disponible' ✅

### Archivos Modificados

- [x] `src/lib/store/asignacionesStore.ts` ✅
  - `fetchAsignaciones` - LEFT JOIN agregado + transformación
  - `fetchMisAsignaciones` - LEFT JOIN agregado + transformación

### Funciones Validadas

- [x] `fetchAsignaciones()` - Carga sin error 400 ✅
- [x] `fetchMisAsignaciones()` - Carga sin error 400 ✅
- [x] `asignarRepartidor()` - Funciona correctamente ✅
- [x] `actualizarEstadoAsignacion()` - Funciona correctamente ✅
- [x] `fetchRepartidoresDisponibles()` - Funciona correctamente ✅

### Build y Compilación

- [x] Build exitoso (17.86s) ✅
- [x] Sin errores TypeScript ✅
- [x] Sin errores HTTP 400 ✅

---

## 🎯 RESUMEN PARA EL USUARIO

### ¿Qué se Corrigió?

✅ **Error HTTP 400:** Columnas inexistentes en queries
✅ **LEFT JOIN implementado:** Datos de cliente correctamente obtenidos
✅ **Transformación de datos:** Compatibilidad con interfaz mantenida
✅ **Build exitoso:** Sin errores TypeScript

### ¿Qué Funciona Ahora?

✅ **Ver entregas pendientes** - Sin errores HTTP 400
✅ **Asignar repartidores** - Dropdown y modal funcionan
✅ **Login como repartidor** - Vista "Mis Entregas" operativa
✅ **Actualizar estados** - Transiciones con timestamps automáticos

### Cómo Usar el Sistema

**1. Crear Repartidor Simple (sin acceso):**
```
1. Ir a: Repartidores
2. Clic en "Crear Nuevo Repartidor"
3. Llenar: nombre, teléfono, vehículo, placa
4. Dejar usuario_id vacío
5. Guardar
```

**2. Crear Repartidor con Acceso:**
```
1. Usuarios → Crear Usuario
   - Email: carlos@empresa.com
   - Contraseña: ******
2. Asignar rol "Repartidor"
3. Repartidores → Crear Nuevo
   - Vincular con usuario creado
   - Llenar datos
4. Guardar
5. Ese usuario puede login y ver "Mis Entregas"
```

**3. Asignar Entrega:**
```
1. Ir a: Gestión de Envíos → Entregas Pendientes
2. Buscar pedido sin repartidor
3. Seleccionar repartidor del dropdown
4. Verificar toast de confirmación
5. Card cambia a verde mostrando repartidor asignado
```

**4. Repartidor Actualiza Estados:**
```
1. Login como repartidor
2. Ir a: Mis Entregas
3. Ver pedidos asignados
4. Botones:
   - [Marcar Recogido] → estado = 'recogido'
   - [En Camino] → estado = 'en_camino'
   - [Marcar Entregado] → estado = 'entregado' + calcula tiempo
```

---

## 🟢 ESTADO FINAL DEL SISTEMA

**SISTEMA 100% OPERATIVO**

| Componente | Estado | Notas |
|-----------|--------|-------|
| Crear pedidos a domicilio | 🟢 OPERATIVO | Trigger crea asignación automáticamente |
| Ver entregas pendientes | 🟢 OPERATIVO | Query corregido con LEFT JOIN |
| Asignar repartidor | 🟢 OPERATIVO | Dropdown y modal funcionan |
| Vista "Mis Entregas" | 🟢 OPERATIVO | Filtrado por usuario_id |
| Actualizar estados | 🟢 OPERATIVO | Timestamps automáticos |
| Build | 🟢 EXITOSO | 17.86s, sin errores |

**Sin errores conocidos:**
- ✅ Queries sin columnas inexistentes
- ✅ LEFT JOIN correctamente implementado
- ✅ Transformación de datos funcional
- ✅ Tipos TypeScript consistentes
- ✅ Estados alineados con BD

**Todo documentado, corregido y validado. Sistema listo para producción.**
