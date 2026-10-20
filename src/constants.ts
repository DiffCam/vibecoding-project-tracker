import type { TaskStatus, TaskType } from './types';

// The four columns of the board, in render order (PRD §7).
// Use these IDs everywhere — do not invent new ones.
export const STAGES: readonly { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

// PRD §8 — the only valid values for `Task.assignee`.
// B and C are placeholders so hand-off is demoable; swap in real names when known.
export const TEAM: readonly string[] = ['Cameron Farr', 'Teammate B', 'Teammate C'];

// DESIGN.md §2 task-type accents. Written out per type rather than built as
// `bg-type-${type}` because Tailwind only emits classes it can see as literals.
export const TYPE_ACCENT: Record<TaskType, { stripe: string; text: string; label: string }> = {
  feature: { stripe: 'bg-type-feature', text: 'text-type-feature', label: 'Feature' },
  bug: { stripe: 'bg-type-bug', text: 'text-type-bug', label: 'Bug' },
};
