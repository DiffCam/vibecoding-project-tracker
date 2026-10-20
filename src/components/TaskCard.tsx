import type { Task } from '../types';

// Flat, 1px border, no shadow — DESIGN.md §4.
// A real <button> so Enter/Space and the focus ring come for free (REQUIREMENTS 8.A/8.B);
// the opener element is handed back up so the modal can return focus here on close (8.C).
// M6 adds the type stripe + icon, M7 the assignee badge, M8 the due-date tint,
// M10 the Copy Context button.
export default function TaskCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (opener: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      className="w-full rounded-lg border border-gray-200 bg-surface-card p-3 text-left hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <span className="block text-sm font-medium text-text-primary">{task.title}</span>
      {task.description && (
        <span className="mt-1 line-clamp-2 block text-sm text-text-muted">
          {task.description}
        </span>
      )}
      <span className="mt-2 block text-xs text-text-muted">
        {task.dueDate ? `Due ${task.dueDate}` : 'No due date'}
      </span>
    </button>
  );
}
