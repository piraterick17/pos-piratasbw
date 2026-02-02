# Fix Dashboard Desayunos - Zona Horaria

## Problema Identificado

El Dashboard de Desayunos no mostraba pedidos porque el filtro de horario no estaba considerando correctamente la conversión de zona horaria.

### Situación:
- **Horario del turno matutino:** 8:00 AM - 12:00 PM (hora de México)
- **Hora en base de datos (UTC):** 14:00 - 18:00 (México es UTC-6, por lo que se suman 6 horas)
- **Problema:** El código estaba filtrando usando horas UTC directamente sin convertir a hora de México

## Solución Implementada

### 1. Conversión Correcta de Horario (DashboardDesayunos.tsx)

```typescript
// ANTES (INCORRECTO):
const pedidosMatutinos = (pedidos || []).filter(pedido => {
  const hora = new Date(pedido.insert_date).getHours(); // Esto obtenía hora local del navegador
  return hora >= 8 && hora < 12;
});

// DESPUÉS (CORRECTO):
const pedidosMatutinos = (pedidos || []).filter(pedido => {
  // Convertir UTC a hora México (UTC-6)
  const fechaUTC = new Date(pedido.insert_date);
  const mexicoOffset = 6 * 60 * 60 * 1000; // 6 horas en milisegundos
  const fechaMexico = new Date(fechaUTC.getTime() - mexicoOffset);
  const hora = fechaMexico.getUTCHours();
  return hora >= 8 && hora < 12;
});
```

### 2. Nueva Función Utilitaria (time.ts)

Se agregó una función para conversión de rangos horarios específicos:

```typescript
/**
 * [NEW] Convierte un rango de horas específico de México a UTC
 * Para el turno matutino (8am-12pm México = 14:00-18:00 UTC)
 */
export const getMexicoHourRangeToUTC = (
  dateStr: string,
  startHourMexico: number,
  endHourMexico: number
): [string, string] => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return ['', ''];

  // Convertir hora México a UTC (sumar 6 horas)
  const startHourUTC = startHourMexico + 6;
  const endHourUTC = endHourMexico + 6;

  // Crear fecha inicio en UTC
  const startDate = new Date(date);
  startDate.setUTCHours(startHourUTC, 0, 0, 0);

  // Crear fecha fin en UTC
  const endDate = new Date(date);
  endDate.setUTCHours(endHourUTC, 0, 0, 0);

  return [startDate.toISOString(), endDate.toISOString()];
};
```

### 3. Fix DateRangeSelector Integration

El componente `DateRangeSelector` tenía una interfaz diferente a la que se estaba usando:

```typescript
// ANTES (INCORRECTO):
<DateRangeSelector
  startDate={dateRange.startDate}
  endDate={dateRange.endDate}
  onStartDateChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
  onEndDateChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
/>

// DESPUÉS (CORRECTO):
<DateRangeSelector
  onRangeChange={handleDateRangeChange}
/>
```

### 4. Conversión de Rango de Fechas

```typescript
// Usar las funciones de time.ts para convertir correctamente
const startDateUTC = getMexicoDateToUTC(startDateStr);
const endDateUTC = getEndOfDayMexico(new Date(endDateStr));
```

### 5. Agrupación por Día Corregida

```typescript
// ANTES (INCORRECTO):
const fecha = new Date(pedido.insert_date).toISOString().split('T')[0];

// DESPUÉS (CORRECTO):
const fecha = getLocalDateStr(pedido.insert_date); // Usa zona México
```

## Ejemplos de Conversión

### Ejemplo 1: Pedido a las 8:30 AM México

```
Hora México:  2026-02-02 08:30:00 (América/Mexico_City)
Hora UTC:     2026-02-02 14:30:00 (UTC)
En BD:        2026-02-02T14:30:00Z

Filtro:
1. Leer de BD: "2026-02-02T14:30:00Z"
2. Convertir a México: restar 6 horas → hora = 8
3. Verificar: 8 >= 8 && 8 < 12 ✅ CUMPLE
```

### Ejemplo 2: Pedido a las 11:45 AM México

```
Hora México:  2026-02-02 11:45:00 (América/Mexico_City)
Hora UTC:     2026-02-02 17:45:00 (UTC)
En BD:        2026-02-02T17:45:00Z

Filtro:
1. Leer de BD: "2026-02-02T17:45:00Z"
2. Convertir a México: restar 6 horas → hora = 11
3. Verificar: 11 >= 8 && 11 < 12 ✅ CUMPLE
```

### Ejemplo 3: Pedido a las 2:00 PM México (NO CUMPLE)

```
Hora México:  2026-02-02 14:00:00 (América/Mexico_City)
Hora UTC:     2026-02-02 20:00:00 (UTC)
En BD:        2026-02-02T20:00:00Z

Filtro:
1. Leer de BD: "2026-02-02T20:00:00Z"
2. Convertir a México: restar 6 horas → hora = 14
3. Verificar: 14 >= 8 && 14 < 12 ❌ NO CUMPLE
```

## Debugging

En la consola del navegador ahora verás:

```
=== DASHBOARD DESAYUNOS - DEBUG ===
Rango de fechas seleccionado: { startDate: "2026-01-26T06:00:00.000Z", endDate: "2026-02-02T05:59:59.999Z" }
Consultando pedidos desde 2026-01-26T06:00:00.000Z hasta 2026-02-02T05:59:59.999Z
Total pedidos obtenidos: 25
Pedidos del turno matutino (8am-12pm México): 8
Ejemplo de pedidos matutinos:
  - Pedido #123: 2026-02-02T14:30:00Z → 8:30 México
  - Pedido #124: 2026-02-02T16:45:00Z → 10:45 México
  - Pedido #125: 2026-02-02T17:15:00Z → 11:15 México
=================================
```

## Verificación

Para verificar que todo funciona:

1. **Abre el Dashboard de Desayunos**
2. **Abre la consola del navegador (F12)**
3. **Observa los logs de debug**
4. **Verifica que:**
   - Se muestren todos los pedidos del rango seleccionado
   - Las horas estén convertidas correctamente a hora de México
   - Los pedidos filtrados estén entre 8:00-12:00 hora México
   - Los gráficos muestren los datos correctos

## Archivos Modificados

1. `src/lib/utils/time.ts` - Nueva función `getMexicoHourRangeToUTC()`
2. `src/pages/DashboardDesayunos.tsx` - Corrección de filtros y conversiones
3. `src/components/DateRangeSelector.tsx` - Inicialización automática con "últimos 7 días"

## Notas Importantes

- **México es UTC-6:** Siempre restar 6 horas para convertir UTC a México
- **Base de datos en UTC:** Todos los timestamps en BD están en UTC
- **Conversión bidireccional:**
  - **Input usuario → BD:** Sumar 6 horas (getMexicoDateToUTC)
  - **BD → Display:** Restar 6 horas (getLocalDateStr, getLocalDateTime)

## Status

✅ **Implementado y probado**
- Conversión de zona horaria corregida
- Filtro de horario matutino funcional
- DateRangeSelector integrado correctamente
- Logs de debugging agregados
