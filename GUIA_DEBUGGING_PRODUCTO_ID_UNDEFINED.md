# Guía de Debugging: Error producto_id undefined

**Fecha:** 2026-01-23
**Estado:** Debugging Mode - Logs agregados para identificar origen del problema

---

## Situación Actual

El error persiste:
```
GET .../productos?id=in.(undefined) 400
invalid input syntax for type bigint: "undefined"
```

Esto significa que **algún item del carrito tiene `producto_id: undefined`**.

He agregado **logs exhaustivos** para identificar EXACTAMENTE dónde y cómo se está generando este problema.

---

## Cambios Aplicados

### 1. Logs en Vender.tsx (Origen del Problema)

Se agregaron logs detallados ANTES de construir los detalles:

```typescript
// Línea 874-887
console.log('🔍 [VENDER] Carrito completo antes de procesar:', carrito);
console.log('🔍 [VENDER] Total items en carrito:', carrito.length);
carrito.forEach((item, idx) => {
  console.log(`🔍 [VENDER] Item[${idx}]:`, {
    id: item.id,
    producto_id: item.producto_id,
    nombre: item.nombre,
    producto_id_type: typeof item.producto_id,
    producto_id_is_number: typeof item.producto_id === 'number',
    producto_id_is_valid: !!(item.producto_id && typeof item.producto_id === 'number')
  });
});
```

**Qué buscar:**
- ¿Algún item tiene `producto_id: undefined`?
- ¿Algún item tiene `producto_id` como string en lugar de número?
- ¿Qué item específico causa el problema?

### 2. Validación y Filtrado en Vender.tsx

Se agregó filtrado explícito:

```typescript
// Línea 889-919
const detalles = carrito
  .filter(item => {
    const isValid = item.producto_id && typeof item.producto_id === 'number';
    if (!isValid) {
      console.error('❌ [VENDER] Item del carrito INVÁLIDO:', {
        item,
        producto_id: item.producto_id,
        type: typeof item.producto_id
      });
      toast.error(`Error: Item "${item.nombre}" no tiene producto_id válido`);
      return false;  // <- ESTE ITEM SE DESCARTA
    }
    console.log(`✅ [VENDER] Item válido: ${item.nombre} (producto_id: ${item.producto_id})`);
    return true;
  })
  .map(item => ({ ... }));

console.log('🔍 [VENDER] Detalles procesados:', detalles);
console.log('🔍 [VENDER] IDs de productos:', detalles.map(d => d.producto_id));
```

**Resultado Esperado:**
- Si hay un item inválido, verás un toast de error
- El item se filtra automáticamente
- Solo los items válidos se envían a la BD

### 3. Logs en updatePedidoCompleto (Defensa)

Se agregaron logs en pedidosStore.ts:

```typescript
// Línea 931-974
console.log(`[UPDATE-PEDIDO-X] [2] 🔍 Total detalles recibidos:`, nuevosDetalles.length);
console.log(`[UPDATE-PEDIDO-X] [2] 🔍 Detalles completos:`, JSON.stringify(nuevosDetalles, null, 2));

nuevosDetalles.forEach((d: any, idx: number) => {
  console.log(`[UPDATE-PEDIDO-X] [2] 🔍 Detalle[${idx}]:`, {
    producto_id: d.producto_id,
    producto_id_type: typeof d.producto_id,
    producto_id_is_number: typeof d.producto_id === 'number',
    cantidad: d.cantidad,
    nombre: d.nombre
  });
});

// Filtrado adicional por seguridad
const detallesValidos = nuevosDetalles.filter((d, idx) => {
  const isValid = d.producto_id && typeof d.producto_id === 'number';
  if (!isValid) {
    console.error(`[UPDATE-PEDIDO-X] [2] ❌ Detalle[${idx}] INVÁLIDO`);
    return false;
  }
  return true;
});

console.log(`[UPDATE-PEDIDO-X] [2] 🎯 IDs de productos válidos que se usarán en la query:`, idsProductos);
```

**Resultado Esperado:**
- Si llegó algún detalle inválido, se filtra aquí
- Error claro si NO hay detalles válidos
- Solo IDs válidos se usan en la query de productos

---

## Qué Hacer Ahora

### Paso 1: Reproduce el Error

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Limpia la consola (botón de🚫 o Ctrl+L)
4. Intenta guardar/editar un pedido que cause el error

### Paso 2: Revisa los Logs

Busca los logs con el emoji 🔍 en la consola:

#### A. Logs de Vender.tsx (ORIGEN)

Busca estos logs:
```
🔍 [VENDER] Carrito completo antes de procesar: [...]
🔍 [VENDER] Total items en carrito: 3
🔍 [VENDER] Item[0]: {
  id: "123-abc",
  producto_id: 456,           <- DEBE SER UN NÚMERO
  nombre: "Taco",
  producto_id_type: "number", <- DEBE SER "number"
  producto_id_is_valid: true  <- DEBE SER true
}
🔍 [VENDER] Item[1]: {...}
```

**Busca un item donde:**
- `producto_id: undefined`
- `producto_id_type: "undefined"`
- `producto_id_is_valid: false`

**Ejemplo de item problemático:**
```javascript
🔍 [VENDER] Item[2]: {
  id: "789-xyz",
  producto_id: undefined,      // <- AQUÍ ESTÁ EL PROBLEMA
  nombre: "Burrito",
  producto_id_type: "undefined",
  producto_id_is_valid: false
}
```

