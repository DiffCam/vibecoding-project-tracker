import { useRef } from 'react';
import Icon from './Icon';
import ScrollEdge, { useScrollEdges } from './ScrollEdge';
import { sprintEnd, sprintNumbers, sprintsForMilestone } from '../sprints';
import type { Milestone, Sprint } from '../types';

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
  activeMilestone,
  activeSprint,
  onSelect,
  onAdd,
  onEdit,
}: {
  sprints: Sprint[];
  milestones: Milestone[];
  activeMilestone: string | null;
  activeSprint: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (sprint: Sprint) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { edges, sync } = useScrollEdges(scrollerRef, [sprints.length, activeMilestone]);

  const numbers = sprintNumbers(sprints);
  const shown = sprintsForMilestone(sprints, activeMilestone);

  const milestoneName = (id: string | null) =>
    id === null ? 'every milestone' : (milestones.find((m) => m.id === id)?.name ?? 'a milestone');

  return (
    <div className="relative flex h-9 items-center border-b border-surface-page bg-surface-sunken">
      <div
        ref={scrollerRef}
        onScroll={sync}
        className="flex flex-1 items-center gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <span className="shrink-0 font-mono text-xs text-text-muted">Sprints</span>

        {shown.length === 0 && (
          <span className="shrink-0 text-xs text-text-muted">none yet</span>
        )}

        {shown.map((sprint) => {
          const active = sprint.id === activeSprint;
          const label = `Sprint ${numbers[sprint.id]}`;
          const range = `${sprint.startDate} → ${sprintEnd(sprint)}`;

          return (
            // One pill, two controls, divided by a rule that runs its full
            // height — so the edit affordance reads as part of the sprint
            // rather than a separate button beside it.
            <span
              key={sprint.id}
              className={`flex h-6 shrink-0 items-stretch overflow-hidden rounded-full text-xs ${
                active
                  ? 'bg-text-primary text-surface-card'
                  : 'bg-surface-page text-text-primary'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(active ? null : sprint.id)}
                aria-pressed={active}
                title={`${range} · ${milestoneName(sprint.milestoneId)}`}
                className="px-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
              >
                {label}
              </button>

              <span
                aria-hidden="true"
                className={`w-px ${active ? 'bg-surface-card/40' : 'bg-line'}`}
              />

              <button
                type="button"
                onClick={() => onEdit(sprint)}
                aria-label={`Edit ${label}`}
                title={`Edit ${label}`}
                className="flex items-center px-1.5 opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
              >
                <Icon name="pencil" className="h-3 w-3" />
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
        aria-label={`Add a sprint to ${milestoneName(activeMilestone)}`}
        title={`Add a sprint to ${milestoneName(activeMilestone)}`}
        className="relative z-10 mr-2 shrink-0 rounded-full p-1 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}
