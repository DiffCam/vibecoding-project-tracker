import type { Task } from '../types';

// Flat, 1px border, no shadow — DESIGN.md §4.
// M5 makes this a button (edit on click), M6 adds the type stripe + icon,
// M7 the assignee badge, M8 the due-date tint, M10 the Copy Context button.
export default function TaskCard({ task }: { task: Task }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-surface-card p-3">
      <h3 className="text-sm font-medium text-text-primary">{task.title}</h3>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">{task.description}</p>
      )}
      <p className="mt-2 text-xs text-text-muted">
        {task.dueDate ? `Due ${task.dueDate}` : 'No due date'}
      </p>
    </article>
  );
}
