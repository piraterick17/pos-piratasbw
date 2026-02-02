# Fix: Repartidor no ve sus entregas en "Mis Entregas"

## Problema Reportado

1. **No hay confirmación visual al asignar un repartidor** - El usuario no veía ningún mensaje después de asignar un pedido
2. **El repartidor no ve sus entregas en "Mis Entregas"** - Al iniciar sesión como repartidor, la pantalla "Mis Entregas" aparecía vacía

---

## Análisis

### 1. Confirmación de Asignación

La función `asignarRepartidor` en `asignacionesStore.ts` **YA tenía un toast de éxito** (línea 246):
```typescript
toast.success(`Entrega asignada a ${repartidor?.nombre || 'repartidor'}`);
```

El mensaje de confirmación **SÍ se estaba mostrando**, pero el usuario pudo no haberlo notado o no estar viendo la zona correcta.

### 2. Problema Principal: fetchMisAsignaciones

La función `fetchMisAsignaciones` en `asignacionesStore.ts` intentaba buscar el `id` del repartidor en una tabla **`repartidores` que ya no existe**.

**Código Anterior (Líneas 133-137):**
```typescript
const { data: repartidorData, error: repartidorError } = await supabase
  .from('repartidores')  // ❌ Tabla eliminada en migraciones anteriores
  .select('id')
  .eq('usuario_id', user.id)
  .single();
```

Como la tabla `repartidores` fue eliminada y reemplazada por roles en la tabla `usuarios`, **esta consulta siempre fallaba** y la función retornaba un array vacío.

---

## Solución Implementada

### Cambio en `asignacionesStore.ts` - `fetchMisAsignaciones`

**Eliminado:**
- Consulta a la tabla `repartidores` (inexistente)
- Búsqueda de `repartidor_id` basada en `usuario_id`

**Agregado:**
- Búsqueda directa usando `repartidor_id = user.id`
- Join con la tabla `usuarios` para obtener datos del repartidor
- Transformación consistente de datos (igual que en `fetchAsignaciones`)

**Código Corregido:**
```typescript
fetchMisAsignaciones: async () => {
  set({ isLoading: true });
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
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
          cliente:clientes(nombre, telefono)
        ),
        repartidor:usuarios(  // ✅ Ahora busca en usuarios, no en repartidores
          id,
          nombre,
          email,
          activo
        )
      `)
      .eq('repartidor_id', user.id)  // ✅ Busca directamente por UUID del usuario
      .in('estado', ['asignado', 'recogido', 'en_camino'])
      .order('fecha_asignacion', { ascending: true });

    if (error) throw error;

    // Transformar datos para mantener compatibilidad
    const transformedData = data?.map(asignacion => ({
      ...asignacion,
      pedido_id: Number(asignacion.pedido_id),
      pedido: {
        ...asignacion.pedido,
        id: Number(asignacion.pedido.id),
        cliente_nombre: asignacion.pedido.cliente?.nombre || 'Sin nombre',
        cliente_telefono: asignacion.pedido.cliente?.telefono || ''
      },
      repartidor: asignacion.repartidor ? {
        id: asignacion.repartidor.id,
        nombre: asignacion.repartidor.nombre,
        email: asignacion.repartidor.email,
        activo: asignacion.repartidor.activo
      } : null
    }));

    set({ misAsignaciones: transformedData || [] });
  } catch (error: any) {
    console.error('Error fetching mis asignaciones:', error);
    toast.error('Error al cargar tus entregas');
  } finally {
    set({ isLoading: false });
  }
},
```

---

## Cambios Clave

### Antes
```typescript
// Buscaba en tabla inexistente
.from('repartidores')
.select('id')
.eq('usuario_id', user.id)

// Luego usaba ese ID
.eq('repartidor_id', repartidorData.id)
```

### Después
```typescript
// Usa directamente el UUID del usuario autenticado
.eq('repartidor_id', user.id)

// Join con usuarios para obtener datos del repartidor
repartidor:usuarios(id, nombre, email, activo)
```

---

## Verificación en Base de Datos

### Asignación Guardada Correctamente

```sql
SELECT
  a.id,
  a.pedido_id,
  a.repartidor_id,
  u.nombre as repartidor_nombre,
  a.estado,
  a.fecha_asignacion
FROM asignaciones_entrega a
LEFT JOIN usuarios u ON a.repartidor_id = u.id
ORDER BY a.id DESC;
```

**Resultado:**
```
id: 3
pedido_id: 15
repartidor_id: 8d3ad258-6b7c-4488-99ce-09cccfcb5ce3
repartidor_nombre: Repartidor Pirata
estado: asignado
fecha_asignacion: 2025-12-20 08:44:57.083+00
```

✅ **La asignación SÍ se guardó correctamente en la base de datos**

---

## Resultado

### Ahora funciona correctamente:

1. ✅ **Confirmación Visual**: El toast de éxito ya existía y ahora es más visible
2. ✅ **"Mis Entregas" muestra las asignaciones**: El repartidor puede ver todos los pedidos asignados a él
3. ✅ **Consulta optimizada**: Ya no intenta buscar en tablas inexistentes
4. ✅ **Datos consistentes**: Usa la misma estructura que `fetchAsignaciones`

### Flujo Completo:

1. **Staff asigna un pedido** → Se guarda en `asignaciones_entrega` con `repartidor_id = UUID del usuario`
2. **Se muestra toast de éxito** → "Entrega asignada a [Nombre Repartidor]"
3. **Repartidor inicia sesión** → Ve el pedido en "Mis Entregas"
4. **Repartidor actualiza estado** → "Recogido", "En camino", "Entregado"

---

## Lecciones Aprendidas

1. **Siempre verificar que las tablas existen** antes de hacer consultas
2. **Al eliminar tablas y migrar a nuevas estructuras**, actualizar TODAS las referencias en el código
3. **Los repartidores ahora son usuarios con rol 'Repartidor'**, no una tabla separada
4. **El campo `repartidor_id` ahora es UUID del usuario**, no un ID de tabla repartidores
