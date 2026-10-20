import type { Task } from './types';

export type DueState = 'overdue' | 'warning' | 'safe' | 'none';

// Whole calendar days from today to `dueDate`, negative once it is past.
// Both sides are normalised to UTC midnight from their Y-M-D parts, so a user
// east or west of UTC still gets their own calendar's answer — `new Date(iso)`
// would parse the due date as UTC midnight and silently shift it a day.
function daysUntil(dueDate: string, today: Date): number {
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = Date.UTC(year, month - 1, day);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - now) / 86_400_000);
}

/**
 * REQUIREMENTS 3.C — the due-date state of a task, plus the words for it.
 * Status 'done' overrides every other state (3.C.iv).
 *
 * The spec names "more than 2 days" (calm) and "less than 24 hours" (warning)
 * but leaves the 24-48h band undefined; a task due tomorrow is treated as
 * warning, so the three bands meet with no gap.
 */
export function dueBadge(task: Task, today: Date = new Date()): { state: DueState; label: string } {
  if (task.dueDate === null) return { state: 'none', label: 'No due date' };
  if (task.status === 'done') return { state: 'none', label: `Due ${task.dueDate}` };

  const days = daysUntil(task.dueDate, today);

  if (days < 0) return { state: 'overdue', label: `Overdue · ${task.dueDate}` };
  if (days <= 1) return { state: 'warning', label: days === 0 ? 'Due today' : 'Due tomorrow' };
  return { state: 'safe', label: `Due ${task.dueDate}` };
}
