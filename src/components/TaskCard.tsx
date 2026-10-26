import { useRef } from 'react';
import { DUE_PILL, TYPE_ACCENT } from '../constants';
import { dueCountdown, dueRail, dueState } from '../dueState';
import Avatar from './Avatar';
import Icon from './Icon';
import Logo from './Logo';
import { TagChip } from './TagsDialog';
import TypeIcon from './TypeIcon';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../types';

/**
 * How a card looks while a copy of it is elsewhere.
 *
 * `moving` vacates the slot — the card really is going somewhere else. `filing`
 * leaves a ghost instead, because assigning a sprint does not move the card;
 * only its badge changes. `landing` brings the ghost back as the copy collapses
 * into the pill.
 */
const LIFTED = {
  moving: 'opacity-0',
  filing: 'opacity-30',
  landing: 'anim-ghost-return',
} as const;

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
  sprint,
  lifted,
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
  /** The sprint this task sits in, if any — shown as a corner badge. */
  sprint?: { label: string; name: string; colour: string };
  /** Set while a copy of this card is in the air. Hidden with opacity rather
   *  than visibility: a `visibility: hidden` element cannot hold focus, so
   *  hiding a keyboard-carried card blurred it and the arrows stopped reaching
   *  the board's handler. */
  lifted?: keyof typeof LIFTED;
  /** The copy under the cursor — already lifted, so no hover or selection state. */
  isOverlay?: boolean;
}) {
  // The badge stays mounted with or without a sprint, so it can animate both
  // ways: React would unmount it on removal before an exit animation could
  // run, and a first-time assignment would mount it already full size. The ref
  // keeps the last sprint so the circle holds its colour and number while it
  // shrinks away, rather than going blank mid-exit.
  const lastSprint = useRef(sprint);
  if (sprint) lastSprint.current = sprint;
  const badge = sprint ?? lastSprint.current;

  const accent = TYPE_ACCENT[task.type];
  const state = dueState(task);
  const countdown = dueCountdown(task); // magnitude, for the spoken label
  const rail = dueRail(task); // signed, for the glance

  // `moving` means the card is genuinely somewhere else, so nothing about it
  // should show — its focus ring included. A ghost is still sitting here, so
  // its ring stays.
  const ring = lifted === 'moving' ? null : selection;

  return (
    // Two wrappers rather than one, because `opacity` dims an element's outline
    // along with its content: a focused ghost showed a 30% focus ring. The ring
    // and the lift go on separate layers so the ring stays solid.
    //
    // They are outside the card at all because the badge has to overhang its
    // overflow-hidden, which exists to clip the left rail to the rounded
    // corners. Keeping the transform out here too means the badge tilts along
    // with the card instead of staying flat on top of it, and rounded-lg keeps
    // the shadow and outline on the card's corners.
    <div className={`relative rounded-lg ${ring ? SELECTION[ring] : ''}`}>
    <div className={`relative rounded-lg ${lifted ? LIFTED[lifted] : ''}`}>
    <div
      onPointerDown={onPointerDown}
      className={`relative flex touch-none select-none overflow-hidden rounded-lg border border-line bg-surface-card ${
        isOverlay ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:border-brand-primary'
      }`}
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
              {rail}
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

    {/* Overhanging the corner like a notification bubble: it costs the card no
        layout, and sprint membership is a glance-level fact. A hair of
        elevation instead of a border — enough to read as stuck on top of the
        card without a ring around it — see .sprint-badge in index.css, which
        also carries the pop. Fixed w-5/h-5 keeps it a true circle rather than
        widening into an oval for two digits.
        role="img" so the abbreviation is announced in full. */}
    <span
      role={sprint ? 'img' : undefined}
      aria-label={sprint?.name}
      aria-hidden={sprint ? undefined : true}
      title={sprint?.name}
      style={{ backgroundColor: badge?.colour }}
      className={`sprint-badge pointer-events-none absolute -left-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-medium leading-none text-white ${
        sprint ? 'scale-100' : 'scale-0'
      }`}
    >
      {badge?.label}
    </span>
    </div>
    </div>
  );
}
