import type { DropTarget } from './useCardDrag';
import type { TaskStatus } from './types';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/**
 * Where a carried card is aimed next.
 *
 * Two rows of drop targets, one above the other: the lanes, and the sprint
 * pills over them. Left/right walk whichever row the card is currently in, up
 * lifts it from the lanes into the strip and down brings it back. Nothing
 * wraps — holding an arrow parks the card at an end rather than cycling it —
 * and null means stay put, so the caller can leave the carry untouched.
 */
export function carryTo(
  target: DropTarget,
  key: ArrowKey,
  board: {
    lanes: readonly TaskStatus[];
    /** The pills, left to right. null is "No sprint". */
    strip: readonly (string | null)[];
    /** Index of the lane the card is rendering in. */
    lane: number;
    /** The sprint the card already holds — where the strip is entered. */
    held: string | null;
  }
): DropTarget | null {
  const { lanes, strip, lane, held } = board;

  if (target.kind === 'sprint') {
    if (key === 'ArrowDown') return { kind: 'status', id: lanes[lane] };
    if (key === 'ArrowUp') return null;
    const next = strip.indexOf(target.id) + (key === 'ArrowRight' ? 1 : -1);
    return next >= 0 && next < strip.length ? { kind: 'sprint', id: strip[next] } : null;
  }

  if (key === 'ArrowUp') {
    if (strip.length === 0) return null;
    // Enter on the sprint the card is already in, so where it sits now is the
    // first thing lit. A sprint filed under another milestone is not in the
    // strip, and falls back to the first pill.
    const from = Math.max(strip.indexOf(held), 0);
    return { kind: 'sprint', id: strip[from] };
  }
  if (key === 'ArrowDown') return null;

  const next = lane + (key === 'ArrowRight' ? 1 : -1);
  return next >= 0 && next < lanes.length ? { kind: 'status', id: lanes[next] } : null;
}

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
