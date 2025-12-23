import { parse, isValid } from 'date-fns';
import { Transform } from 'class-transformer';

/**
 * Parses a date string in dd/MM/yyyy format and returns a Date object.
 * Returns null if the format is invalid.
 */
export function parseDDMMYYYY(value: string | any): Date | null {
  if (typeof value !== 'string') return null;
  
  // Clean string
  const cleanStr = value.trim();
  if (!cleanStr) return null;

  // Expected format dd/MM/yyyy
  const parsed = parse(cleanStr, 'dd/MM/yyyy', new Date());
  
  if (isValid(parsed)) {
    return parsed;
  }
  
  return null;
}

/**
 * Parses a date string in dd/MM/yyyy HH:mm format.
 */
export function parseDDMMYYYYHHmm(value: string | any): Date | null {
  if (typeof value !== 'string') return null;
  const cleanStr = value.trim();
  if (!cleanStr) return null;

  const parsed = parse(cleanStr, 'dd/MM/yyyy HH:mm', new Date());
  if (isValid(parsed)) return parsed;
  return null;
}

/**
 * Decorator helper for class-transformer's @Transform
 */
export function TransformDDMMYYYY() {
  return Transform(({ value }) => {
    if (!value) return null;
    return parseDDMMYYYY(value);
  });
}

export function TransformDDMMYYYYHHmm() {
  return Transform(({ value }) => {
    if (!value) return null;
    return parseDDMMYYYYHHmm(value);
  });
}
