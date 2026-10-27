import { useRef } from 'react';
import Icon from './Icon';
import ScrollEdge, { useScrollEdges } from './ScrollEdge';
import { shortDate, sprintEnd, sprintNumbers, sprintsForMilestone, UNSCHEDULED } from '../sprints';
import { accentInk, TAG_INK } from '../tagColor';
import type { DropTarget } from '../useCardDrag';
import type { Milestone, Sprint } from '../types';

// items-center, not items-stretch: a stretched child does not vertically
// centre its own text, which is what left the fixed pills sitting high.
// border-2 on every variant so the outlined and filled states are the same
// height.
/**
 * The "All" pill as a cursor position.
 *
 * It is deliberately not a drop target — nothing can be filed into "every
 * sprint" — so it has no `data-drop-sprint`. `data-pill` is the separate idea:
 * somewhere the keyboard cursor can rest. Sprint ids are UUIDs, so this
 * cannot collide with one.
 */
export const ALL_PILL = 'all';

const PILL =
  'flex h-6 shrink-0 items-center overflow-hidden rounded-full border-2 text-xs transition-colors';

// Aiming at a pill recolours its border and breaks it into dashes rather than
// ringing or growing it: the scroller sets overflow-x, which forces overflow-y
// to auto, so a ring or a scale would be clipped by the 36px row. Dashed to
// match a card's focus ring — one shape means "the cursor is here" everywhere
// on the board, and a solid blue hairline on its own reads as too quiet.
const AIMED = 'rgb(var(--brand-primary))';

/** The two fixed selections. Neither is a sprint, so neither takes a colour. */
function FixedPill({
  label,
  active,
  title,
  dropSprint,
  pill,
  targeted,
  held,
  onClick,
}: {
  label: string;
  active: boolean;
  title: string;
  /** The `data-drop-sprint` value, or absent to refuse drops — "All" is a
   *  filter, not a sprint, so a card cannot be dropped on it. */
  dropSprint?: string;
  /** This pill's `data-pill` value, for the cursor to find and measure. */
  pill: string;
  targeted?: boolean;
  /** Lifted out of the row and currently in hand, so shown as a ghost. */
  held?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      data-drop-sprint={dropSprint}
      data-pill={pill}
      // Border and fill kept apart so aiming can replace the border without an
      // !important fighting the state class next to it.
      className={`${PILL} justify-center px-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
        targeted ? 'border-dashed border-brand-primary' : active ? 'border-text-primary' : 'border-line'
      } ${active ? 'bg-text-primary text-surface-card' : 'bg-surface-card text-text-primary'} ${
        held ? 'opacity-30' : ''
      }`}
    >
      {label}
    </button>
  );
}

/**
 * A band of sprint pills across the top of the board.
 *
 * Names are positions, not stored values: inserting a sprint in the middle
 * renumbers the ones after it. Numbering is global, so a sprint keeps its name
 * when you switch milestone tabs — only which sprints are *shown* changes.
 */
