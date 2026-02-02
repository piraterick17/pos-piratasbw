# GUÍA DE DIAGNÓSTICO: Asignación de Repartidores

## Fecha
2025-12-20

---

## UBICACIÓN EN EL SISTEMA

### ¿Dónde DEBERÍA estar la función de asignación?

**Página:** `Gestión de Envíos` → Tab "Entregas Pendientes"
**Ruta:** `/gestion-envios`
**Archivo:** `src/pages/GestionEnvios.tsx`

**Componente:** `<EntregasPendientes />`
**Líneas:** 992-1013 (dropdown de asignación)

---

## WORKFLOW COMPLETO

```
1. Usuario crea pedido en página "Vender"
   ↓
2. Selecciona tipo_entrega_id = 1 (A domicilio)
   ↓
3. Backend ejecuta trigger automáticamente:
   - INSERT INTO asignaciones_entrega
   - repartidor_id = NULL
   - estado = 'pendiente'
   ↓
4. Staff va a "Gestión de Envíos" → "Entregas Pendientes"
   ↓
5. Ve lista de pedidos con dropdown "Asignar Repartidor"
   ↓
6. Selecciona repartidor del dropdown
   ↓
7. Frontend ejecuta: asignarRepartidor(asignacion.id, repartidor.id)
   ↓
8. Backend actualiza:
   - UPDATE asignaciones_entrega
   - SET repartidor_id = X, estado = 'asignado'
   ↓
9. ✅ Toast: "Entrega asignada a [Nombre Repartidor]"
```

---

## DIAGNÓSTICO PASO A PASO

### Paso 1: Verificar que el trigger esté activo

**SQL para ejecutar en Supabase Dashboard → SQL Editor:**

```sql
-- Ver si existe el trigger
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'pedidos'
  AND trigger_name = 'trigger_crear_asignacion_entrega';
```

**Resultado esperado:**
```
trigger_name                      | event_manipulation | action_statement
----------------------------------|--------------------|---------------------------------
trigger_crear_asignacion_entrega | INSERT             | EXECUTE FUNCTION crear_asignacion_entrega()
```

**Si NO aparece:**
❌ El trigger no existe → Aplicar migración `20251220013547_crear_trigger_asignaciones_entrega.sql`

---

### Paso 2: Verificar que la columna `repartidor_id` sea NULLABLE

**SQL:**

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'asignaciones_entrega'
  AND column_name = 'repartidor_id';
```

**Resultado esperado:**
```
column_name   | data_type | is_nullable | column_default
--------------|-----------|-------------|---------------
repartidor_id | bigint    | YES         | NULL
```

**Si is_nullable = 'NO':**
❌ La columna es NOT NULL → Aplicar migración `20251220062856_fix_repartidor_id_nullable.sql`

---

### Paso 3: Verificar que el estado 'pendiente' esté permitido

**SQL:**

```sql
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'asignaciones_entrega'
  AND con.conname LIKE '%estado%';
```

**Resultado esperado:**
```
constraint_name                     | constraint_definition
------------------------------------|--------------------------------------------------------
asignaciones_entrega_estado_check   | CHECK (estado IN ('pendiente', 'asignado', 'recogido', ...))
```

**Si NO incluye 'pendiente':**
❌ Falta el estado → Aplicar migración `20251220064049_fix_asignaciones_estado_pendiente.sql`

---

### Paso 4: Verificar que se estén creando asignaciones

**SQL:**

```sql
-- Ver las últimas 10 asignaciones creadas
SELECT
  ae.id,
  ae.pedido_id,
  ae.repartidor_id,
  ae.estado,
  ae.fecha_asignacion,
  p.tipo_entrega_id,
  p.cliente_id,
  p.total
