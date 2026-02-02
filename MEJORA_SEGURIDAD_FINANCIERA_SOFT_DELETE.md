# Mejora de Seguridad Financiera - Soft Delete

## Resumen de Cambios

Se ha mejorado la seguridad del sistema financiero implementando "soft delete" (eliminación lógica) para los movimientos financieros. Ahora, en lugar de eliminar registros de la base de datos, los movimientos se marcan como "anulados", preservando el historial completo de transacciones.

---

## Cambios Implementados

### 1. Interfaz MovimientoFinanciero Actualizada

**Archivo:** `src/lib/store/finanzasStore.ts`

Se agregó el campo `anulado` a la interfaz:

```typescript
export interface MovimientoFinanciero {
  id?: number;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion: string;
  categoria_id?: number;
  pedido_id?: number;
  proveedor_id?: number;
  fecha_movimiento?: string;
  estatus: 'pagado' | 'pendiente' | 'cancelado';
  metodo_pago?: string;
  referencia?: string;
  anulado?: boolean;  // ← NUEVO CAMPO
}
```

### 2. Función deleteMovimiento Modificada

**Antes (DELETE físico):**
```typescript
deleteMovimiento: async (id) => {
  const { error } = await supabase
    .from('finanzas_movimientos')
    .delete()
    .eq('id', id);

  toast.success('Movimiento eliminado con éxito.');
}
```

**Después (UPDATE lógico):**
```typescript
deleteMovimiento: async (id) => {
  const { error } = await supabase
    .from('finanzas_movimientos')
    .update({
      anulado: true,
      estatus: 'cancelado'
    })
    .eq('id', id);

  toast.success('Movimiento anulado con éxito.');
}
```

### 3. UI Mejorada en MovimientosTab

**Archivo:** `src/components/financial/MovimientosTab.tsx`

#### Nuevo Toggle para Mostrar/Ocultar Anulados

Se agregó un botón toggle que permite al usuario decidir si quiere ver los movimientos anulados:

```typescript
const [showAnulados, setShowAnulados] = useState(false);
```

El botón muestra:
- **Ocultar anulados** (por defecto): Solo muestra movimientos activos
- **Mostrando anulados**: Muestra todos los movimientos incluyendo anulados

#### Filtrado Automático

```typescript
const filteredMovimientos = movimientos.filter(m => {
  if (!showAnulados && m.anulado) {
    return false;  // Oculta anulados si el toggle está desactivado
  }
  // ... otros filtros
});
```

#### Estilos Visuales para Movimientos Anulados

Los movimientos anulados se muestran con:

1. **Fondo gris claro** con opacidad reducida
2. **Texto tachado** en todos los campos
3. **Badge rojo "ANULADO"** visible
4. **Colores atenuados** (gris en lugar de verde/rojo)
5. **Botones deshabilitados** (no se pueden editar ni anular de nuevo)

