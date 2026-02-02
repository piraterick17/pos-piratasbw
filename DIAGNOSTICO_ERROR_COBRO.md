# Diagnóstico de Error en Modal de Cobro

## ✅ PROBLEMA RESUELTO

### Error Original Identificado
```
Error: "Could not find the '0' column of 'pagos' in the schema cache"
POST /rest/v1/pagos?columns=%220%22%2C%22cobrado_por_usuario_id%22 400 (Bad Request)
```

**Causa Raíz:** El `CobroModal` enviaba un **array de pagos** `[{metodo_pago: "efectivo", monto: 100}]` pero la función `registrarPago` intentaba insertar el array completo como si fuera un objeto. Supabase interpretaba los índices del array (`0`, `1`, etc.) como nombres de columnas, causando el error.

**Solución Aplicada:**
- Corregir `handleRegistrarPago` en `PedidoDetalle.tsx` para iterar sobre el array de pagos
- Insertar cada pago individualmente con la estructura correcta
- Agregar validaciones y logging detallado

---

## Correcciones Aplicadas

### 1. Problema del Campo `total` Faltante
**CORREGIDO** - El modal de cobro estaba recibiendo un objeto sin el campo `total` calculado.

**Solución Implementada:**
```typescript
// En handleConfirmarTiempoEntrega, cuando se prepara el pedido para cobrar:
const subtotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);
const total = subtotal + (pedidoData.costo_envio || 0);

setPedidoParaCobro({
  ...pedidoData,
  detalles,
  subtotal,
  total  // ✅ Ahora incluye el total calculado
});
```

### 2. Logging Mejorado
**AGREGADO** - Logs detallados en todo el flujo de finalización.

Los logs ahora muestran:
- `[handleFinalizarVenta]` - Handler en Vender.tsx
- `[finalizarVentaCompleta]` - Función en pedidosStore
- `[createPedido]` - Creación del pedido en la base de datos

---

## Cómo Diagnosticar el Error

### Paso 1: Abrir la Consola del Navegador
1. Presiona **F12** o clic derecho → **Inspeccionar**
2. Ve a la pestaña **Console**
3. Asegúrate de que esté limpia (clic en el icono de 🚫 para limpiar)

### Paso 2: Reproducir el Error
1. Agrega productos al carrito
2. Selecciona un cliente
3. Selecciona tipo de entrega (si es "A domicilio", completa dirección y zona)
4. Haz clic en **Cobrar**
5. Confirma el tiempo de entrega
6. En el modal de cobro:
   - Selecciona método de pago (Efectivo o Transferencia)
   - Ingresa el monto
   - Haz clic en **Finalizar Venta**

### Paso 3: Revisar los Logs en la Consola

Deberías ver algo como esto:

```
[handleFinalizarVenta] Iniciando con pedidoParaCobro: {...}
[handleFinalizarVenta] Pagos: [{metodo_pago: "efectivo", monto: 100}]
[handleFinalizarVenta] Estado final: completado
[handleFinalizarVenta] Pedido data: {...}
[handleFinalizarVenta] Detalles: [...]
[finalizarVentaCompleta] Iniciando con pedido: {...}
[finalizarVentaCompleta] Detalles: [...]
[finalizarVentaCompleta] Pagos: [...]
[finalizarVentaCompleta] Estado: completado
[finalizarVentaCompleta] Creando pedido...
[createPedido] Iniciando creación de pedido
[createPedido] Pedido recibido: {...}
[createPedido] Detalles recibidos: [...]
[createPedido] Datos del pedido a insertar: {...}
```

### Paso 4: Identificar Dónde Falla

**Si ves un error tipo:**

#### A) "Error obteniendo estado"
```
[createPedido] Error obteniendo estado: {...}
```
**Problema:** La tabla `pedido_estados` no tiene los registros necesarios.
**Solución:** Ejecutar las migraciones de base de datos.

#### B) "Error insertando pedido"
```
[createPedido] Error insertando pedido: {
  code: "...",
  message: "..."
}
```
**Posibles causas:**
- Falta una columna en la tabla `pedidos`
- Hay un constraint violado (NOT NULL, FOREIGN KEY, etc.)
- Tipo de dato incorrecto

**Revisa el campo `message` del error** - te dirá exactamente qué columna o constraint está fallando.

#### C) "Error al registrar pagos"
```
[finalizarVentaCompleta] Error al insertar pagos: {...}
```
**Posibles causas:**
- La tabla `pagos` no existe
- Hay un problema con el `pedido_id` (FK constraint)
- Faltan permisos RLS

#### D) "Error al obtener datos actualizados"
```
[finalizarVentaCompleta] Error al obtener pedido actualizado: {...}
```
**Posibles causas:**
- La vista `pedidos_vista` no existe
- Hay un problema con los permisos RLS

