/**
 * Normalizes timestamps from the database to ISO strings. Postgres returns Date objects;
 * SQLite (tests, local dev) returns epoch milliseconds or strings.
 */
export function toIso(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    return new Date(Number(value)).toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}
