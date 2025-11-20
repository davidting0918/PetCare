/**
 * Date utility functions for handling timezone conversions
 * All timestamps from backend are in UTC, we need to convert them to local time for display
 */

/**
 * Convert UTC ISO string to local Date object
 * Handles both UTC strings (with Z) and local strings (without timezone info)
 * @param utcString - ISO 8601 string from backend (should be UTC)
 * @returns Date object in local timezone
 */
export function utcToLocal(utcString: string): Date {
  // If string already has timezone info (ends with Z or +HH:MM), parse directly
  if (utcString.includes('Z') || /[+-]\d{2}:\d{2}$/.test(utcString)) {
    return new Date(utcString);
  }

  // If string doesn't have timezone info, assume it's UTC
  // Append 'Z' to indicate UTC
  return new Date(utcString + (utcString.includes('T') ? 'Z' : ''));
}

/**
 * Convert local Date to UTC ISO string for sending to backend
 * @param date - Local Date object or ISO string
 * @returns ISO 8601 string in UTC
 */
export function localToUtc(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
}

/**
 * Format date for display in local timezone
 * @param utcString - UTC ISO string from backend
 * @param format - Format string (default: 'MMM d, h:mm a')
 * @returns Formatted date string in local timezone
 */
export function formatLocalDate(utcString: string): string {
  const localDate = utcToLocal(utcString);

  // Use Intl.DateTimeFormat for better timezone handling
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return formatter.format(localDate);
}

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm format)
 * Converts UTC time to local time for input field
 * @param utcString - UTC ISO string from backend
 * @returns String in format YYYY-MM-DDTHH:mm (local time)
 */
export function formatForDateTimeLocal(utcString: string): string {
  const localDate = utcToLocal(utcString);

  // Get local date components
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get current local time in datetime-local format
 * @returns String in format YYYY-MM-DDTHH:mm (local time)
 */
export function getCurrentLocalDateTime(): string {
  const now = new Date();
  return formatForDateTimeLocal(now.toISOString());
}

/**
 * Convert datetime-local string to UTC ISO string
 * datetime-local input gives us local time, we need to convert to UTC for backend
 * @param localDateTimeString - String in format YYYY-MM-DDTHH:mm (local time)
 * @returns ISO 8601 string in UTC
 */
export function datetimeLocalToUtc(localDateTimeString: string): string {
  // Create a Date object from the local datetime string
  // The Date constructor interprets it as local time
  const localDate = new Date(localDateTimeString);

  // Convert to UTC ISO string
  return localDate.toISOString();
}
