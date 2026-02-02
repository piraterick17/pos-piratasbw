export function formatCurrency(amount: number | null | undefined): string {
  if (!amount && amount !== 0) return '-';
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  if (!value && value !== 0) return '-';
  
  return new Intl.NumberFormat('es-MX').format(value);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

export function formatDateShort(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

export const getTimeElapsed = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `hace ${diffMins} min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
};

export const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'ahora';
  if (diffMins === 1) return 'hace 1 minuto';
  if (diffMins < 60) return `hace ${diffMins} minutos`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return 'hace 1 hora';
  if (diffHours < 24) return `hace ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'hace 1 día';
  if (diffDays < 7) return `hace ${diffDays} días`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return 'hace 1 semana';
  if (diffWeeks < 4) return `hace ${diffWeeks} semanas`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'hace 1 mes';
  if (diffMonths < 12) return `hace ${diffMonths} meses`;

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return 'hace 1 año';
  return `hace ${diffYears} años`;
};
// Agrega esto al final de src/lib/utils/formatters.ts

// === SOLUCIÓN DE HORA: Muestra la fecha exacta de la BD sin restar zona horaria ===
export const formatDateTimeUTC = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC', // IMPORTANTE: Bloquea la conversión automática
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};