FROM asignaciones_entrega ae
LEFT JOIN pedidos p ON ae.pedido_id = p.id
ORDER BY ae.fecha_asignacion DESC
LIMIT 10;
```

**Resultado esperado:**
```
id | pedido_id | repartidor_id | estado     | fecha_asignacion        | tipo_entrega_id
---|-----------|---------------|------------|-------------------------|----------------
45 | 123       | NULL          | pendiente  | 2025-12-20 10:30:00     | 1
44 | 122       | 5             | asignado   | 2025-12-20 10:15:00     | 1
```

**Si NO hay registros:**
❌ No se están creando asignaciones → Verificar:
1. ¿Los pedidos tienen `tipo_entrega_id = 1`?
2. ¿El trigger está activo?
3. ¿Hay errores en logs de Supabase?

---

### Paso 5: Verificar que el frontend cargue las asignaciones

**Abrir DevTools → Console:**

1. Ir a `/gestion-envios`
2. Abrir tab "Entregas Pendientes"
3. Ver en console:

**Código para probar en console del navegador:**

```javascript
// Verificar estado del store
const store = window.__ZUSTAND_STORES__?.asignacionesStore || {};
console.log('Asignaciones cargadas:', store.asignaciones);
console.log('Repartidores disponibles:', store.repartidores);
```

**O ver en React DevTools:**
- Componente: `<EntregasPendientes>`
- Hook: `useAsignacionesStore()`
- State: `asignaciones` y `repartidores`

**Resultado esperado:**
```javascript
asignaciones: [
  {
    id: 45,
    pedido_id: 123,
    repartidor_id: null,
    estado: 'pendiente',
    pedido: { id: 123, cliente_nombre: 'Juan', total: 250 },
    repartidor: null
  }
]

repartidores: [
  { id: 1, nombre: 'Carlos Méndez', activo: true, estado: 'disponible' },
  { id: 2, nombre: 'Ana García', activo: true, estado: 'en_ruta' }
]
```

**Si asignaciones está vacío []:**
❌ No se están cargando desde el backend → Verificar:
1. ¿Hay errores HTTP 400 en Network tab?
2. ¿Los queries de Supabase fallan?
3. ¿Los permisos RLS bloquean la lectura?

**Si repartidores está vacío []:**
❌ No hay repartidores disponibles → Crear repartidores en `/repartidores`

---

### Paso 6: Verificar que el dropdown aparezca en la UI

**En la página `/gestion-envios` → "Entregas Pendientes":**

1. ¿Ves una tarjeta por cada pedido a domicilio?
2. Dentro de la tarjeta, ¿hay una sección naranja que dice "Asignar Repartidor"?
3. ¿Hay un `<select>` dropdown con opciones?

**Código que controla la visibilidad (línea 965):**

```jsx
{asignacion && (
  <div className="p-3 rounded-lg border bg-orange-50 border-orange-200">
    <select
      value={asignacion.repartidor_id || ''}
      onChange={(e) => {
        if (e.target.value) {
          handleAsignarRapido(asignacion.id, parseInt(e.target.value));
        }
      }}
    >
      <option value="">Seleccionar</option>
      {repartidores.filter(r => r.activo).map((rep) => (
        <option key={rep.id} value={rep.id}>
          {rep.nombre}
        </option>
      ))}
    </select>
  </div>
)}
```

**Condición:** Solo se muestra si `asignacion` existe (no null, no undefined).

**Si NO aparece la sección naranja:**
❌ `asignacion` es null → La función `getAsignacionPedido(pedido.id)` no encuentra match.

**Causa probable:**
- `pedido.id` no coincide con `asignacion.pedido_id`
- Las asignaciones no se cargaron correctamente
- El pedido no tiene asignación (no es a domicilio o trigger falló)

---

### Paso 7: Verificar que la asignación funcione

**Abrir DevTools → Network tab:**

1. Ir a `/gestion-envios`
2. Seleccionar un repartidor del dropdown
3. Ver la petición `PATCH https://...supabase.co/rest/v1/asignaciones_entrega?id=eq.45`

**Request Body esperado:**
```json
{
  "repartidor_id": 5,
  "estado": "asignado",
  "fecha_asignacion": "2025-12-20T10:35:00.000Z"
}
```

**Response esperado:**
- Status: `200 OK` o `204 No Content`

**Si falla con 401 Unauthorized:**
❌ Problema de permisos RLS → Verificar políticas

**Si falla con 400 Bad Request:**
❌ Datos incorrectos → Verificar que `repartidor_id` sea válido