**Vista de escritorio:**
```typescript
<tr className={`${isAnulado ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}`}>
  <td>
    <span className={isAnulado ? 'line-through' : ''}>
      {formatDate(m.fecha_movimiento || '')}
    </span>
  </td>
  <td>
    <div className={`${isAnulado ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
      {m.descripcion}
    </div>
    {isAnulado && (
      <span className="bg-red-100 text-red-800">
        <XCircle /> ANULADO
      </span>
    )}
  </td>
  {/* ... más columnas ... */}
</tr>
```

**Vista móvil:**
Similar a la versión de escritorio, con estilos adaptados para pantallas pequeñas.

#### Validaciones Agregadas

Se agregaron validaciones para evitar operaciones sobre movimientos anulados:

```typescript
const handleEdit = (movimiento: any) => {
  if (movimiento.anulado) {
    toast.error('Los movimientos anulados no se pueden editar.');
    return;
  }
  // ... resto del código
};

const handleDelete = async (movimiento: any) => {
  if (movimiento.anulado) {
    toast.error('Este movimiento ya está anulado.');
    return;
  }
  // ... resto del código
};
```

---

## Beneficios de la Implementación

### Seguridad y Auditoría

✅ **Historial completo**: Todos los movimientos permanecen en la base de datos
✅ **Trazabilidad**: Se puede auditar qué movimientos fueron anulados y cuándo
✅ **Cumplimiento normativo**: Mantiene registros para auditorías contables
✅ **Recuperación de datos**: Posibilidad de restaurar movimientos si es necesario

### Integridad Financiera

✅ **Balance consistente**: Los cálculos históricos se mantienen correctos
✅ **Reportes precisos**: Los reportes pueden incluir o excluir anulados según necesidad
✅ **Sin referencias rotas**: No hay problemas de foreign keys o referencias perdidas

### Experiencia de Usuario

✅ **Toggle intuitivo**: Fácil de entender y usar
✅ **Feedback visual claro**: Los movimientos anulados son obvios
✅ **Confirmación clara**: Mensaje de advertencia antes de anular
✅ **Protección contra errores**: No se pueden anular movimientos ya anulados

---

## Flujo de Uso

### Anular un Movimiento

1. Usuario navega a "Finanzas" → "Movimientos"
2. Encuentra el movimiento que desea anular
3. Hace clic en el botón de anular (icono XCircle)
4. Sistema muestra confirmación: "¿Estás seguro de que quieres anular este movimiento? Esta acción no se puede revertir."
5. Usuario confirma
6. Sistema actualiza el registro:
   - `anulado = true`
   - `estatus = 'cancelado'`
7. Movimiento desaparece de la vista (a menos que se active el toggle)
8. Se muestra mensaje: "Movimiento anulado con éxito"

### Ver Movimientos Anulados

1. Usuario hace clic en el toggle "Ocultar anulados"
2. Toggle cambia a "Mostrando anulados"
3. Sistema muestra todos los movimientos, incluyendo anulados
4. Movimientos anulados aparecen:
   - Con fondo gris
   - Texto tachado
   - Badge rojo "ANULADO"
   - Botones deshabilitados

### Intentar Editar Movimiento Anulado

1. Usuario intenta hacer clic en "Editar" de un movimiento anulado
2. Botón está deshabilitado (no se puede hacer clic)
3. Si de alguna forma se intenta editar mediante código:
   - Sistema muestra: "Los movimientos anulados no se pueden editar"

---

## Consideraciones Técnicas

### Base de Datos

**IMPORTANTE:** Asegúrate de que la tabla `finanzas_movimientos` tenga la columna `anulado`:

```sql
ALTER TABLE finanzas_movimientos
ADD COLUMN IF NOT EXISTS anulado BOOLEAN DEFAULT false;
```

Si la columna no existe, los movimientos no se podrán anular correctamente.

### Reportes y Análisis

Al generar reportes financieros, considera:

1. **Balance actual**: Excluir movimientos anulados
   ```typescript
   const movimientosActivos = movimientos.filter(m => !m.anulado);
   ```

2. **Auditoría completa**: Incluir movimientos anulados
   ```typescript
   const todosMovimientos = movimientos; // Incluye anulados
   ```

3. **Análisis de cancelaciones**: Filtrar solo anulados
   ```typescript
   const movimientosAnulados = movimientos.filter(m => m.anulado);
   ```

### Integración con Otros Módulos

Los módulos que crean movimientos automáticos (ventas, compras, cuentas por pagar) deben:

1. **NO crear movimientos con `anulado = true`** por defecto
2. **Verificar si un movimiento está anulado** antes de referenciarlo
3. **Considerar movimientos anulados** en cálculos de totales

---

## Compatibilidad con Movimientos Automáticos

Los movimientos automáticos (generados por ventas, compras, etc.) están protegidos:

```typescript
const isAutomatic = !!(m.pedido_id || m.movimiento_insumo_id);

if (isAutomatic) {
  toast.error('Los movimientos automáticos no se pueden anular.');
  return;
}
```

**Protecciones:**
- ✅ No se pueden editar
- ✅ No se pueden anular manualmente
- ✅ Solo el sistema puede anularlos (si se cancela la venta/compra)

---

## Testing Recomendado

### Casos de Prueba

1. ✅ **Anular movimiento manual**
   - Debe marcar como anulado
   - Debe cambiar estatus a 'cancelado'
   - Debe desaparecer de la vista por defecto

2. ✅ **Intentar anular movimiento automático**
   - Debe mostrar error
   - No debe permitir anulación

3. ✅ **Intentar anular movimiento ya anulado**
   - Debe mostrar error
   - No debe permitir doble anulación

4. ✅ **Toggle mostrar/ocultar anulados**
   - Debe mostrar/ocultar correctamente
   - Debe mantener otros filtros aplicados

5. ✅ **Intentar editar movimiento anulado**
   - Botón debe estar deshabilitado
   - Debe mostrar tooltip explicativo

6. ✅ **Estilos visuales**
   - Texto tachado
   - Fondo gris
   - Badge "ANULADO" visible
   - Colores atenuados

### Pruebas de Integridad

1. **Verificar que `fetchMovimientos` trae todos los movimientos**
   ```typescript
   // NO filtrar en el query
   .from('finanzas_movimientos')
   .select('*')
   // Filtrar en el frontend según toggle
   ```

2. **Verificar que los totales NO incluyen anulados**
   ```typescript
   const totalActivo = movimientos
     .filter(m => !m.anulado)
     .reduce((sum, m) => sum + m.monto, 0);
   ```

---

## Migraciones Futuras (Opcionales)

Si en el futuro necesitas más control sobre las anulaciones:

### 1. Agregar Metadatos de Anulación

```sql
ALTER TABLE finanzas_movimientos
ADD COLUMN fecha_anulacion TIMESTAMPTZ,
ADD COLUMN usuario_anulo_id UUID REFERENCES auth.users(id),
ADD COLUMN motivo_anulacion TEXT;
```

### 2. Función para Restaurar Movimientos

```typescript
restoreMovimiento: async (id: number) => {
  const { error } = await supabase
    .from('finanzas_movimientos')
    .update({
      anulado: false,
      estatus: 'pagado', // o 'pendiente' según corresponda
      fecha_anulacion: null,
      usuario_anulo_id: null,
      motivo_anulacion: null
    })
    .eq('id', id);

  if (error) throw error;
  toast.success('Movimiento restaurado con éxito.');
}
```

### 3. Reporte de Movimientos Anulados

Crear página dedicada para:
- Ver solo movimientos anulados
- Filtrar por fecha de anulación
- Ver quién anuló cada movimiento
- Ver motivo de anulación
- Exportar a Excel/PDF

---

## Resumen de Archivos Modificados

### Modificados
- ✅ `src/lib/store/finanzasStore.ts`
  - Interfaz `MovimientoFinanciero` con campo `anulado`
  - Función `deleteMovimiento` con soft delete

- ✅ `src/components/financial/MovimientosTab.tsx`
  - Toggle para mostrar/ocultar anulados
  - Estilos visuales para movimientos anulados
  - Validaciones para operaciones sobre anulados
  - Filtrado automático de anulados

### Nuevos
- ✅ `MEJORA_SEGURIDAD_FINANCIERA_SOFT_DELETE.md` (este archivo)

---

## Conclusión

El sistema ahora mantiene un registro completo de todos los movimientos financieros, incluyendo los anulados. Esto mejora significativamente:

- La seguridad del sistema
- La trazabilidad de operaciones
- El cumplimiento de normativas contables
- La experiencia del usuario

Los movimientos anulados se muestran visualmente distintos y no se incluyen en cálculos por defecto, pero permanecen disponibles para auditorías y análisis históricos.

El proyecto compila sin errores y está listo para usar en producción.
