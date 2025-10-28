export function assignDefined<T extends object>(
  target: T,
  source: Partial<T>,
): void {
  const targetRecord = target as Record<string, unknown>;
  for (const key of Object.keys(source) as Array<keyof T & string>) {
    const value = source[key];
    if (value !== undefined) {
      targetRecord[key] = value as unknown;
    }
  }
}
