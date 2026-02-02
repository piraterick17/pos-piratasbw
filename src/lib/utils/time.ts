/**
 * CONFIGURACIÓN DE ZONA HORARIA MÉXICO (FIX ROBUSTO)
 * Forzamos matemáticamente UTC-6 para evitar inconsistencias
 * entre navegador y servidor.
 */
const MEXICO_TIMEZONE_OFFSET = -6; // horas

/**
 * Obtiene el offset actual en minutos.
 */
export const getMexicoTimezoneOffset = (): number => {
  return 360; // 6 horas * 60 minutos (Fijo)
};

/**
 * Convierte un string ISO UTC a Date
 */
export const convertUTCToMexico = (utcISOString: string): Date => {
  return new Date(utcISOString);
};

/**
 * [FIXED] Obtiene la fecha YYYY-MM-DD en zona horaria de México
 * Usa resta matemática de 6 horas para garantizar consistencia.
 */
export const getLocalDateStr = (date?: Date | string | null): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  // Forzar UTC-6 restando milisegundos
  const mexicoOffset = 6 * 60 * 60 * 1000; 
  const mexicoTime = new Date(dateObj.getTime() - mexicoOffset);

  return mexicoTime.toISOString().split('T')[0];
};

/**
 * [FIXED] Obtiene fecha y hora legible para México
 */
export const getLocalDateTime = (date?: Date | string | null): string => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
};

/**
 * Obtiene solo la hora
 */
export const getLocalTime = (date?: Date | string | null): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City'
  }).format(dateObj);
};

/**
 * [FIXED] Convierte fecha local "YYYY-MM-DD" a Inicio del día UTC (06:00:00Z)
 * Vital para que los filtros de base de datos coincidan con México.
 */
export const getMexicoDateToUTC = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    // Forzamos las 6:00 AM UTC (que es 00:00 México)
    date.setUTCHours(6, 0, 0, 0);
    return date.toISOString();
  } catch (error) {
    return '';
  }
};

/**
 * [RESTAURADO] Obtiene el inicio del día en UTC
 */
export const getStartOfDayMexico = (date: Date = new Date()): string => {
  const dateStr = getLocalDateStr(date);
  return getMexicoDateToUTC(dateStr);
};

/**
 * [FIXED] Obtiene el final del día en UTC (05:59:59Z del día siguiente)
 */
export const getEndOfDayMexico = (date: Date = new Date()): string => {
  // Obtenemos inicio (06:00 Z)
  const startUTC = getStartOfDayMexico(date);
  const d = new Date(startUTC);
  
  // Sumamos 23h 59m 59s
  d.setUTCHours(d.getUTCHours() + 23, 59, 59, 999);
  return d.toISOString();
};

/**
 * [FIXED] Rango de fechas robusto
 * Soporta 'year' para compatibilidad con tu archivo original
 */
export const getDateRangeMexico = (period: 'today' | 'week' | 'month' | 'year' = 'today'): [string, string] => {
  const now = new Date();
  
  // Ajuste matemático para saber "qué día es hoy" en México
  const mexicoOffset = 6 * 60 * 60 * 1000;
  const mxNow = new Date(now.getTime() - mexicoOffset);
  
  let startDate = new Date(mxNow);
  const endDateStr = mxNow.toISOString().split('T')[0];

  switch (period) {
    case 'week':
      startDate.setDate(mxNow.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(mxNow.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(mxNow.getFullYear() - 1);
      break;
    case 'today':
    default:
      // startDate ya es hoy
      break;
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  // Convertimos usando la lógica arreglada
  const startUTC = getMexicoDateToUTC(startDateStr);
  const endUTC = getEndOfDayMexico(new Date(endDateStr)); // Usamos el string corregido como base

  return [startUTC, endUTC];
};

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

/**
 * FUNCIONES LEGADAS (Mantenidas para compatibilidad)
 */
export const getLocalISOString = (): string => {
  const now = new Date();
  const mexicoOffset = 6 * 60 * 60 * 1000;
  return new Date(now.getTime() - mexicoOffset).toISOString();
};

export const getLocalDate = (): Date => {
  return new Date();
};