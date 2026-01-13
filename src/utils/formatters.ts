/**
 * Formatea un número como precio en formato de moneda
 */
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Formatea una fecha para mostrar
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatea una fecha corta
 */
export const formatShortDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Obtiene la fecha actual en formato ISO
 */
export const getCurrentDateTime = (): string => {
  return new Date().toISOString();
};