---

## Errores Comunes y Soluciones

### Error: "null value in column violates not-null constraint"
**Causa:** Intentas insertar un registro sin un campo requerido.

**Revisa:** ¿Qué columna menciona el error?
- Si es `cliente_id` → Asegúrate de seleccionar un cliente
- Si es `tipo_entrega_id` → Asegúrate de seleccionar tipo de entrega
- Si es `estado_id` → Problema con la migración de estados

### Error: "insert or update on table violates foreign key constraint"
**Causa:** Estás referenciando un ID que no existe en la tabla relacionada.

**Revisa:** ¿Qué FK menciona?
- `tipo_entrega_id` → ¿Existen tipos de entrega en la BD?
- `zona_entrega_id` → ¿Existe esa zona en la BD?
- `cliente_id` → ¿Existe ese cliente en la BD?

### Error: "new row violates row-level security policy"
**Causa:** Los permisos RLS están bloqueando la inserción.

**Solución:** Revisar las políticas RLS en Supabase.

### Error: "column does not exist"
**Causa:** Intentas insertar en una columna que no existe en la tabla.

**Solución:** Ejecutar las migraciones más recientes.

---

## Verificación de Datos

### Antes de Finalizar la Venta, Verifica:

Expande el log `[handleFinalizarVenta] Pedido data:` y verifica que tenga:

```javascript
{
  cliente_id: "uuid-del-cliente",           // ✓ Debe tener valor
  tipo_entrega_id: 1,                       // ✓ Debe tener valor (1, 2, o 3)
  costo_envio: 0,                           // ✓ Puede ser 0
  notas: "...",                             // ✓ Puede estar vacío
  tiempo_entrega_minutos: 30,               // ✓ Debe tener valor

  // Si tipo_entrega_id es "A domicilio" (1):
  direccion_envio: {                        // ✓ Debe existir
    calle: "Calle 123",                     // ✓ No debe estar vacío
    ciudad: "Ciudad",
    referencias: "..."
  },
  zona_entrega_id: 5,                       // ✓ Debe tener valor
  notas_entrega: "..."                      // ✓ Puede estar vacío
}
```

### Verifica los Detalles

Expande `[handleFinalizarVenta] Detalles:` y verifica:

```javascript
[
  {
    producto_id: 123,                       // ✓ Debe existir
    cantidad: 2,                            // ✓ Mayor a 0
    precio_unitario: 50,                    // ✓ Mayor a 0
    subtotal: 100,                          // ✓ cantidad × precio_unitario
    salsas_seleccionadas: [...],            // ✓ Puede estar vacío
    nombre: "Producto X"                    // ✓ Debe tener valor
  }
]
```

### Verifica los Pagos

Expande `[handleFinalizarVenta] Pagos:` y verifica:

```javascript
[
  {
    metodo_pago: "efectivo",                // ✓ Debe ser: efectivo, debito, credito, transferencia
    monto: 100                              // ✓ Mayor a 0
  }
]
```

---

## Acciones Inmediatas

### 1. Reproduce el error y copia EXACTAMENTE el mensaje de error de la consola

### 2. Si el error es de base de datos, ve al Dashboard de Supabase:
- URL: https://supabase.com/dashboard
- Ve a tu proyecto
- Abre **Table Editor** → verifica que existan:
  - `pedidos`
  - `detalles_pedido`
  - `pagos`
  - `pedido_estados`
  - `tipos_entrega`
  - `zonas_entrega`

### 3. Verifica que las migraciones se hayan ejecutado:
- En Supabase Dashboard
- Ve a **Database** → **Migrations**
- Verifica que todas las migraciones estén aplicadas (marca verde ✓)

### 4. Comparte los logs completos:
- Copia TODO el contenido de la consola desde `[handleFinalizarVenta]` hasta el error
- Incluye el mensaje de error completo con su código y detalles

---

## Testing Rápido

Para probar que todo funciona, crea un pedido simple:

1. **Tipo de entrega:** "Para llevar" (no requiere dirección)
2. **Cliente:** Cualquiera
3. **Producto:** 1 producto simple
4. **Pago:** Efectivo, monto exacto
5. **Finalizar:** Debería funcionar sin problemas

Si esto funciona pero "A domicilio" falla, el problema está en los campos de dirección/zona.

---

## Próximos Pasos Después de Identificar el Error

Una vez que tengas el mensaje de error exacto de la consola, podremos:
1. Identificar la causa raíz
2. Aplicar la solución específica
3. Verificar que funcione correctamente

**Por favor, comparte el output completo de la consola cuando reproduzcas el error.**
