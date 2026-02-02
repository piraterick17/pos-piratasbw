# Corrección Completa del Sistema de Precios con Salsas

**Fecha:** 2026-01-21
**Problema:** Los precios de productos con salsas extras no se guardaban ni mostraban correctamente en la base de datos, tickets y vistas.

---

## Problema Identificado

### Causa Raíz
Las consultas de precios en `pedidosStore.ts` solo obtenían el campo `precio` de la tabla productos, el cual está en `NULL` para la mayoría de productos. El precio real está en `precio_regular` y opcionalmente en `precio_descuento`.

### Ejemplo del Error
- **Producto:** Chilaquiles con Huevo
- **Precio regular:** $79
- **Salsa extra:** Mole Rojo +$10
- **Precio esperado:** $89 (79 + 10)
- **Precio guardado (ERROR):** $10 (0 + 10)

---

## Solución Implementada

### 1. Corrección en `pedidosStore.ts`

#### Archivo: `src/lib/store/pedidosStore.ts`

**Cambio en `createPedido` (líneas 711-734):**
```typescript
// ANTES
.select('id, precio')  // precio está en NULL

// DESPUÉS
.select('id, precio, precio_regular, precio_descuento')

// Nuevo cálculo de precio efectivo
const precioEfectivo = (p.precio_descuento && Number(p.precio_descuento) > 0)
  ? Number(p.precio_descuento)
  : (p.precio_regular && Number(p.precio_regular) > 0)
    ? Number(p.precio_regular)
    : Number(p.precio || 0);
```

**Cambio en `updatePedidoCompleto` (líneas 932-955):**
```typescript
// Misma corrección aplicada para mantener consistencia
```

### 2. Corrección en `cartStore.ts`

#### Archivo: `src/lib/store/cartStore.ts`

**Corrección de error tipográfico (línea 139):**
```typescript
// ANTES
toast.warning(`... → ${precioBasectual}`);  // Variable mal escrita

// DESPUÉS
toast.warning(`... → ${precioTotalCorrecto}`);
```

**Verificación del cálculo (líneas 170-178):**
El cálculo ya era correcto:
- Obtiene precio_descuento, precio_regular o precio (en ese orden)
- Suma el costo de las salsas
- Precio final = precio base + precio salsas

### 3. Mejora en Visualización de Tickets

#### Archivo: `src/components/TicketModal.tsx`

**Desglose mejorado del precio (líneas 81-121):**
```typescript
// Ahora muestra:
// - Si tiene extras con precio: "Base: $79 + Extras: $10 = $89 c/u"
// - Si no tiene extras: "@ $79 c/u"
// - Lista de salsas con sus precios individuales
```

**Ejemplo de salida:**
```
1x Chilaquiles con Huevo                $89
   Base: $79 + Extras: $10 = $89 c/u
   + Mole Rojo ($10)
```

### 4. Mejora en Vista de Pedidos

#### Archivo: `src/pages/Pedidos.tsx`

**Modal de detalles (líneas 126-168):**
```typescript
// Ahora muestra:
// - Nombre del producto
// - Cantidad
// - Desglose: "$79 + $10 extras"
// - Lista de salsas: "+ Mole Rojo (+$10)"
// - Total del item
```

---

## Archivos Modificados

1. `src/lib/store/pedidosStore.ts` - Corrección de consultas de precios
2. `src/lib/store/cartStore.ts` - Corrección de error tipográfico
3. `src/components/TicketModal.tsx` - Mejora de visualización
4. `src/pages/Pedidos.tsx` - Mejora de visualización

---

## Flujo Correcto Ahora

### Al Crear un Pedido:
1. **Frontend (Carrito):** Calcula precio = precio_regular + suma_salsas
2. **Backend (createPedido):**
   - Obtiene precios frescos de BD (precio_regular, precio_descuento)
   - Calcula precio efectivo
   - Usa `procesarCalculosFinancieros()` que:
     - Precio base = precio efectivo del producto
     - Suma extras de salsas
     - `precio_unitario` = precio base + extras
     - `precio_unitario_original` = precio base (sin extras)
     - `subtotal` = precio_unitario × cantidad
3. **Guarda en BD:**
   ```json
   {
     "precio_unitario": 89,           // Precio final
     "precio_unitario_original": 79,  // Precio base
     "subtotal": 89,
     "salsas_seleccionadas": [{"id": 562, "nombre": "Mole Rojo", "precio": 10}]
   }
   ```

### Al Editar un Pedido:
1. **updatePedidoCompleto** usa la misma lógica que createPedido
2. Garantiza recálculo con precios frescos
3. Mantiene consistencia en toda la aplicación

### En las Vistas:
1. **Tickets:** Muestran desglose completo (base + extras = total)
2. **Pedidos:** Muestran salsas con sus precios individuales
3. **Dashboard/Reportes:** Usan los totales correctos de `detalles_pedido`

---

## Validaciones Realizadas

- Build exitoso sin errores de TypeScript
- Lógica de cálculo verificada en:
  - Creación de pedidos
  - Edición de pedidos
  - Visualización de tickets
  - Visualización de detalles de pedidos

---

## Pruebas Recomendadas

1. **Crear un pedido nuevo:**
   - Agregar un producto con salsa que tenga precio extra
   - Verificar que en BD se guarde: precio_unitario = base + extra
   - Imprimir ticket y verificar desglose

2. **Editar un pedido existente:**
   - Modificar cantidades o productos
   - Verificar recálculo correcto
   - Confirmar que los totales sean precisos

3. **Visualizaciones:**
   - Revisar lista de pedidos activos
   - Abrir detalles y verificar que muestre salsas con precios
   - Generar ticket y revisar formato
   - Consultar Dashboard y Transacciones

---

## Notas Importantes

1. **Los pedidos históricos con precios incorrectos NO fueron modificados** en esta corrección. Si deseas corregir datos históricos, se necesita crear un script de migración.

2. **La estructura de datos es correcta:**
   - `precio_unitario` = precio final que pagará el cliente
   - `precio_unitario_original` = precio base del producto (para análisis)
   - `salsas_seleccionadas` = array JSON con detalle de extras

3. **Todos los cálculos financieros ahora son consistentes** entre:
   - Carrito (frontend)
   - Creación de pedidos (backend)
   - Edición de pedidos (backend)
   - Visualizaciones (frontend)

---

## Siguiente Paso

Prueba el sistema creando un nuevo pedido con un producto que requiera selección de salsas con precio extra. El sistema ahora debe:
- Calcular correctamente el precio total
- Guardar los datos precisos en la base de datos
- Mostrar el desglose completo en tickets y vistas
- Reflejar los totales correctos en reportes y análisis