**Si falla con 404 Not Found:**
❌ `asignacion.id` no existe → Verificar que la asignación se haya creado

---

## SOLUCIONES COMUNES

### Problema 1: No se crean asignaciones automáticamente

**Síntoma:** No hay registros en `asignaciones_entrega` para pedidos recién creados.

**Solución:**

```sql
-- Verificar que el trigger existe y está activo
SELECT
  tgname AS trigger_name,
  tgenabled AS is_enabled
FROM pg_trigger
WHERE tgname = 'trigger_crear_asignacion_entrega';

-- Si is_enabled = 'D' (disabled), habilitarlo:
ALTER TABLE pedidos ENABLE TRIGGER trigger_crear_asignacion_entrega;
```

---

### Problema 2: Dropdown no aparece en UI

**Síntoma:** La tarjeta del pedido se ve, pero no aparece la sección naranja de asignación.

**Solución:**

```javascript
// En GestionEnvios.tsx, agregar logs en getAsignacionPedido (línea 536)
const getAsignacionPedido = (pedidoId: number) => {
  console.log('Buscando asignación para pedido:', pedidoId);
  console.log('Asignaciones disponibles:', asignaciones);
  const found = asignaciones.find(a => a.pedido_id === pedidoId);
  console.log('Asignación encontrada:', found);
  return found;
};
```

Si los logs muestran que `pedidoId` no coincide con ningún `asignacion.pedido_id`, entonces:
- Las asignaciones no se cargaron
- Los IDs no coinciden (problema de tipos: number vs string)

**Fix:**

```typescript
// Asegurar que pedido_id sea number
const found = asignaciones.find(a => Number(a.pedido_id) === Number(pedidoId));
```

---

### Problema 3: Asignación no se guarda (no pasa nada al seleccionar)

**Síntoma:** Selecciono repartidor del dropdown, pero no aparece toast ni se actualiza.

**Solución:**

```javascript
// En GestionEnvios.tsx, agregar logs en handleAsignarRapido (línea 563)
const handleAsignarRapido = async (asignacionId: number, repartidorId: number) => {
  console.log('=== ASIGNAR REPARTIDOR ===');
  console.log('Asignación ID:', asignacionId);
  console.log('Repartidor ID:', repartidorId);

  try {
    await asignarRepartidor(asignacionId, repartidorId);
    console.log('✅ Asignación exitosa');
  } catch (error) {
    console.error('❌ Error al asignar:', error);
  }
};
```

Verificar en console:
- ¿Se llama la función?
- ¿Los IDs son válidos?
- ¿Hay errores en el try-catch?

---

### Problema 4: Permisos RLS bloquean UPDATE

**Síntoma:** HTTP 403 Forbidden o HTTP 401 Unauthorized al asignar.

**Solución:**

```sql
-- Verificar políticas de UPDATE
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'asignaciones_entrega'
  AND cmd = 'UPDATE';
```

**Política esperada:**

```sql
CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones"
  ON asignaciones_entrega FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

Si NO existe, crearla:

```sql
ALTER TABLE asignaciones_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones"
  ON asignaciones_entrega FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

### Problema 5: No hay repartidores disponibles

**Síntoma:** Dropdown aparece pero está vacío (solo "Seleccionar").

**Solución:**

```sql
-- Verificar que existan repartidores activos
SELECT id, nombre, telefono, estado, activo
FROM repartidores
WHERE activo = true
ORDER BY nombre;
```

Si NO hay registros, crear repartidores:

```sql
-- Crear repartidor de prueba
INSERT INTO repartidores (nombre, telefono, vehiculo_tipo, placa_vehiculo, estado, activo)
VALUES ('Carlos Méndez', '555-1234', 'moto', 'ABC-123', 'disponible', true);
```

O desde la UI: `/repartidores` → Botón "Crear Nuevo Repartidor"

---

## SCRIPT DE VERIFICACIÓN COMPLETO

**Ejecutar en Supabase SQL Editor:**

