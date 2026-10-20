import type { Task } from './types';

/** Fields read straight off the task. */
type TaskTextField = 'title' | 'description' | 'assignee' | 'context';

/** Milestone is matched on its name, which the task only knows by id. */
export type FilterField = TaskTextField | 'milestone' | 'tag';

export type Filter = { field: FilterField; value: string };

export const FILTER_FIELDS: { id: FilterField; label: string }[] = [
  { id: 'title', label: 'Title' },
  { id: 'description', label: 'Description' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'context', label: 'Context' },
  { id: 'milestone', label: 'Milestone' },
  { id: 'tag', label: 'Tag' },
];

/**
 * Every filter must match — AND, not OR. Matching is substring, case-insensitive.
 *
 * `milestoneName` is passed in because a task stores only an id; an unfiled
 * task has no name, so it never matches a milestone filter.
 */
export function matchesFilters(
  task: Task,
  filters: Filter[],
  milestoneName = ''
): boolean {
  return filters.every((filter) => {
    const haystack =
      filter.field === 'milestone'
        ? milestoneName
        : filter.field === 'tag'
          ? task.tags.join(' ') // any tag matching is enough
          : task[filter.field];
    return haystack.toLowerCase().includes(filter.value.trim().toLowerCase());
  });
}

/** A filter is only worth adding if it has something to match on. */
export function isUsable(value: string): boolean {
  return value.trim() !== '';
}

/** Adding the same field/value twice is a no-op rather than a duplicate tag. */
export function addFilter(filters: Filter[], field: FilterField, value: string): Filter[] {
  const trimmed = value.trim();
  if (!isUsable(trimmed)) return filters;
  const exists = filters.some(
    (filter) =>
      filter.field === field && filter.value.toLowerCase() === trimmed.toLowerCase()
  );
  return exists ? filters : [...filters, { field, value: trimmed }];
}
