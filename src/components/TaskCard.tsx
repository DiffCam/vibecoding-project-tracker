import { TYPE_ACCENT } from '../constants';
import Avatar from './Avatar';
import TypeIcon from './TypeIcon';
import type { Task } from '../types';

// Flat, 1px border, no shadow — DESIGN.md §4. The type accent is a stripe child
// rather than a border utility so it cannot fight the card's 1px gray border.
// A real <button> so Enter/Space and the focus ring come for free (REQUIREMENTS 8.A/8.B);
// the opener element is handed back up so the modal can return focus here on close (8.C).
// M7 adds the assignee badge, M8 the due-date tint, M10 the Copy Context button.
export default function TaskCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (opener: HTMLElement) => void;
}) {
  const accent = TYPE_ACCENT[task.type];

  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      className="flex w-full overflow-hidden rounded-lg border border-gray-200 bg-surface-card text-left hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <span className={`w-1 shrink-0 ${accent.stripe}`} aria-hidden="true" />

      <span className="min-w-0 flex-1 p-3">
        <span className="flex items-start justify-between gap-2">
          <span className="block text-sm font-medium text-text-primary">{task.title}</span>
          {/* Icon + text, so the type is never conveyed by colour alone (NFR 3.B). */}
          <TypeIcon type={task.type} className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent.text}`} />
          <span className="sr-only">{accent.label}</span>
        </span>

        {task.description && (
          <span className="mt-1 line-clamp-2 block text-sm text-text-muted">
            {task.description}
          </span>
        )}

        <span className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-text-muted">
            {task.dueDate ? `Due ${task.dueDate}` : 'No due date'}
          </span>
          <Avatar name={task.assignee} />
          <span className="sr-only">Assigned to {task.assignee}</span>
        </span>
      </span>
    </button>
  );
}