export default function SprintsRow({
  sprints,
  milestones,
  colors,
  counts,
  dark,
  dropTarget,
  heldId,
  activeMilestone,
  activeSprint,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: {
  sprints: Sprint[];
  milestones: Milestone[];
  /** Resolved per-sprint colours, keyed by id. */
  colors: Record<string, string>;
  /** Tasks per sprint id, already narrowed by the search and the open tab, so
   *  each number is what clicking that pill shows. Absent means none. */
  counts: Record<string, number>;
  /** Which way to nudge an outlined chip's colour so it clears AA. */
  dark: boolean;
  /** Where a card currently in the air would land, so that pill can light up. */
  dropTarget?: DropTarget | null;
  /** The pill lifted out of the row, shown as a ghost in its place. `undefined`
   *  means nothing is held; `null` is the "No sprint" pill, which is held like
   *  any other and unassigns whatever it is dropped on. */
  heldId?: string | null;
  activeMilestone: string | null;
  /** null = All, UNSCHEDULED = tasks in no sprint, otherwise a sprint id. */
  activeSprint: string | null;
  /** A pill was activated: ALL_PILL, null for "No sprint", or a sprint id. */
  onToggle: (pill: string | null) => void;
  onAdd: () => void;
  onEdit: (sprint: Sprint) => void;
  onDelete: (sprint: Sprint) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { edges, sync } = useScrollEdges(scrollerRef, [sprints.length, activeMilestone]);

  const numbers = sprintNumbers(sprints);
  const shown = sprintsForMilestone(sprints, activeMilestone);

  const targeted = (id: string | null) =>
    dropTarget?.kind === 'sprint' && dropTarget.id === id;

  // null now means "filed under none", not "shown under all".
  const milestoneName = (id: string | null) =>
    id === null ? 'no milestone' : (milestones.find((m) => m.id === id)?.name ?? 'a milestone');

  // Adding from the All tab files the sprint under no milestone, which is then
  // the only tab it appears on — worth saying rather than "add to no milestone".
  const addLabel =
    activeMilestone === null
      ? 'Add a sprint, filed under no milestone'
      : `Add a sprint to ${milestoneName(activeMilestone)}`;

  return (
    <div className="relative flex h-9 items-center border-b border-surface-page bg-surface-sunken">
      {/* A pennant rather than a plain label: the point aims at the pills it
          introduces, the same device the lane wedges use for progression. */}
      <span
        className="flex h-full shrink-0 items-center bg-surface-sunken-alt pl-3 pr-4 font-mono text-xs text-text-muted"
        style={{ clipPath: 'polygon(0 0, calc(100% - 9px) 0, 100% 50%, calc(100% - 9px) 100%, 0 100%)' }}
      >
        Sprints
      </span>

      <div
        ref={scrollerRef}
        onScroll={sync}
        className="flex flex-1 items-center gap-1.5 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <FixedPill
          label="All"
          active={activeSprint === null}
          title="Every task, scheduled or not"
          pill={ALL_PILL}
          targeted={targeted(ALL_PILL)}
          onClick={() => onToggle(ALL_PILL)}
        />
        <FixedPill
          label="No sprint"
          active={activeSprint === UNSCHEDULED}
          title="Tasks not in any sprint"
          dropSprint=""
          pill=""
          targeted={targeted(null)}
          held={heldId === null}
          onClick={() => onToggle(null)}
        />

        {shown.map((sprint) => {
          const active = sprint.id === activeSprint;
          const label = `Sprint ${numbers[sprint.id]}`;
          const colour = colors[sprint.id];
          const ink = active ? TAG_INK : accentInk(colour, dark);
          const aimed = targeted(sprint.id);
          const count = counts[sprint.id] ?? 0;

          return (
            // One pill, two controls, divided by a rule running its full
            // height — so the second control reads as part of the sprint
            // rather than a button beside it. Edit while selected, delete
            // while not: you cannot pull the board out from under yourself.
            // Outlined while idle, filled once selected: the colour stays
            // scannable without a row of saturated chips competing for the
            // eye, and "filled" is the same signal the fixed pills use. The
            // border stays the fill colour when active so the pill does not
            // change size between states.
            <span
              key={sprint.id}
              data-drop-sprint={sprint.id}
              data-pill={sprint.id}
              style={{
                backgroundColor: active ? colour : undefined,
                borderColor: aimed ? AIMED : active ? colour : ink,
                color: ink,
              }}
              className={`${PILL} ${active ? '' : 'bg-transparent'} ${
                aimed ? 'border-dashed' : ''
              } ${heldId === sprint.id ? 'opacity-30' : ''}`}
            >
              <button
                type="button"
                onClick={() => onToggle(sprint.id)}
                aria-pressed={active}
                // The count is the one extra fact on the pill, so it is said
                // properly here rather than left as a bare digit to a reader.
                aria-label={`${label}, ${count} task${count === 1 ? '' : 's'}`}
                title={`${count} task${count === 1 ? '' : 's'} · ${shortDate(sprint.startDate)} → ${shortDate(sprintEnd(sprint))} · ${milestoneName(sprint.milestoneId)}`}
                className="px-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
              >
                {label}
                {/* currentColor at reduced opacity, so it sits under the label
                    in both the outlined and the filled state without a second
                    colour to pick. Shown at zero too — an empty sprint is
                    worth noticing, and a blank would read as missing. */}
                <span aria-hidden="true" className="ml-1 opacity-60">
                  · {count}
                </span>
              </button>

              {/* currentColor, so the rule matches whichever state the pill
                  is in without a second branch. */}
              <span aria-hidden="true" className="h-full w-px bg-current opacity-40" />

              <button
                type="button"
                onClick={() => (active ? onEdit(sprint) : onDelete(sprint))}
                aria-label={`${active ? 'Edit' : 'Delete'} ${label}`}
                title={`${active ? 'Edit' : 'Delete'} ${label}`}
                className="flex h-full items-center px-1.5 opacity-80 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
              >
                <Icon name={active ? 'pencil' : 'close'} className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>

      {edges.left && (
        <ScrollEdge
          side="left"
          size="sm"
          fade="from-surface-sunken"
          onScroll={() => scrollerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
        />
      )}
      {edges.right && (
        <ScrollEdge
          side="right"
          size="sm"
          fade="from-surface-sunken"
          onScroll={() => scrollerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
        />
      )}

      {/* Outside the scroller, so it stays reachable however long the list is. */}
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        title={addLabel}
        className="relative z-10 mr-2 shrink-0 rounded-full p-1 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}
