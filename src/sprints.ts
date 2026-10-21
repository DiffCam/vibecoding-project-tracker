import type { Sprint } from './types';

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

/** Sprints shown under a milestone tab: its own, plus the unfiled ones. */
export function sprintsForMilestone(sprints: Sprint[], milestoneId: string | null): Sprint[] {
  return orderSprints(sprints).filter(
    (sprint) => milestoneId === null || sprint.milestoneId === milestoneId || sprint.milestoneId === null
  );
}
