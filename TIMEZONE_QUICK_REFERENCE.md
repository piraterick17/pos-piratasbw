# TimeZone México - Quick Reference

**Zona Horaria**: América/Mexico_City (UTC-6)
**Archivo**: `src/lib/utils/time.ts`

---

## Funciones Disponibles

### 1️⃣ Mostrar Fecha Local (YYYY-MM-DD)

```typescript
import { getLocalDateStr } from '../lib/utils/time';

const fechaLocal = getLocalDateStr(new Date());
// → "2025-01-14"

// Funciona con strings ISO también
const fecha = getLocalDateStr("2025-01-14T18:30:00Z");
// → "2025-01-14"
```

**Uso**: Comparar fechas, filtros, agrupamientos

---

### 2️⃣ Mostrar Fecha+Hora Legible

```typescript
import { getLocalDateTime } from '../lib/utils/time';

const ahora = getLocalDateTime();
// → "14/01/2025 03:30 PM"

const del_pedido = getLocalDateTime("2025-01-14T18:30:00Z");
// → "14/01/2025 12:30 PM" (convertida a zona México)
```

**Uso**: Display para usuario, reportes

---

### 3️⃣ Mostrar Solo Hora

```typescript
import { getLocalTime } from '../lib/utils/time';

const hora = getLocalTime();
// → "03:30:45 PM"
```

**Uso**: Display de hora exacta

---

### 4️⃣ Convertir Fecha Usuario a UTC

```typescript
import { getMexicoDateToUTC } from '../lib/utils/time';

// Usuario selecciona fecha en input
const fechaUsuario = "2025-01-14"; // formato YYYY-MM-DD

// Convertir a UTC para enviar a BD
const fechaUTC = getMexicoDateToUTC(fechaUsuario);
// → "2025-01-14T06:00:00Z"

// Usar en query
const { data } = await supabase
  .from('pedidos')
  .select('*')
  .gte('insert_date', fechaUTC);
```

**Uso**: Conversión de input de usuario antes de enviar a BD

---

### 5️⃣ Rango de Período (Semana/Mes/Año)

```typescript
import { getDateRangeMexico } from '../lib/utils/time';

// Hoy (inicio a fin del día en zona México, en UTC)
const [hoy_inicio, hoy_fin] = getDateRangeMexico('today');
// → ["2025-01-14T06:00:00Z", "2025-01-14T23:59:59Z"]

// Última semana
const [sem_inicio, sem_fin] = getDateRangeMexico('week');
// → ["2025-01-07T06:00:00Z", "2025-01-14T23:59:59Z"]

// Último mes
const [mes_inicio, mes_fin] = getDateRangeMexico('month');
// → ["2024-12-15T06:00:00Z", "2025-01-14T23:59:59Z"]

// Último año
const [año_inicio, año_fin] = getDateRangeMexico('year');
// → ["2024-01-15T06:00:00Z", "2025-01-14T23:59:59Z"]

// Usar en query
const { data } = await supabase
  .from('pedidos')
  .select('*')
  .gte('insert_date', hoy_inicio)
  .lte('insert_date', hoy_fin);
```

**Uso**: Filtros de período (hoy, semana, mes, año)

---

### 6️⃣ Inicio del Día en UTC

```typescript
import { getStartOfDayMexico } from '../lib/utils/time';

const inicio = getStartOfDayMexico();
// → "2025-01-14T06:00:00Z" (medianoche México en UTC)

// Para un día específico
const inicio_ayer = getStartOfDayMexico(new Date(Date.now() - 86400000));
// → "2025-01-13T06:00:00Z"
```

**Uso**: Filtro inicio de día

---

### 7️⃣ Final del Día en UTC

```typescript
import { getEndOfDayMexico } from '../lib/utils/time';

const fin = getEndOfDayMexico();
// → "2025-01-14T23:59:59Z" (fin de día México en UTC)
```

**Uso**: Filtro final de día

---

## Patrones Comunes

### ✅ Patrón: Filtrar Hoy

```typescript
import { getStartOfDayMexico, getEndOfDayMexico } from '../lib/utils/time';

const { data: pedidosHoy } = await supabase
  .from('pedidos')
  .select('*')
  .gte('insert_date', getStartOfDayMexico())
  .lte('insert_date', getEndOfDayMexico());
```

---

### ✅ Patrón: Filtro por Rango Usuario

```typescript
import { getMexicoDateToUTC } from '../lib/utils/time';

const handleFiltrar = async (fechaInicio: string, fechaFin: string) => {
  const inicio = getMexicoDateToUTC(fechaInicio);
  const fin = getMexicoDateToUTC(fechaFin);

  const { data } = await supabase
    .from('pedidos')
    .select('*')
    .gte('insert_date', inicio)
    .lte('insert_date', fin);
};
```

---

### ✅ Patrón: Mostrar Fecha de BD

```typescript
import { getLocalDateStr, getLocalDateTime } from '../lib/utils/time';

const pedidos = data.map(p => ({
  ...p,
  fecha_display: getLocalDateStr(p.insert_date),
  fecha_completa: getLocalDateTime(p.insert_date)
}));

// fecha_display: "2025-01-14"
// fecha_completa: "14/01/2025 12:30 PM"
```

---

### ✅ Patrón: Agrupar por Fecha

