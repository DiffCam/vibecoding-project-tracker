import { DUE_PILL, TYPE_ACCENT } from '../constants';
import { dueCountdown, dueState } from '../dueState';
import Avatar from './Avatar';
import Icon from './Icon';
import Logo from './Logo';
import { TagChip } from './TagsDialog';
import TypeIcon from './TypeIcon';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../types';

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

/**
 * The card is a <div>, not a <button>: it holds several actions, and a button
 * nested inside an outer button is invalid HTML and unreachable by keyboard.
 * The title is the button and its ::after is stretched over the whole card, so
 * clicking anywhere still opens the task (8.B) while the other controls stay
 * separately focusable above it.
 *
 * The left rail does the work the old type stripe did and more: a type square
 * on top, then the time left until due, coloured by how close that is. Filled
 * rather than coloured text, because #34C759 on the card surface is 2.04:1 —
 * these colours only clear AA as a background.
 */
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
  const state = dueState(task);
  const countdown = dueCountdown(task);

  return (
    <div
      onPointerDown={onPointerDown}
      className={`relative flex touch-none select-none overflow-hidden rounded-lg border border-line bg-surface-card ${
        isOverlay ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:border-brand-primary'
      } ${isDragging ? 'invisible' : ''} ${selection ? SELECTION[selection] : ''}`}
    >
      {/* Flush to the card's edge with no padding or gap — the card's own
          overflow-hidden clips them to its rounded corners. */}
      <div className="flex w-7 shrink-0 flex-col">
        <span
          aria-hidden="true"
          className={`flex h-7 shrink-0 items-center justify-center ${accent.fill}`}
        >
          <TypeIcon type={task.type} className="h-4 w-4 text-white" />
        </span>

        {task.status === 'done' ? (
          // Done has no countdown left to run, so the rail says so with the
          // wordmark's own checkmark on a neutral bar.
          <span
            aria-hidden="true"
            className="flex flex-1 items-center justify-center bg-text-muted py-1.5 text-surface-card"
          >
            <Logo className="h-4 w-4" />
          </span>
        ) : (
          countdown &&
          state !== 'none' && (
            // rotate-180 on top of vertical-rl makes it read bottom-to-top.
            // leading-none keeps the glyph box tight, which is what sets the
            // rail's width. Filled rather than coloured text: these hues only
            // clear AA as a background.
            <span
              aria-hidden="true"
              className={`flex flex-1 rotate-180 items-center justify-center py-1 text-xs font-medium leading-none [writing-mode:vertical-rl] ${DUE_PILL[state]}`}
            >
              {countdown}
            </span>
          )
        )}
      </div>

      <div className="min-w-0 flex-1 p-2">
        <div className="flex items-start gap-1.5">
          <h3 className="min-w-0 flex-1 text-sm font-medium text-text-primary">
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

          {/* relative z-10 lifts it above the title button's stretched ::after. */}
          <button
            type="button"
            onClick={onCopy}
            data-no-drag
            aria-label={`Copy Context for ${task.title}`}
            title="Copy as prompt context"
            className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <Icon name="copy" className="h-3 w-3 shrink-0" />
            Context
          </button>

          <Avatar name={task.assignee} />
        </div>

        {/* The rail is decorative, so its meaning is said here (NFR 3.B). */}
        <span className="sr-only">
          {accent.label}
          {task.status === 'done'
            ? ', done'
            : countdown
              ? `, ${state === 'overdue' ? 'overdue by' : 'due in'} ${countdown}`
              : ''}
          , assigned to {task.assignee}
        </span>

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
      </div>
    </div>
  );
}
