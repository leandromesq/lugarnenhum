export function wrapIndex(index: number, count: number): number {
  return count > 0 ? ((index % count) + count) % count : 0;
}

/** Pick the shortest route when a side disc is selected directly. */
export function selectionSteps(
  current: number,
  target: number,
  count: number,
): number {
  const forward = wrapIndex(target - current, count);
  return forward > count / 2 ? forward - count : forward;
}

/** The middle copy is the stable anchor of the repeating physical track. */
export function rebaseCursor(cursor: number, count: number): number {
  return count > 1 ? count + wrapIndex(cursor, count) : 0;
}
