# Guía Completa de Logs - Sistema de Edición de Pedidos

**Actualizado**: 2026-01-02
**Versión**: 1.0

---

## Resumen Ejecutivo

Este documento explica cómo leer, interpretar y usar los logs detallados del sistema de edición de pedidos para identificar exactamente dónde se queda parado el proceso.

### Cómo Abrir la Consola

1. Presiona **F12** en tu navegador
2. Vete a la pestaña **Console**
3. Si ves logs con colores y líneas de separación (`=====`), está funcionando correctamente

---

## Flujo Completo de Logs

El proceso de edición de un pedido genera logs en este orden:

```
1. [EDITAR-XX] - Usuario hace click en botón editar (Pedidos.tsx)
   ↓
2. [CARGAR-PEDIDO-EDITAR-XX] - Carga de pedido en cartStore
   ↓
3. [VENDER-INIT] - Inicialización de página Vender
   ↓
4. [UPDATE-PEDIDO-XX] - Actualización en base de datos (solo si guarda)
```

---

## Desglose Detallado por Fase

### FASE 1: Click en Botón Editar

**Archivo**: `src/pages/Pedidos.tsx`
**Prefijo de Log**: `[EDITAR-XX]` (donde XX es el ID del pedido)

#### Timeline Esperado:

```
======================================================================
[EDITAR-42] INICIANDO PROCESO DE EDICIÓN DE PEDIDO
[EDITAR-42] Timestamp: 2026-01-02T10:30:45.123Z
[EDITAR-42] Pedido ID: 42, Estado: Pendiente
======================================================================

[EDITAR-42] [1] Obteniendo stores (getState)...
[EDITAR-42] [1] ✓ Stores obtenidos exitosamente

[EDITAR-42] [2] Mostrando toast de carga...
[EDITAR-42] [2] ✓ Toast visible

[EDITAR-42] [3] Llamando fetchPedidoDetalles(42)...
[EDITAR-42] [3] ✓ fetchPedidoDetalles completado en 245.32ms

[EDITAR-42] [4] Leyendo pedidoActual del store...
[EDITAR-42] [4] Pedido obtenido: {
  id: 42,
  cliente: "Juan Pérez",
  total: 150000,
  detallesCount: 3,
  estado: "Pendiente"
}
[EDITAR-42] [4] ✓ Pedido validado correctamente

[EDITAR-42] [5] Llamando cargarPedidoParaEditar()...
[EDITAR-42] [5] ✓ cargarPedidoParaEditar completado en 5.23ms

[EDITAR-42] [6] Validando estado del carrito post-carga...
[EDITAR-42] [6] Estado carrito: {
  carritoItems: 3,
  editingOrderId: 42,
  cliente: "Juan Pérez",
  tipoEntregaId: 2
}
[EDITAR-42] [6] ✓ Carrito validado

[EDITAR-42] [7] Validando sessionStorage...
[EDITAR-42] [7] sessionStorage['editing-order-id']: 42
[EDITAR-42] [7] ✓ SessionStorage correcto

[EDITAR-42] [8] Esperando sincronización de localStorage (150ms)...
[EDITAR-42] [8] ✓ Espera completada en 150.45ms

[EDITAR-42] [9] Validando localStorage post-sincronización...
[EDITAR-42] [9] localStorage['cart-state']: {
  editingOrderId: 42,
  carritoLength: 3,
  tieneClienteSeleccionado: true
}
[EDITAR-42] [9] ✓ localStorage validado

[EDITAR-42] [10] Navegando a #vender...
[EDITAR-42] [10] Asignando window.location.hash = 'vender'
[EDITAR-42] [10] ✓ Hash asignado (recarga iniciada)

[EDITAR-42] ✅ PROCESO COMPLETADO EN 407.23ms
======================================================================
```

#### Qué Buscar:

| Paso | Éxito | Error |
|------|-------|-------|
| [1] Stores | ✓ Stores obtenidos | No debería fallar |
| [3] Fetch | ✓ completado en XXms | ❌ Error en BD |
| [4] Pedido | Todos los campos presentes | ❌ pedidoCompleto es null |
| [5] Cargar | ✓ completado en Xms | ❌ Error en set() |
| [7] Session | sessionStorage contiene el ID | ⚠️ SESSION STORAGE VACÍO |
| [8] Wait | ~150ms | Menor = posible race condition |
| [9] LocalStorage | editingOrderId presente | ⚠️ LOCALSTORAGE VACÍO |
| [10] Nav | Hash asignado | Debería haber recarga de página |

