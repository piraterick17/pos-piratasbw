# Corrección Completa del Sistema de Edición de Pedidos

**Fecha:** 2026-01-23
**Problema:** La función de editar pedidos fallaba con error "invalid input syntax for type bigint: 'undefined'" y a veces no cargaba los productos.

---

## Problemas Identificados

### 1. Error "undefined" como string en campos bigint
**Causa:** Los campos opcionales (cliente_id, zona_entrega_id, etc.) se enviaban como `undefined` en lugar de `null` a PostgreSQL.

**Ejemplo del error:**
```
No se pudo actualizar el pedido: invalid input syntax for type bigint: "undefined"
```

PostgreSQL espera `NULL` para campos bigint opcionales, pero recibía la cadena "undefined" o el valor JavaScript `undefined`.

### 2. Navegación que causaba pérdida de estado
**Causa:** La navegación a `/vender` usaba `window.location.href = '/vender'` que recargaba completamente la página, perdiendo el estado del carrito en algunos casos.

### 3. Datos no sanitizados antes de enviar a BD
**Causa:** Los valores `undefined` se propagaban desde el formulario hasta la base de datos sin filtrar.

---

## Soluciones Implementadas

### 1. Sanitización de Datos en updatePedidoCompleto

#### Archivo: `src/lib/store/pedidosStore.ts` (líneas 1004-1024)

**Antes:**
```typescript
const datosPedidoFinal = {
  ...datosPedido,  // Propagaba undefined sin filtrar
  subtotal: granTotal,
  total: nuevoTotal,
  updated_at: new Date().toISOString()
};
```

**Después:**
```typescript
// Sanitizar datos del pedido: eliminar campos undefined y convertir a null
const datosPedidoSanitizados = Object.entries(datosPedido).reduce((acc, [key, value]) => {
  // Si el valor es undefined, lo convertimos a null
  // Si es un número válido (incluso 0), lo mantenemos
  // Si es string vacío y el campo termina en _id, lo convertimos a null
  if (value === undefined) {
    acc[key] = null;
  } else if (typeof value === 'string' && value.trim() === '' && key.endsWith('_id')) {
    acc[key] = null;
  } else {
    acc[key] = value;
  }
  return acc;
}, {} as Record<string, any>);

const datosPedidoFinal = {
  ...datosPedidoSanitizados,
  subtotal: granTotal,
  total: nuevoTotal,
  updated_at: new Date().toISOString()
};
```

**Beneficio:** Todos los campos undefined se convierten a null antes de enviar a PostgreSQL.

### 2. Valores por Defecto en Construcción del Pedido

#### Archivo: `src/pages/Vender.tsx` (líneas 859-871)

**Antes:**
```typescript
const pedidoData = {
  cliente_id: clienteSeleccionado?.id || null,
  notas: cartState.notas,
  tipo_entrega_id: cartState.tipoEntregaId,
  costo_envio: cartState.costoEnvio,
  direccion_envio: cartState.direccionEnvio,
  zona_entrega_id: cartState.zonaEntregaId,
  notas_entrega: cartState.notasEntrega,
  tiempo_entrega_minutos: minutos,
  subtotal: subtotalCalc,
  descuentos: descuentoValor,
  total: totalCalc
};
```

**Después:**
```typescript
const pedidoData = {
  cliente_id: clienteSeleccionado?.id || null,
  notas: cartState.notas || '',
  tipo_entrega_id: cartState.tipoEntregaId || null,
  costo_envio: cartState.costoEnvio || 0,
  direccion_envio: cartState.direccionEnvio || null,
  zona_entrega_id: cartState.zonaEntregaId || null,
  notas_entrega: cartState.notasEntrega || '',
  tiempo_entrega_minutos: minutos || null,
  subtotal: subtotalCalc,
  descuentos: descuentoValor,
  total: totalCalc
};
```

**Beneficio:** Garantiza que nunca se envíen valores undefined desde el origen.

### 3. Navegación Mejorada con React Router

#### Archivo: `src/pages/Pedidos.tsx`

**Cambios realizados:**

1. **Import agregado (línea 2):**
```typescript
import { useNavigate } from 'react-router-dom';
```

2. **Hook agregado en el componente (línea 284):**
```typescript
export function Pedidos() {
  const navigate = useNavigate();
  // ...
}
```

3. **Navegación corregida (líneas 712-714):**

**Antes:**
```typescript
toast.success('Abriendo editor...', { id: 'loading-edit' });
setTimeout(() => {
  window.location.href = '/vender';
}, 100);
```

**Después:**
```typescript
toast.success('Abriendo editor...', { id: 'loading-edit' });
navigate('/vender');
```

**Beneficio:**
- No recarga la página completa
- Preserva el estado del carrito en Zustand
- Navegación instantánea sin setTimeout
- Menos propenso a race conditions

---

## Flujo Corregido de Edición

