import { DUE_FILL, TYPE_ACCENT } from '../constants';
import { dueBadge } from '../dueState';
import Avatar from './Avatar';
import TypeIcon from './TypeIcon';
import type { Task } from '../types';

// Flat, 1px border, no shadow — DESIGN.md §4. The type accent is a stripe child
// rather than a border utility so it cannot fight the card's 1px gray border.
//
// The card is a <div>, not a <button>: it now holds two actions, and a Copy
// button nested inside an outer button is invalid HTML and unreachable by
// keyboard. Instead the title is the button and its ::after is stretched over
// the whole card, so clicking anywhere still opens the task (8.B) while Copy
// stays a separate, separately-focusable control above it.
export default function TaskCard({
  task,
  onOpen,
  onCopy,
}: {
  task: Task;
  onOpen: (opener: HTMLElement) => void;
  onCopy: () => void;
}) {
  const accent = TYPE_ACCENT[task.type];
  const due = dueBadge(task);

  return (
    <div className="relative flex overflow-hidden rounded-lg border border-gray-200 bg-surface-card hover:border-brand-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary">
      <span className={`w-1 shrink-0 ${accent.stripe}`} aria-hidden="true" />

      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-medium text-text-primary">
            <button
              type="button"
              onClick={(event) => onOpen(event.currentTarget)}
              className="text-left after:absolute after:inset-0 focus:outline-none"
            >
              {task.title}
            </button>
          </h3>
          {/* Icon + text, so the type is never conveyed by colour alone (NFR 3.B). */}
          <TypeIcon type={task.type} className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent.text}`} />
          <span className="sr-only">{accent.label}</span>
        </div>

        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm text-text-muted">{task.description}</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {/* The urgency is in the words as much as the colour (NFR 3.B). */}
          {due.state === 'none' ? (
            <span className="text-xs text-text-muted">{due.label}</span>
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium text-text-primary ${DUE_FILL[due.state]}`}
            >
              {due.label}
            </span>
          )}
          <Avatar name={task.assignee} />
          <span className="sr-only">Assigned to {task.assignee}</span>
        </div>

        {/* relative z-10 lifts it above the title button's stretched ::after. */}
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy Context for ${task.title}`}
          className="relative z-10 mt-3 w-full rounded-full bg-surface-page px-3 py-1.5 text-xs font-medium text-text-primary hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Copy Context
        </button>
      </div>
    </div>
  );
}
