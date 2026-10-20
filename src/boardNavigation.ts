export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/** Where a card sits on the board, as column/row indices into `columns`. */
export function locate(
  columns: readonly (readonly string[])[],
  id: string
): { column: number; row: number } | null {
  for (let column = 0; column < columns.length; column++) {
    const row = columns[column].indexOf(id);
    if (row !== -1) return { column, row };
  }
  return null;
}

/**
 * The card an arrow key should move focus to, or null to stay put.
 *
 * Up/down walk the current column and stop at its ends — they do not wrap, so
 * holding an arrow cannot cycle you round forever. Left/right keep the same row
 * where the neighbouring column is long enough and otherwise land on its last
 * card; an empty neighbour is skipped over entirely rather than swallowing focus.
 */
export function navigate(
  columns: readonly (readonly string[])[],
  id: string,
  key: ArrowKey
): string | null {
  const at = locate(columns, id);
  if (at === null) return null;

  if (key === 'ArrowUp' || key === 'ArrowDown') {
    return columns[at.column][at.row + (key === 'ArrowDown' ? 1 : -1)] ?? null;
  }

  const step = key === 'ArrowRight' ? 1 : -1;
  for (let column = at.column + step; column >= 0 && column < columns.length; column += step) {
    const neighbour = columns[column];
    if (neighbour.length > 0) return neighbour[Math.min(at.row, neighbour.length - 1)];
  }
  return null;
}