### 1. Usuario hace clic en "Editar" en Pedidos.tsx
```typescript
// 1. Cargar pedido completo desde BD
const pedidoCompleto = await fetchPedidoDetalles(pedido.id);

// 2. Cargar en el carrito (Zustand)
useCartStore.getState().cargarPedidoParaEditar(pedidoCompleto);

// 3. Navegar a /vender usando React Router
navigate('/vender');
```

### 2. Página Vender.tsx se carga con el pedido
```typescript
// Al inicializar, verifica sessionStorage
const editingOrderIdSession = sessionStorage.getItem('editing-order-id');

// Si existe, restaura el estado
if (editingOrderIdSession && carrito.length > 0) {
  useCartStore.setState({ editingOrderId: parseInt(editingOrderIdSession, 10) });
}
```

### 3. Usuario modifica el pedido y guarda
```typescript
// Construye pedidoData con valores || null para evitar undefined
const pedidoData = {
  cliente_id: clienteSeleccionado?.id || null,
  tipo_entrega_id: cartState.tipoEntregaId || null,
  zona_entrega_id: cartState.zonaEntregaId || null,
  // ... otros campos con valores por defecto
};

// Si hay editingOrderId, actualiza en lugar de crear
if (editingOrderId) {
  await updatePedidoCompleto(editingOrderId, pedidoData, detalles);
}
```

### 4. updatePedidoCompleto sanitiza y actualiza
```typescript
// Sanitiza valores undefined -> null
const datosPedidoSanitizados = Object.entries(datosPedido).reduce((acc, [key, value]) => {
  if (value === undefined) {
    acc[key] = null;
  }
  // ...
  return acc;
}, {});

// Actualiza en BD con datos limpios
await supabase
  .from('pedidos')
  .update(datosPedidoFinal)
  .eq('id', pedidoId);
```

---

## Archivos Modificados

1. **src/lib/store/pedidosStore.ts**
   - Sanitización de datos en updatePedidoCompleto
   - Conversión de undefined a null
   - Logs adicionales para debugging

2. **src/pages/Vender.tsx**
   - Valores por defecto en construcción de pedidoData
   - Uso de || null y || '' para prevenir undefined

3. **src/pages/Pedidos.tsx**
   - Import de useNavigate
   - Navegación con React Router en lugar de window.location
   - Eliminación de setTimeout innecesario

---

## Validaciones Realizadas

- Build exitoso sin errores de TypeScript
- Flujo de navegación verificado
- Manejo de valores null/undefined verificado
- Logs de debugging agregados para facilitar troubleshooting

---

## Cómo Probar

### Prueba 1: Edición Básica
1. Crear un pedido nuevo con cliente y dirección
2. Hacer clic en "Editar" en la lista de pedidos
3. Verificar que los productos se cargan en el carrito
4. Modificar algún producto o cantidad
5. Guardar cambios
6. **Esperado:** No debe aparecer error de "undefined"

### Prueba 2: Edición sin Dirección
1. Crear un pedido para llevar (sin dirección)
2. Hacer clic en "Editar"
3. Guardar sin cambios
4. **Esperado:** Debe guardar exitosamente con zona_entrega_id = null

### Prueba 3: Navegación Rápida
1. Hacer clic en "Editar" múltiples veces rápidamente
2. **Esperado:** No debe perder el estado del carrito
3. Los productos deben aparecer siempre

### Debugging con Console Logs

Si encuentras problemas, revisa la consola del navegador:

**En updatePedidoCompleto:**
```
[UPDATE-PEDIDO-123] Datos sanitizados: {
  cliente_id: 45,
  zona_entrega_id: null,
  tipo_entrega_id: 1
}
```

**En cargarPedidoParaEditar:**
```
[CARGAR-PEDIDO-EDITAR-123] INICIANDO CARGA DE PEDIDO PARA EDICIÓN
[CARGAR-PEDIDO-EDITAR-123] [A] Convertiendo detalles del pedido...
[CARGAR-PEDIDO-EDITAR-123] [B] ✓ Estado actualizado en Zustand
```

---

## Notas Importantes

1. **Los valores undefined ya no llegarán a PostgreSQL** - Toda sanitización ocurre antes de la consulta

2. **La navegación es más estable** - Usa React Router nativo sin recargas de página

3. **El estado se preserva mejor** - sessionStorage actúa como respaldo si hay recarga accidental

4. **Los logs ayudan al debugging** - Si algo falla, los logs muestran exactamente qué valor tenía cada campo

5. **Compatibilidad hacia atrás** - Los pedidos existentes no se ven afectados, solo la edición futura

---

## Siguiente Paso

Prueba editando pedidos existentes con diferentes configuraciones:
- Con y sin cliente
- Con y sin dirección de envío
- Con diferentes tipos de entrega
- Modificando productos, cantidades y precios

El sistema ahora debe manejar todos estos casos sin errores.
