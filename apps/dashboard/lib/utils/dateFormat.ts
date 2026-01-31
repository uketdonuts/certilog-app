/**
 * Date formatting utilities for Panama timezone (UTC-5)
 */

const PANAMA_TIMEZONE = 'America/Panama';

/**
 * Format date/time for display in Panama timezone with 12h format
 */
export function formatPanamaDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date only (no time) for Panama timezone
 */
export function formatPanamaDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time only for Panama timezone with 12h format
 */
export function formatPanamaTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
