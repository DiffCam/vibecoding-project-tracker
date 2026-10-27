import { STAGES, TYPE_ACCENT } from './constants';
import { sprintNumbers } from './sprints';
import type { Milestone, Sprint, Task, TaskType } from './types';

/** One field that moved, already written out for a reader. */
export type FieldChange = { label: string; from: string; to: string };

/**
 * A save, and what it altered.
 *
 * Values are stored as the text that was true at the time rather than as ids
 * — renaming a milestone later should not rewrite the record of what this
 * task used to be in.
 */
export type TaskEvent = {
  at: string;
  changes: FieldChange[];
};

/** Turns ids into the names they had when the change was made. */
export type Naming = {
  milestone: (id: string | null) => string;
  sprint: (id: string | null) => string;
  status: (id: string) => string;
  type: (id: string) => string;
};

const NONE = '—';

const show = (value: string | null | undefined) => {
  const text = (value ?? '').trim();
  if (!text) return NONE;
  // Long prose would push the other side of the arrow off the card.
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
};

const MODE_NAME: Record<string, string> = {
  simple: 'Simple',
  spdd: 'SPDD',
  custom: 'Custom',
};

/**
 * What changed between two states of a task, excluding the context itself.
 *
 * The context is versioned separately and appears here only as the jump
 * between version numbers, which the caller supplies — the body of the change
 * belongs in the context history, not repeated in this list.
 */
export function describeChanges(before: Task, after: Task, naming: Naming): FieldChange[] {
  const changes: FieldChange[] = [];
  const add = (label: string, from: string, to: string) => {
    if (from !== to) changes.push({ label, from, to });
  };

  add('Title', show(before.title), show(after.title));
  add('Description', show(before.description), show(after.description));
  add('Type', naming.type(before.type), naming.type(after.type));
  add('Status', naming.status(before.status), naming.status(after.status));
  add('Assignee', show(before.assignee), show(after.assignee));
  add('Weight', String(before.weight ?? 1), String(after.weight ?? 1));
  add('Due date', show(before.dueDate), show(after.dueDate));
  add('Milestone', naming.milestone(before.milestoneId), naming.milestone(after.milestoneId));
  add('Sprint', naming.sprint(before.sprintId), naming.sprint(after.sprintId));
  add('AI tool', show(before.contextTool), show(after.contextTool));
  add(
    'Editor',
    MODE_NAME[before.contextMode] ?? before.contextMode,
    MODE_NAME[after.contextMode] ?? after.contextMode
  );

  // Tags are a set, so the useful reading is which ones joined or left.
  const gained = after.tags.filter((tag) => !before.tags.includes(tag));
  const lost = before.tags.filter((tag) => !after.tags.includes(tag));
  if (gained.length || lost.length) {
    changes.push({
      label: 'Tags',
      from: before.tags.length ? before.tags.join(', ') : NONE,
      to: after.tags.length ? after.tags.join(', ') : NONE,
    });
  }

  return changes;
}

/**
 * How ids read right now, for a change being recorded right now.
 *
 * Shared so the editor and the board cannot word the same move two different
 * ways — and built from the current lists on purpose, because the point of
 * storing text is to freeze the names as they were at the time.
 */
export function naming(milestones: Milestone[], sprints: Sprint[]): Naming {
  const numbers = sprintNumbers(sprints);
  return {
    milestone: (id) =>
      id === null ? 'None' : (milestones.find((one) => one.id === id)?.name ?? 'None'),
    sprint: (id) => (id === null ? 'No sprint' : `Sprint ${numbers[id] ?? '?'}`),
    status: (id) => STAGES.find((one) => one.id === id)?.label ?? id,
    type: (id) => TYPE_ACCENT[id as TaskType]?.label ?? id,
  };
}

/**
 * `after` with the move appended to its log, or `after` untouched if nothing
 * the log reports actually moved.
 *
 * Every write to a task outside the editor goes through this, so the history
 * is a record of what happened to the task rather than only of what was typed
 * on its page.
 */
export function logChange(before: Task, after: Task, how: Naming): Task {
  const changes = describeChanges(before, after, how);
  if (changes.length === 0) return after;
  return { ...after, events: [...after.events, { at: new Date().toISOString(), changes }] };
}

/** The context's own line in the list: a jump between version numbers. */
export function contextChange(fromVersion: number, toVersion: number): FieldChange {
  return {
    label: 'Context',
    from: fromVersion > 0 ? `v${fromVersion}` : NONE,
    to: `v${toVersion}`,
  };
}
