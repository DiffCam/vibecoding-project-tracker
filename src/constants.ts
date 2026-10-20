import type { TaskStatus } from './types';

// The four columns of the board, in render order (PRD §7).
// Use these IDs everywhere — do not invent new ones.
export const STAGES: readonly { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

// PRD §8 — the only valid values for `Task.assignee`.
export const TEAM: readonly string[] = ['Cameron Farr'];
