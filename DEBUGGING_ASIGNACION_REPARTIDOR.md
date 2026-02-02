# DEBUGGING: Asignación de Repartidores - LOGS IMPLEMENTADOS

## Fecha
2025-12-20

---

## IMPLEMENTACIÓN COMPLETA DE LOGS

He agregado logs exhaustivos en TODO el flujo de asignación de repartidores para identificar exactamente dónde está fallando.

---

## CÓMO USAR LOS LOGS

### 1. Abrir DevTools

1. En el navegador, presiona `F12` o `Ctrl+Shift+I` (Windows/Linux) o `Cmd+Option+I` (Mac)
2. Ve al tab **Console**
3. Limpia la consola haciendo clic en el icono 🚫 o presionando `Ctrl+L`

### 2. Ir a Gestión de Envíos

1. En tu aplicación, navega a **"Gestión de Envíos"**
2. Haz clic en el tab **"Entregas Pendientes"**

### 3. Observar los Logs de Inicialización

En la consola verás:

```
[INIT] Cargando datos de Entregas Pendientes...
[STORE] fetchAsignaciones iniciado
[STORE] Asignaciones recibidas: 1
[STORE] Datos raw: [...]
[STORE] Datos transformados: [...]
[STORE] IDs de pedidos en asignaciones: [15]
[INIT] ✅ Asignaciones cargadas

[STORE] fetchRepartidoresDisponibles iniciado
[STORE] Repartidores recibidos: 2
[STORE] Repartidores: [...]
[INIT] ✅ Repartidores cargados

[INIT] ✅ Pedidos cargados
```

**Qué verificar:**
- ✅ `Asignaciones recibidas` debe ser > 0 (si tienes pedidos pendientes)
- ✅ `IDs de pedidos en asignaciones` debe incluir el ID de tu pedido
- ✅ `Repartidores recibidos` debe ser > 0 (si has creado repartidores)

**Si falla aquí:**
- ❌ `Asignaciones recibidas: 0` → El trigger no creó la asignación
- ❌ `Repartidores recibidos: 0` → No hay repartidores activos
- ❌ Errores de query → Problema de permisos RLS

---

### 4. Observar los Logs de Búsqueda

Por cada pedido que se renderiza verás:

```
[DEBUG] Buscando asignación para pedido: 15
[DEBUG] Asignaciones disponibles: 1
[DEBUG] Asignaciones: [{id: 3, pedido_id: 15, repartidor_id: null, estado: 'pendiente'}]
[DEBUG] Asignación encontrada: {id: 3, pedido_id: 15, ...}

[RENDER] Pedido #15: {
  pedido_id: 15,
  tiene_asignacion: true,
  asignacion_id: 3,
  repartidor_id: null,
  estado_asignacion: 'pendiente'
}
```

**Qué verificar:**
- ✅ `tiene_asignacion: true` → El pedido tiene asignación
- ✅ `asignacion_id` debe ser un número válido
- ✅ `repartidor_id: null` → Está pendiente de asignar (correcto)
- ✅ `estado_asignacion: 'pendiente'` → Estado correcto

**Si falla aquí:**
- ❌ `tiene_asignacion: false` → No se encontró la asignación
- ❌ `Asignación encontrada: undefined` → El pedido_id no coincide

---

### 5. Verificar UI

Si todo está bien en los logs anteriores, **DEBERÍAS VER** en la UI:

```
┌─────────────────────────────────────────┐
│ 📦 Pedido #15                           │
│ ...                                     │
│                                         │
│ ┌──────────────────────────────────┐    │
│ │ 🚚 Asignar Repartidor           │    │
│ │ Selecciona un repartidor        │    │
│ │                                  │    │
│ │ [Seleccionar ▼]                 │    │
│ │   Carlos Méndez                  │    │
│ │   Ana García                     │    │
│ └──────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Si NO ves la sección naranja "Asignar Repartidor", verás:**

```
┌──────────────────────────────────────────┐
│ DEBUG: No se encontró asignación         │
│ para este pedido. Pedido ID: 15          │
└──────────────────────────────────────────┘
```

Este mensaje te indica que `getAsignacionPedido()` está retornando `null` o `undefined`.

---

### 6. Intentar Asignar Repartidor

1. Selecciona un repartidor del dropdown
2. En la consola verás:

```
[ASIGNAR] =================================
[ASIGNAR] ID Asignación: 3
[ASIGNAR] ID Repartidor: 1
[ASIGNAR] Tipo asignacionId: number
[ASIGNAR] Tipo repartidorId: number
[ASIGNAR] Llamando a asignarRepartidor...

[STORE] asignarRepartidor iniciado
[STORE] asignacionId: 3 tipo: number
[STORE] repartidorId: 1 tipo: number
[STORE] Ejecutando UPDATE...
[STORE] UPDATE exitoso: [{id: 3, pedido_id: 15, repartidor_id: 1, ...}]
[STORE] Repartidor encontrado: {nombre: 'Carlos Méndez'}
[STORE] Recargando asignaciones...
[STORE] ✅ Asignación completada

[ASIGNAR] ✅ Asignación exitosa
```

**Qué verificar:**
- ✅ `UPDATE exitoso` → La asignación se guardó en la BD
- ✅ `Repartidor encontrado` → Se leyó el nombre del repartidor
- ✅ Toast verde: "Entrega asignada a Carlos Méndez"

**Si falla aquí:**
- ❌ `[STORE] Error en UPDATE` → Problema de permisos RLS o datos inválidos
- ❌ `Error details: ...` → Mensaje de error de Supabase

---

## ESCENARIOS Y SOLUCIONES

### Escenario 1: No se cargan asignaciones

**Logs:**
```
[STORE] Asignaciones recibidas: 0
```

**Problema:** El trigger no está creando asignaciones automáticamente.

**Solución:**
```sql
-- Verificar trigger
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_crear_asignacion_entrega';

