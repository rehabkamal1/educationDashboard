export type SortDirection = 'asc' | 'desc';

export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base',
    numeric: true
  });
}

export function sortBy<T>(
  items: readonly T[],
  getValue: (item: T) => string | number,
  direction: SortDirection = 'asc'
): T[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((x, y) => factor * compareValues(getValue(x), getValue(y)));
}
