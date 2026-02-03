/**
 * Formatea un número como moneda (MXN) con separador de miles.
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return '$0.00';

    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};

/**
 * Formatea un número con separador de miles.
 */
export const formatNumber = (value: number | string | null | undefined): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return '0';

    return new Intl.NumberFormat('es-MX').format(num);
};

/**
 * Formatea una fecha ISO a string legible en México
 */
export const formatDateTimeMX = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
};