```typescript
import { getLocalDateStr } from '../lib/utils/time';

const pedidosPorDia = {};
data.forEach(pedido => {
  const fecha = getLocalDateStr(pedido.insert_date);
  if (!pedidosPorDia[fecha]) pedidosPorDia[fecha] = [];
  pedidosPorDia[fecha].push(pedido);
});

// Resultado: { "2025-01-14": [...], "2025-01-13": [...] }
```

---

## Errores Comunes ❌ vs ✅

### ❌ MALO: Usar UTC directamente

```typescript
// ❌ INCORRECTO
const fecha = new Date().toISOString(); // UTC puro
const filtro = fecha.split('T')[0]; // YYYY-MM-DD en UTC
// Problema: si son las 12 AM UTC = 6 PM del día anterior en México
```

**Solución:**
```typescript
// ✅ CORRECTO
import { getLocalDateStr, getMexicoDateToUTC } from '../lib/utils/time';

const fecha = getLocalDateStr(); // Zona México
const filtro = getMexicoDateToUTC(fecha); // UTC correcto
```

---

### ❌ MALO: No validar null

```typescript
// ❌ INCORRECTO
const fecha = getLocalDateStr(pedido.insert_date);
// Si insert_date es null → RangeError

// Se debe validar primero
if (!pedido.insert_date) {
  return '—'; // o valor por defecto
}
```

**Solución:**
```typescript
// ✅ CORRECTO (Función ya valida)
const fecha = getLocalDateStr(pedido.insert_date);
// Si es null → retorna "", sin error
```

---

### ❌ MALO: Comparar UTC vs Local

```typescript
// ❌ INCORRECTO
const horaInicio = new Date();
horaInicio.setHours(0, 0, 0, 0); // Hora local
if (pedido.fecha_utc >= horaInicio) { // Comparar UTC vs local
  // ERROR: Desajuste -6 horas
}
```

**Solución:**
```typescript
// ✅ CORRECTO
import { getStartOfDayMexico } from '../lib/utils/time';

const horaInicio = getStartOfDayMexico(); // UTC
if (pedido.fecha_utc >= horaInicio) { // UTC vs UTC
  // CORRECTO
}
```

---

## Cheatsheet

| Necesito... | Usa... |
|-------------|--------|
| Mostrar fecha hoy | `getLocalDateStr()` |
| Mostrar fecha+hora | `getLocalDateTime()` |
| Mostrar solo hora | `getLocalTime()` |
| Convertir input a UTC | `getMexicoDateToUTC()` |
| Rango de período | `getDateRangeMexico()` |
| Filtrar hoy | `getStartOfDayMexico()` + `getEndOfDayMexico()` |
| Agrupar por fecha | `getLocalDateStr()` |
| Comparar fechas | `getLocalDateStr()` |

---

## Debugging

### Ver qué hora es en México ahora

```typescript
import { getLocalDateStr, getLocalDateTime } from '../lib/utils/time';

console.log(getLocalDateStr());     // "2025-01-14"
console.log(getLocalDateTime());    // "14/01/2025 03:30 PM"
```

### Ver conversión UTC → México

```typescript
import { getLocalDateStr } from '../lib/utils/time';

const unaFechaUTC = "2025-01-14T18:30:00Z";
console.log(getLocalDateStr(unaFechaUTC)); // "2025-01-14"
// Esto es 12:30 PM en México
```

### Ver conversión México → UTC

```typescript
import { getMexicoDateToUTC } from '../lib/utils/time';

const fechaUsuario = "2025-01-14";
console.log(getMexicoDateToUTC(fechaUsuario));
// → "2025-01-14T06:00:00Z"
// Esto es medianoche en México convertido a UTC
```

---

## Interfaz por Interfaz

### 📊 Reportes

```typescript
// Convertir fechas de input a UTC
const inicioUTC = getMexicoDateToUTC(fechaInicio);
const finUTC = getMexicoDateToUTC(fechaFin);

// Consultar BD
const pedidos = await fetchPedidosByDateRange(inicioUTC, finUTC);

// Mostrar en gráfico
data.forEach(p => {
  console.log(getLocalDateStr(p.insert_date)); // "2025-01-14"
});
```

### 📈 Analytics

```typescript
// Obtener rango de período
const [inicio, fin] = getDateRangeMexico('week');

// RPCs reciben UTC
const result = await supabase.rpc('get_productos_top_ventas', {
  p_fecha_inicio: inicio,
  p_fecha_fin: fin
});
```

### 🚚 DashboardEntregas

```typescript
// Filtrar entregas de hoy
const { data } = await supabase
  .from('asignaciones_entrega')
  .select('*')
  .gte('fecha_asignacion', getStartOfDayMexico())
  .lte('fecha_asignacion', getEndOfDayMexico());
```

### 🏠 Dashboard

```typescript
// Agrupar ventas por fecha local
const ventasHoy = pedidos.filter(p => {
  if (!p.insert_date) return false;
  return getLocalDateStr(p.insert_date) === getLocalDateStr();
});
```

---

## ¿Preguntas?

📖 Ver: `CONFIGURACION_TIMEZONE_MEXICO.md` - Documentación completa
🔧 Ver: `CORRECION_ERRORES_TIMEZONE_RUNTIME.md` - Detalles técnicos

---

**Última actualización**: 2026-01-14
**TimeZone**: America/Mexico_City (UTC-6)
**Status**: ✅ Listo para usar