---

### FASE 2: Carga de Pedido en CartStore

**Archivo**: `src/lib/store/cartStore.ts`
**Prefijo de Log**: `[CARGAR-PEDIDO-EDITAR-XX]`

#### Timeline Esperado:

```
[CARGAR-PEDIDO-EDITAR-42] INICIANDO CARGA DE PEDIDO PARA EDICIÓN
[CARGAR-PEDIDO-EDITAR-42] Timestamp: 2026-01-02T10:30:45.500Z

[CARGAR-PEDIDO-EDITAR-42] [A] Convertiendo detalles del pedido...
[CARGAR-PEDIDO-EDITAR-42]   - Total de detalles a convertir: 3

[CARGAR-PEDIDO-EDITAR-42]   - Detalle [0]: {
  producto_id: 15,
  nombre: "Bandeja Paisa",
  cantidad: 1,
  precio: 35000,
  subtotal: 35000,
  salsasCount: 2
}
[CARGAR-PEDIDO-EDITAR-42]   - Detalle [1]: {
  producto_id: 20,
  nombre: "Ajiaco",
  cantidad: 2,
  precio: 25000,
  subtotal: 50000,
  salsasCount: 0
}
[CARGAR-PEDIDO-EDITAR-42]   - Detalle [2]: {
  producto_id: 8,
  nombre: "Arepas",
  cantidad: 1,
  precio: 5000,
  subtotal: 5000,
  salsasCount: 1
}

[CARGAR-PEDIDO-EDITAR-42] [A] ✓ Conversión completada - 3 items en carrito

[CARGAR-PEDIDO-EDITAR-42] [B] Preparando datos del estado del carrito...
[CARGAR-PEDIDO-EDITAR-42] [B] Datos a cargar en estado: {
  carritoItems: 3,
  cliente: "Juan Pérez",
  tipoEntregaId: 2,
  zonaEntregaId: 5,
  direccionEnvio: "Cra 50 #27-80",
  costoEnvio: 5000,
  descuento: 0,
  editingOrderId: 42
}
[CARGAR-PEDIDO-EDITAR-42] [B] Llamando set() con nuevo estado...
[CARGAR-PEDIDO-EDITAR-42] [B] ✓ Estado actualizado en Zustand

[CARGAR-PEDIDO-EDITAR-42] [C] Guardando en sessionStorage...
[CARGAR-PEDIDO-EDITAR-42] [C] ✓ sessionStorage['editing-order-id'] = '42'

[CARGAR-PEDIDO-EDITAR-42] [D] Mostrando toast...
[CARGAR-PEDIDO-EDITAR-42] [D] ✓ Toast mostrado

[CARGAR-PEDIDO-EDITAR-42] ✅ CARGA DE PEDIDO COMPLETADA
```

#### Qué Buscar:

| Paso | Éxito | Error |
|------|-------|-------|
| [A] Conversión | Todos los detalles listados | ❌ Detalles vacíos o null |
| [A] Items | Cantidad correcta | ❌ Mismatch en cantidad |
| [B] Datos | Todos los campos presentes | ❌ Cliente/tipo entrega vacío |
| [B] Set | ✓ Estado actualizado | ❌ Error en Zustand |
| [C] Session | ID correcto guardado | ⚠️ Error guardando storage |
| [D] Toast | Mostrado exitosamente | No es crítico |

---

### FASE 3: Inicialización de Página Vender

**Archivo**: `src/pages/Vender.tsx`
**Prefijo de Log**: `[VENDER-INIT]`

