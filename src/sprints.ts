import type { Sprint, Task } from './types';

/**
 * The "not in any sprint" selection. A literal rather than another nullable,
 * because the filter already uses null to mean "no filter at all" — and sprint
 * ids are UUIDs, so this cannot collide with one.
 */
export const UNSCHEDULED = 'unscheduled';

/** Shortest sprint worth having; the form clamps to this. */
export const MIN_DAYS = 1;

/** Built from Y-M-D parts so the arithmetic stays in the user's own calendar. */
function addDays(iso: string, offset: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The last day of the sprint, inclusive: a 1-day sprint ends the day it
 * starts, a 14-day sprint starting on the 1st ends on the 14th.
 */
export function sprintEnd(sprint: Sprint): string {
  return addDays(sprint.startDate, Math.max(MIN_DAYS, sprint.days) - 1);
}

/**
 * 'YYYY-MM-DD' as dd/mm/yy, for reading rather than storing.
 *
 * Day first: five sprints in a list are five ISO strings that differ in the
 * last two characters, and the part that tells them apart should come first.
 * String surgery, not a Date — parsing 'YYYY-MM-DD' through Date reads it as
 * UTC and can hand back the day before.
 *
 * Anything that is not three parts is handed back untouched; a half-typed
 * date in a form should show what was typed.
 */
export function shortDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${day}/${month}/${year.slice(2)}`;
}

/**
 * Start date first, then the soonest end — so a short sprint nested inside a
 * long one comes first. `id` breaks the remaining ties so the order never
 * shuffles between renders for two otherwise identical sprints.
 */
export function compareSprints(a: Sprint, b: Sprint): number {
  if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
  const [endA, endB] = [sprintEnd(a), sprintEnd(b)];
  if (endA !== endB) return endA < endB ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

export function orderSprints(sprints: Sprint[]): Sprint[] {
  return [...sprints].sort(compareSprints);
}

/**
 * Sprint numbers are positions, not stored names — inserting one in the middle
 * renumbers everything after it, which is the behaviour we want. Numbering is
 * global rather than per milestone, so a sprint keeps its name when you switch
 * tabs.
 */
export function sprintNumbers(sprints: Sprint[]): Record<string, number> {
  const numbers: Record<string, number> = {};
  orderSprints(sprints).forEach((sprint, index) => {
    numbers[sprint.id] = index + 1;
  });
  return numbers;
}

/**
 * The sprint that decides a task's milestone, if one does.
 *
 * Only a sprint filed under a milestone qualifies. An unfiled sprint has no
 * milestone to pass down, so it decides nothing and the task keeps its own —
 * which also means the form must leave the field editable in that case, since
 * a disabled field would be showing a value no sprint is answerable for.
 */
export function dictatingSprint(task: Task, sprints: Sprint[]): Sprint | undefined {
  if (task.sprintId === null) return undefined;
  const sprint = sprints.find((one) => one.id === task.sprintId);
  return sprint && sprint.milestoneId !== null ? sprint : undefined;
}

/**
 * The milestone a task belongs to: its sprint's, or its own.
 *
 * `task.milestoneId` is never overwritten by this — it stays underneath as the
 * value the task falls back to the moment its sprint is removed or unfiled.
 */
export function taskMilestone(task: Task, sprints: Sprint[]): string | null {
  return dictatingSprint(task, sprints)?.milestoneId ?? task.milestoneId ?? null;
}

/**
 * Sprints shown under a milestone tab: only its own.
 *
 * An unfiled sprint appears under All and nowhere else. Showing it under every
 * tab instead reads as though it belongs to each of them, which is misleading
 * once more than one milestone exists.
 */
export function sprintsForMilestone(sprints: Sprint[], milestoneId: string | null): Sprint[] {
  return orderSprints(sprints).filter(
    (sprint) => milestoneId === null || sprint.milestoneId === milestoneId
  );
}
