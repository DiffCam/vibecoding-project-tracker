import { DUE_PILL, TYPE_ACCENT } from '../constants';
import { dueBadge } from '../dueState';
import Avatar from './Avatar';
import { TagChip } from './TagsDialog';
import TypeIcon from './TypeIcon';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../types';

// Flat, 1px border, no shadow — DESIGN.md §4. The type accent is a stripe child
// rather than a border utility so it cannot fight the card's 1px gray border.
//
// The card is a <div>, not a <button>: it now holds two actions, and a Copy
// button nested inside an outer button is invalid HTML and unreachable by
// keyboard. Instead the title is the button and its ::after is stretched over
// the whole card, so clicking anywhere still opens the task (8.B) while Copy
// stays a separate, separately-focusable control above it.
// Two keyboard states, deliberately different shapes so they are never confused:
// a dashed outline means "the cursor is here", solid + lifted means "in hand".
// Driven by React state rather than :focus-visible, which only matches when the
// browser thinks the last interaction was a keypress — click anywhere first and
// a programmatic focus() shows no ring at all.
const SELECTION = {
  highlighted: 'outline-2 outline-dashed outline-offset-2 outline-brand-primary',
  // The lift is the one place DESIGN.md's no-shadow rule is broken, and only
  // while a card is actually in the air.
  grabbed:
    'z-10 -translate-y-1 rotate-[-0.75deg] shadow-xl outline-2 outline-offset-2 outline-brand-primary',
} as const;

export default function TaskCard({
  task,
  onOpen,
  onCopy,
  onHighlight,
  onPointerDown,
  tagColors,
  selection,
  isDragging = false,
  isOverlay = false,
}: {
  task: Task;
  onOpen: (opener: HTMLElement) => void;
  onCopy: () => void;
  onHighlight: (id: string | null) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  /** Resolved tag colours, so a chip looks the same everywhere it appears. */
  tagColors: Record<string, string>;
  selection: 'highlighted' | 'grabbed' | null;
  /** The real card, left in place as an invisible spacer while its overlay flies. */
  isDragging?: boolean;
  /** The copy under the cursor — already lifted, so no hover or selection state. */
  isOverlay?: boolean;
}) {
  const accent = TYPE_ACCENT[task.type];
  const due = dueBadge(task);

  return (
    <div
      onPointerDown={onPointerDown}
      className={`relative flex touch-none select-none overflow-hidden rounded-lg border border-line bg-surface-card ${
        isOverlay ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:border-brand-primary'
      } ${isDragging ? 'invisible' : ''} ${selection ? SELECTION[selection] : ''}`}
    >
      <span className={`w-1 shrink-0 ${accent.stripe}`} aria-hidden="true" />

      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-medium text-text-primary">
            <button
              type="button"
              data-card-id={task.id} // the board's arrow-key handler keys off this
              onClick={(event) => onOpen(event.currentTarget)}
              // Focus is the single source of truth for the highlight, so Tab,
              // the ⌘ tap and the modal's focus-return all light the same card.
              onFocus={() => onHighlight(task.id)}
              onBlur={() => onHighlight(null)}
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

        {task.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <TagChip key={tag} tag={tag} colors={tagColors} />
            ))}
          </div>
        )}

        {/* One footer row — due, copy, owner — over a rule, which is the
            strongest single cue that a card has a body and a footer rather
            than being one undifferentiated block. Wraps rather than
            overflowing when a long "Overdue · date" leaves no room. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2">
          {/* The urgency is in the words as much as the colour (NFR 3.B). */}
          {due.state === 'none' ? (
            <span className="text-xs text-text-muted">{due.label}</span>
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${DUE_PILL[due.state]}`}
            >
              {due.label}
            </span>
          )}

          {/* relative z-10 lifts it above the title button's stretched ::after. */}
          <button
            type="button"
            onClick={onCopy}
            data-no-drag
            aria-label={`Copy Context for ${task.title}`}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            {/* Lucide's copy glyph, hand-rolled to stay dependency-free like TypeIcon. */}
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="14" height="14" rx="2" />
              <path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2" />
            </svg>
            Copy Context
          </button>

          <span className="ml-auto flex items-center">
            <Avatar name={task.assignee} />
          </span>
          <span className="sr-only">Assigned to {task.assignee}</span>
        </div>
      </div>
    </div>
  );
}