**NOTA**: Este log aparece DESPUÉS de la recarga de página (cuando navegas a #vender)

#### Timeline Esperado:

```
======================================================================
[VENDER-INIT] INICIALIZANDO PÁGINA VENDER
[VENDER-INIT] Timestamp: 2026-01-02T10:30:46.000Z
======================================================================

[VENDER-INIT] [1] Cargando datos maestros (productos, categorías, clientes, etc)...
[VENDER-INIT] [1] ✓ Datos maestros cargados en 523.45ms

[VENDER-INIT] [2] Verificando sessionStorage para editingOrderId...
[VENDER-INIT] [2] sessionStorage['editing-order-id']: 42

[VENDER-INIT] [3] SessionStorage tiene valor - intentando restaurar estado...
[VENDER-INIT] [3] Estado actual del carrito: {
  carritoItems: 3,
  editingOrderId: 42,
  clienteSeleccionado: "Juan Pérez"
}
[VENDER-INIT] [3] ✓ editingOrderId ya estaba en Zustand: 42

[VENDER-INIT] [4] Verificando si debe validar precios...
[VENDER-INIT] [4] Validación: {
  carritoItems: true,
  editingOrderId: 42,
  sessionStorageValue: "42",
  deberiaMostrarValidacion: false
}
[VENDER-INIT] [4] → SALTANDO VALIDACIÓN (es modo edición)
[VENDER-INIT] [4] ✓ Modo edición detectado - validación deshabilitada

[VENDER-INIT] ✅ INICIALIZACIÓN COMPLETADA EN 528.90ms
======================================================================
```

#### Qué Buscar:

| Paso | Éxito | Error |
|------|-------|-------|
| [1] Datos | ~500ms típico | ❌ >2000ms = problema de BD |
| [2] Session | ID presente | ⚠️ null o vacío = se perdió estado |
| [3] Carrito | Items > 0 | ❌ Carrito vacío = no se restauró |
| [3] EditingId | Mismo que [2] | ⚠️ Mismatch |
| [4] Validación | `deberiaMostrarValidacion: false` | ❌ true = validará productos |
| [4] Resultado | `SALTANDO VALIDACIÓN` | ❌ `VALIDANDO PRECIOS` = modo incorrecto |

---

### FASE 4: Actualización en Base de Datos

**Archivo**: `src/lib/store/pedidosStore.ts`
**Prefijo de Log**: `[UPDATE-PEDIDO-XX]`

**NOTA**: Este log aparece SOLO cuando haces click en "Guardar Orden"

#### Timeline Esperado:

```
======================================================================
[UPDATE-PEDIDO-42] INICIANDO ACTUALIZACIÓN DE PEDIDO
[UPDATE-PEDIDO-42] Timestamp: 2026-01-02T10:30:50.123Z
[UPDATE-PEDIDO-42] Detalles a procesar: 3
[UPDATE-PEDIDO-42] Datos del pedido: {
  cliente_id: "user-123",
  tipo_entrega_id: 2,
  total: 95000,
  subtotal: 90000,
  descuentos: 0,
  ...
}
======================================================================

[UPDATE-PEDIDO-42] [1] Obteniendo detalles actuales del pedido...
[UPDATE-PEDIDO-42] [1] ✓ Detalles obtenidos en 45.23ms - Count: 3
[UPDATE-PEDIDO-42] [1]   IDs a soft delete: [123, 124, 125]

[UPDATE-PEDIDO-42] [2] Ejecutando soft delete de 3 detalles antiguos...
[UPDATE-PEDIDO-42] [2] ✓ Soft delete completado en 32.15ms

[UPDATE-PEDIDO-42] [3] Preparando 3 nuevos detalles para insertar...
[UPDATE-PEDIDO-42] [3]   Detalle [0]: {
  producto_id: 15,
  cantidad: 1,
  precio_unitario: 35000,
  subtotal: 35000,
  salsasCount: 2
}
[UPDATE-PEDIDO-42] [3]   Detalle [1]: {
  producto_id: 20,
  cantidad: 2,
  precio_unitario: 25000,
  subtotal: 50000,
  salsasCount: 0
}
[UPDATE-PEDIDO-42] [3]   Detalle [2]: {
  producto_id: 8,
  cantidad: 1,
  precio_unitario: 5000,
  subtotal: 5000,
  salsasCount: 1
}

[UPDATE-PEDIDO-42] [3] Ejecutando insert de 3 detalles...
[UPDATE-PEDIDO-42] [3] ✓ Insert completado en 38.42ms

[UPDATE-PEDIDO-42] [4] Recalculando totales...
[UPDATE-PEDIDO-42] [4] Cálculo: {
  subtotalAnterior: 90000,
  nuevoSubtotal: 90000,
  descuentos: 0,
  impuestos: 0,
  costoEnvio: 5000,
  totalAnterior: 95000,
  nuevoTotal: 95000
}
[UPDATE-PEDIDO-42] [4] ✓ Totales recalculados

[UPDATE-PEDIDO-42] [5] Actualizando registro principal del pedido...
[UPDATE-PEDIDO-42] [5] ✓ Pedido actualizado en 28.94ms

[UPDATE-PEDIDO-42] [6] Generando/actualizando ticket...
[UPDATE-PEDIDO-42] [6] ✓ Ticket generado en 15.23ms

[UPDATE-PEDIDO-42] [7] Refrescando datos desde BD...
[UPDATE-PEDIDO-42] [7] ✓ Datos refrescados en 52.45ms
[UPDATE-PEDIDO-42] [7]   Pedido recuperado: {
  id: 42,
  total: 95000,
  detallesCount: 3,
  estado: "Pendiente"
}

[UPDATE-PEDIDO-42] ✅ ACTUALIZACIÓN COMPLETADA EN 210.42ms
======================================================================
```

#### Qué Buscar:

| Paso | Éxito | Error |
|------|-------|-------|
| [1] Fetch | IDs listados | ❌ Error de BD |
| [2] Soft Delete | ✓ completado | ❌ Error en update |
| [3] Mapeo | Todos listados | ❌ Items vacíos |
| [3] Insert | ✓ completado | ❌ Errores de constraint |
| [4] Cálculo | Números correctos | ⚠️ Totales errados |
| [5] Update | ✓ completado | ❌ Error en pedidos table |
| [6] Ticket | ✓ generado | ⚠️ Error no crítico |
| [7] Refresh | Count correcto | ❌ detallesCount vacío |

---

## Escenarios Comunes y Qué Significan

### ✅ ÉXITO: El pedido se edita correctamente

**Esperas ver**:
```
[EDITAR-42] ✅ PROCESO COMPLETADO EN 407.23ms
[CARGAR-PEDIDO-EDITAR-42] ✅ CARGA DE PEDIDO COMPLETADA
[VENDER-INIT] ✅ INICIALIZACIÓN COMPLETADA EN 528.90ms
[UPDATE-PEDIDO-42] ✅ ACTUALIZACIÓN COMPLETADA EN 210.42ms
```

**Acciones**: Nada, el sistema funciona correctamente.

---

### ❌ ERROR: Se queda en Pedidos, no redirige a Vender

**Posibles causas**:

1. **Fase 1 no completa [EDITAR-42]**
   ```
   [EDITAR-42] [4] ❌ ERROR: pedidoCompleto es null
   ```
   → Problema al cargar pedido desde BD

2. **Fase 1 falla en paso [7]**
   ```
   [EDITAR-42] [7] ⚠️ WARNING: sessionStorage != pedidoId
   ```
   → sessionStorage no se guardó, revisa permiso de storage

3. **Fase 1 no llega a paso [10]**
   ```
   [EDITAR-42] [9] ⚠️ localStorage['cart-state'] NO EXISTE
   ```
   → Zustand no está persistiendo a localStorage

**Solución**:
- Revisa la consola desde el paso [1] en adelante
- Busca logs rojos (error) o naranjas (warning)
- Si es un error de BD, revisa RLS policies

---

### ⚠️ AVISO: Navega a Vender pero no restaura el carrito

**Indicador**:
```
[VENDER-INIT] [3] ⚠️ Carrito vacío o sin cliente - no restaurando
[VENDER-INIT] [4] → No hay items en carrito - saltando validación
```

**Causa**: sessionStorage se perdió entre la redirección

**Problema probable**:
- El delay de 150ms no fue suficiente (race condition)
- localStorage se limpió accidentalmente
- El navegador rechazó guardar en storage

**Solución**:
1. Abre DevTools → Application → Storage
2. Busca `cart-state` en localStorage
3. Busca `editing-order-id` en sessionStorage
4. Si ambos están vacíos → problema de persistencia

---

### ❌ ERROR: Actualiza pero no persiste cambios

**Indicador**:
```
[UPDATE-PEDIDO-42] ❌ Error en insert
[UPDATE-PEDIDO-42] Error: duplicate key value violates unique constraint
```

**Causa**: Conflicto de clave primaria

**Problema probable**:
- Los detalles no se soft-deletaron correctamente
- Hay registros duplicados sin `deleted_at`

**Solución**:
1. Revisa BD: `SELECT * FROM detalles_pedido WHERE pedido_id=42 AND deleted_at IS NULL`
2. Debería estar vacío después del soft delete
3. Si no, hay un bug en la lógica de soft delete

---

### 🐢 LENTO: La actualización tarda más de 5 segundos

**Indicador**:
```
[UPDATE-PEDIDO-42] [1] ✓ Detalles obtenidos en 2345.23ms  ← MÁS DE 2 SEGUNDOS
```

**Causa**: Problema de rendimiento en BD

**Qué revisar**:
- ¿Tiene índices la tabla `detalles_pedido`?
- ¿Hay RLS policies muy complejas?
- ¿La conexión a Supabase es lenta?

---

## Cómo Usar Estos Logs para Debugging

### Paso 1: Reproducir el Problema

1. Abre la consola (F12)
2. Limpia los logs actuales: `clear()`
3. Reproduz el problema exacto
4. Toma screenshot o copia los logs

### Paso 2: Rastrear la Ejecución

1. Busca el prefijo `[EDITAR-XX]`
2. Sigue el flujo paso a paso: [1] → [2] → ... → [10]
3. Identifica el primer paso con ❌ o ⚠️

### Paso 3: Interpretar el Error

Usa la tabla de "Escenarios Comunes" arriba para entender qué significa el error.

### Paso 4: Solucionar

Sigue las recomendaciones específicas para tu tipo de error.

---

## Filtrar Logs en DevTools

**Para ver solo los logs de edición**:
```javascript
// En la consola, ejecuta:
console.log = (message) => {
  if (message && (message.includes('[EDITAR-') || message.includes('[UPDATE-'))) {
    console.log(message);
  }
};
```

**Para ver solo errores**:
```javascript
// En DevTools, click en "Error" (lado derecho de la consola)
```

**Para ver logs con timestamps**:
```javascript
// Haz click en ⚙️ (settings) → "Show Timestamps"
```

---

## Información a Incluir si Reportas Problema

Si todavía no puedes resolver el problema, incluye:

1. **Screenshot de la consola** completo
2. **Tu Pedido ID** (el XX en [EDITAR-XX])
3. **Qué acción hiciste** (ej: "Cambié cantidad de producto")
4. **Dónde se queda** (ej: "En Pedidos, no redirige")
5. **Logs desde [1] al primer error**

Ejemplo perfecto:
```
Problema: No redirige a Vender

Logs:
[EDITAR-42] [1] ✓ Stores obtenidos exitosamente
[EDITAR-42] [3] ✓ fetchPedidoDetalles completado en 245.32ms
[EDITAR-42] [4] ❌ ERROR: pedidoCompleto es null
[EDITAR-42] pedidosStore.pedidoActual: undefined
```

---

## Resumen de Prefijos

| Prefijo | Archivo | Cuándo | Duración Típica |
|---------|---------|--------|-----------------|
| `[EDITAR-XX]` | Pedidos.tsx | Click en botón | 400-800ms |
| `[CARGAR-PEDIDO-EDITAR-XX]` | cartStore.ts | Dentro del EDITAR | <10ms |
| `[VENDER-INIT]` | Vender.tsx | Después de recarga | 500-1500ms |
| `[UPDATE-PEDIDO-XX]` | pedidosStore.ts | Click en Guardar | 200-500ms |

---

## Checklist de Debugging

- [ ] Abrí la consola (F12)
- [ ] Reproduje el problema
- [ ] Busqué los logs relevantes
- [ ] Identifiqué el primer error/warning
- [ ] Seguí el flujo paso a paso
- [ ] Comparé con los tiempos típicos
- [ ] Revisé localStorage/sessionStorage en DevTools
- [ ] Comprobé RLS policies en Supabase

---

**¡Los logs son tu mejor amigo! Úsalos para identificar exactamente dónde se queda el proceso.**

Última actualización: 2026-01-02