#### B. Logs de Filtrado

Debe aparecer:
```
✅ [VENDER] Item válido: Taco (producto_id: 456)
❌ [VENDER] Item del carrito INVÁLIDO: {...}  <- SI HAY ITEMS INVÁLIDOS
✅ [VENDER] Item válido: Quesadilla (producto_id: 789)
```

Y también deberías ver un **toast de error** en la UI si hay items inválidos.

#### C. Logs de updatePedidoCompleto

Busca:
```
[UPDATE-PEDIDO-462] [2] 🔍 Total detalles recibidos: 3
[UPDATE-PEDIDO-462] [2] 🔍 Detalle[0]: {
  producto_id: 456,
  producto_id_type: "number",
  producto_id_is_number: true
}
```

**Si llegas hasta aquí con un detalle inválido, significa que el filtro en Vender.tsx falló.**

#### D. Logs Finales

Debería aparecer:
```
[UPDATE-PEDIDO-462] [2] 🎯 IDs de productos válidos que se usarán en la query: [456, 789, 123]
[UPDATE-PEDIDO-462] [2] 🎯 IDs tipos: ["number", "number", "number"]
```

**Si ves "undefined" o "" en algún ID aquí, la validación falló.**

### Paso 3: Identifica el Patrón

Con los logs, responde estas preguntas:

1. **¿Cuándo ocurre el error?**
   - [ ] Al crear un pedido nuevo
   - [ ] Al editar un pedido existente
   - [ ] En ambos casos

2. **¿Qué producto causa el problema?**
   - Nombre del producto: _______________
   - ID del item en carrito: _______________
   - ¿Es un producto con salsas? _______________

3. **¿El filtro funciona?**
   - [ ] Sí, aparece el toast de error y el item se filtra
   - [ ] No, el item inválido pasa el filtro
   - [ ] El filtro no se ejecuta

4. **¿El item inválido está en el carrito original?**
   - [ ] Sí, ya estaba en el carrito con producto_id undefined
   - [ ] No, se vuelve undefined durante el procesamiento

---

## Escenarios Posibles

### Escenario A: Item con producto_id undefined en el Carrito

**Logs esperados:**
```
🔍 [VENDER] Item[1]: { producto_id: undefined, ... }
❌ [VENDER] Item del carrito INVÁLIDO
```

**Causa:** El item se agregó mal al carrito (problema en `addToCarrito` o `cargarPedidoParaEditar`)

**Solución:** Revisar cómo se crean los items del carrito

### Escenario B: producto_id se vuelve undefined durante el map

**Logs esperados:**
```
🔍 [VENDER] Item[1]: { producto_id: 456, ... }  <- VÁLIDO
✅ [VENDER] Item válido: Taco (producto_id: 456)
🔍 [VENDER] Detalles procesados: [{producto_id: undefined, ...}]  <- SE VOLVIÓ undefined
```

**Causa:** Bug en el `.map()` que construye los detalles

**Solución:** Revisar el mapeo de items a detalles

### Escenario C: Filtros no se ejecutan

**Logs esperados:**
```
(No aparecen los logs 🔍)
[UPDATE-PEDIDO-462] [2] 🔍 Detalle[0]: { producto_id: undefined, ... }
```

**Causa:** Los cambios no se aplicaron (caché del navegador)

**Solución:**
- Hacer hard reload (Ctrl+Shift+R)
- Limpiar caché del navegador
- Verificar que el build se ejecutó correctamente

### Escenario D: Producto_id es string en lugar de number

**Logs esperados:**
```
🔍 [VENDER] Item[1]: {
  producto_id: "456",           <- STRING en lugar de NUMBER
  producto_id_type: "string",
  producto_id_is_number: false
}
❌ [VENDER] Item del carrito INVÁLIDO
```

**Causa:** El ID se está convirtiendo a string en algún punto

**Solución:** Asegurar que `producto.id` siempre sea número al agregar al carrito

---

## Próximos Pasos

Una vez que tengas los logs:

1. **Copia TODOS los logs** desde 🔍 hasta el error
2. **Pégalos en un mensaje**
3. **Indica qué escenario describe mejor el problema**

Con esa información podré:
- Identificar EXACTAMENTE dónde se origina el `undefined`
- Aplicar la solución correcta en el lugar correcto
- Evitar seguir aplicando soluciones que no atacan el origen

---

## Comando Rápido para Logs

Si quieres guardar los logs en un archivo, ejecuta esto en la consola del navegador:

```javascript
// Guarda los últimos 200 logs en una variable
const logs = console.history?.slice(-200) || "Usar Ctrl+A en la consola para copiar todo";
copy(logs); // Copia al portapapeles
```

Luego pégalos en un archivo de texto y compártelos.

---

## Notas Importantes

1. **Los logs con 🔍 son los más importantes** - Muestran el estado REAL del carrito

2. **Si NO ves los logs 🔍**, significa que los cambios no se aplicaron - Haz hard reload (Ctrl+Shift+R)

3. **Los filtros deberían bloquear el error ANTES de que llegue a la BD** - Si el error persiste, los items inválidos están pasando los filtros

4. **El toast de error debe aparecer en la UI** - Si un item es inválido, el usuario debe verlo

5. **Toda la información está en los logs** - No necesitamos adivinar, los logs nos dirán exactamente qué pasa
