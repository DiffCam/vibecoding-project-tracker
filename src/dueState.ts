import type { Task } from './types';

export type DueState = 'overdue' | 'soon' | 'safe' | 'none';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * A due date is a day, not an instant, so "due today" means by the end of it.
 * Built from the Y-M-D parts rather than `new Date(iso)`, which would parse
 * midnight UTC and shift the day for anyone west of it.
 */
function endOfLocalDay(dueDate: string): number {
  const [year, month, day] = dueDate.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/** Milliseconds left, negative once past. */
function remaining(dueDate: string, now: Date): number {
  return endOfLocalDay(dueDate) - now.getTime();
}

/**
 * REQUIREMENTS 3.C. Status 'done' overrides every other state (3.C.iv).
 *
 * Bands are overdue / within two days / beyond — the two-day line is wider
 * than 3.C's literal "less than 24 hours", so a card starts warning you the
 * day before rather than on the morning it is due.
 */
export function dueState(task: Task, now: Date = new Date()): DueState {
  if (task.dueDate === null || task.status === 'done') return 'none';
  const left = remaining(task.dueDate, now);
  if (left < 0) return 'overdue';
  return left <= 2 * DAY ? 'soon' : 'safe';
}

/**
 * The countdown for the card's rail: hours under a day either way, days
 * beyond. Overdue reads as magnitude — the colour says which side of the line
 * it falls on, so the number does not need a sign.
 */
export function dueCountdown(task: Task, now: Date = new Date()): string | null {
  if (task.dueDate === null || task.status === 'done') return null;

  const size = Math.abs(remaining(task.dueDate, now));
  const [count, unit] =
    size < DAY
      ? [Math.max(1, Math.floor(size / HOUR)), 'hour']
      : [Math.floor(size / DAY), 'day'];

  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** The longer label, for places with room for a sentence rather than a rail. */
export function dueBadge(task: Task, now: Date = new Date()): { state: DueState; label: string } {
  if (task.dueDate === null) return { state: 'none', label: 'No due date' };
  if (task.status === 'done') return { state: 'none', label: `Due ${task.dueDate}` };

  const state = dueState(task, now);
  const count = dueCountdown(task, now);

  if (state === 'overdue') return { state, label: `Overdue by ${count}` };
  return { state, label: `Due in ${count}` };
}

/**
 * Soonest first, undated last. Overdue naturally sorts to the front, which is
 * what makes "the first two" worth showing on a team chip.
 */
export function byUrgency(a: Task, b: Task): number {
  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
}