```sql
-- ============================================
-- SCRIPT DE DIAGNÓSTICO COMPLETO
-- ============================================

-- 1. Verificar trigger
SELECT '1. TRIGGER:' as paso,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE event_object_table = 'pedidos'
        AND trigger_name = 'trigger_crear_asignacion_entrega'
    ) THEN '✅ Trigger existe'
    ELSE '❌ Trigger NO existe'
  END as resultado;

-- 2. Verificar columna repartidor_id
SELECT '2. COLUMNA:' as paso,
  CASE
    WHEN is_nullable = 'YES' THEN '✅ repartidor_id es NULLABLE'
    ELSE '❌ repartidor_id es NOT NULL (ERROR)'
  END as resultado
FROM information_schema.columns
WHERE table_name = 'asignaciones_entrega'
  AND column_name = 'repartidor_id';

-- 3. Verificar constraint estado
SELECT '3. CONSTRAINT:' as paso,
  CASE
    WHEN pg_get_constraintdef(con.oid) LIKE '%pendiente%'
      THEN '✅ Estado pendiente permitido'
    ELSE '❌ Estado pendiente NO permitido (ERROR)'
  END as resultado
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'asignaciones_entrega'
  AND con.conname LIKE '%estado%'
LIMIT 1;

-- 4. Verificar asignaciones recientes
SELECT '4. ASIGNACIONES:' as paso,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' asignaciones creadas'
    ELSE '❌ No hay asignaciones (revisar pedidos y trigger)'
  END as resultado
FROM asignaciones_entrega
WHERE fecha_asignacion >= CURRENT_DATE - INTERVAL '7 days';

-- 5. Verificar asignaciones pendientes
SELECT '5. PENDIENTES:' as paso,
  CASE
    WHEN COUNT(*) > 0 THEN '⚠️ ' || COUNT(*) || ' asignaciones SIN REPARTIDOR'
    ELSE '✅ No hay pendientes sin asignar'
  END as resultado
FROM asignaciones_entrega
WHERE repartidor_id IS NULL
  AND estado = 'pendiente';

-- 6. Verificar repartidores disponibles
SELECT '6. REPARTIDORES:' as paso,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' repartidores activos'
    ELSE '❌ No hay repartidores activos (crear en /repartidores)'
  END as resultado
FROM repartidores
WHERE activo = true;

-- 7. Verificar políticas RLS
SELECT '7. RLS POLICIES:' as paso,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ ' || COUNT(*) || ' políticas configuradas'
    ELSE '❌ Faltan políticas RLS (SELECT, INSERT, UPDATE)'
  END as resultado
FROM pg_policies
WHERE tablename = 'asignaciones_entrega';

-- 8. Ver últimas asignaciones con detalles
SELECT
  '8. ÚLTIMAS ASIGNACIONES:' as paso,
  ae.id,
  ae.pedido_id,
  COALESCE(ae.repartidor_id::text, 'SIN ASIGNAR') as repartidor_id,
  ae.estado,
  COALESCE(r.nombre, '---') as repartidor_nombre,
  p.total,
  p.tipo_entrega_id,
  ae.fecha_asignacion
FROM asignaciones_entrega ae
LEFT JOIN repartidores r ON ae.repartidor_id = r.id
LEFT JOIN pedidos p ON ae.pedido_id = p.id
ORDER BY ae.fecha_asignacion DESC
LIMIT 5;
```

**Resultado esperado:**

```
paso              | resultado
------------------|-----------------------------------------
1. TRIGGER        | ✅ Trigger existe
2. COLUMNA        | ✅ repartidor_id es NULLABLE
3. CONSTRAINT     | ✅ Estado pendiente permitido
4. ASIGNACIONES   | ✅ 15 asignaciones creadas
5. PENDIENTES     | ⚠️ 3 asignaciones SIN REPARTIDOR
6. REPARTIDORES   | ✅ 4 repartidores activos
7. RLS POLICIES   | ✅ 3 políticas configuradas
```

---

## SIGUIENTE PASO

**Ejecuta el script de diagnóstico** y comparte el resultado para identificar exactamente dónde está el problema.

Si todos los checks pasan (✅) pero TODAVÍA no puedes asignar, entonces el problema está en el frontend (React/TypeScript), no en el backend (Supabase).