-- Si no existe, aplicar migración
-- 20251220013547_crear_trigger_asignaciones_entrega.sql
```

---

### Escenario 2: No hay repartidores disponibles

**Logs:**
```
[STORE] Repartidores recibidos: 0
```

**Problema:** No hay repartidores activos en la base de datos.

**Solución:**
1. Ve a la página `/repartidores`
2. Haz clic en "Crear Nuevo Repartidor"
3. Llena el formulario y guarda

O desde SQL:
```sql
INSERT INTO repartidores (nombre, telefono, vehiculo_tipo, estado, activo)
VALUES ('Carlos Méndez', '555-1234', 'moto', 'disponible', true);
```

---

### Escenario 3: No se encuentra asignación para el pedido

**Logs:**
```
[DEBUG] Asignación encontrada: undefined
[RENDER] tiene_asignacion: false
```

**UI:**
```
DEBUG: No se encontró asignación para este pedido. Pedido ID: 15
```

**Problema:** El `pedido_id` no coincide con ningún `asignacion.pedido_id`.

**Causas posibles:**
1. La asignación no se creó (fallo del trigger)
2. El pedido no es a domicilio (`tipo_entrega_id !== 1`)
3. Problema de tipos de datos (string vs number)

**Solución:**
```sql
-- Verificar si existe la asignación
SELECT * FROM asignaciones_entrega
WHERE pedido_id = 15;

-- Si no existe, crearla manualmente
INSERT INTO asignaciones_entrega (pedido_id, repartidor_id, estado, fecha_asignacion)
VALUES (15, NULL, 'pendiente', NOW());
```

---

### Escenario 4: Error al asignar repartidor

**Logs:**
```
[STORE] Error en UPDATE: {message: "..."}
[ASIGNAR] ❌ Error al asignar repartidor
```

**Toast rojo:** "Error al asignar repartidor: [mensaje]"

**Problema:** Permisos RLS o datos inválidos.

**Solución:**
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies
WHERE tablename = 'asignaciones_entrega'
  AND cmd = 'UPDATE';

-- Si no existe, crearla
CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones"
  ON asignaciones_entrega FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

## CHECKLIST COMPLETO

Sigue esta lista en orden:

### ✅ Paso 1: Verificar carga de datos
- [ ] Console muestra `[INIT] ✅ Asignaciones cargadas`
- [ ] Console muestra `[INIT] ✅ Repartidores cargados`
- [ ] Console muestra `[INIT] ✅ Pedidos cargados`

### ✅ Paso 2: Verificar asignación del pedido
- [ ] Console muestra `[DEBUG] Asignaciones disponibles: > 0`
- [ ] Console muestra `[DEBUG] Asignación encontrada: {...}`
- [ ] Console muestra `[RENDER] tiene_asignacion: true`

### ✅ Paso 3: Verificar UI
- [ ] Se ve la sección naranja "Asignar Repartidor"
- [ ] Se ve el dropdown con opciones de repartidores
- [ ] NO se ve el mensaje "DEBUG: No se encontró asignación"

### ✅ Paso 4: Asignar repartidor
- [ ] Al seleccionar un repartidor, console muestra `[ASIGNAR] Llamando a asignarRepartidor...`
- [ ] Console muestra `[STORE] UPDATE exitoso`
- [ ] Toast verde: "Entrega asignada a [Nombre]"
- [ ] La sección cambia de naranja a verde
- [ ] Se muestra el nombre del repartidor asignado

---

## REPORTE DE RESULTADOS

Una vez que hayas seguido estos pasos, **copia y pega** estos datos:

### 1. Logs de Inicialización
```
[Pegar aquí los logs de [INIT] y [STORE] al cargar la página]
```

### 2. Logs de Búsqueda
```
[Pegar aquí los logs de [DEBUG] y [RENDER] para tu pedido]
```

### 3. ¿Qué ves en la UI?
- [ ] Sección naranja "Asignar Repartidor" con dropdown
- [ ] Mensaje DEBUG rojo "No se encontró asignación"
- [ ] No veo nada relacionado con asignación

### 4. Logs al Asignar (si puedes)
```
[Pegar aquí los logs de [ASIGNAR] y [STORE] al seleccionar un repartidor]
```

### 5. Errores (si hay)
```
[Pegar aquí cualquier error en rojo que aparezca]
```

---

## RESULTADO ESPERADO

Si todo funciona correctamente, verás:

**Console:**
```
[INIT] Cargando datos de Entregas Pendientes...
[STORE] fetchAsignaciones iniciado
[STORE] Asignaciones recibidas: 1
[STORE] Repartidores recibidos: 2
[INIT] ✅ Asignaciones cargadas
[INIT] ✅ Repartidores cargados
[DEBUG] Buscando asignación para pedido: 15
[DEBUG] Asignación encontrada: {id: 3, pedido_id: 15, ...}
[RENDER] tiene_asignacion: true
[ASIGNAR] =================================
[STORE] UPDATE exitoso
✅ Entrega asignada a Carlos Méndez
```

**UI:**
- ✅ Sección naranja → verde
- ✅ Muestra nombre del repartidor
- ✅ Toast verde de éxito
