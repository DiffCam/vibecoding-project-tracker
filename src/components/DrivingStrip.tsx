import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import MemberTasksDialog from './MemberTasksDialog';
import type { Task } from '../types';

// How many task titles a chip shows before the rest go behind "+N more".
// Two keeps every chip the same height, so the board below never shifts.
const VISIBLE = 2;

const CHEVRON = { left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6' };

/** Fade plus a scroll button, shown only on an end that actually has more past it. */
function ScrollEdge({ side, onScroll }: { side: 'left' | 'right'; onScroll: () => void }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-2 top-0 flex w-16 items-center ${
        side === 'left'
          ? 'left-0 justify-start bg-gradient-to-r'
          : 'right-0 justify-end bg-gradient-to-l'
      } from-surface-page`}
    >
      <button
        type="button"
        onClick={onScroll}
        aria-label={`Scroll team list ${side}`}
        className="pointer-events-auto rounded-full border border-line bg-surface-card p-1 text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={CHEVRON[side]} />
        </svg>
      </button>
    </div>
  );
}

// REQUIREMENTS 4.D — who is holding what right now. "Active" is everything that
// is not Done; a finished task is no longer being driven.
export default function DrivingStrip({
  tasks,
  team,
  onOpenTask,
}: {
  tasks: Task[];
  team: string[];
  onOpenTask: (task: Task, opener: HTMLElement | null) => void;
}) {
  const [openMember, setOpenMember] = useState<string | null>(null);
  // The pill that opened the dialog, so focus returns to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  const scrollerRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  function syncEdges() {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px of slack: fractional scroll positions never land exactly on the end.
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }

  // Overflow depends on the container's width as much as the team's size, so
  // watch for resizes rather than only recomputing when members change.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncEdges();
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [team.length]);

  function scrollBy(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * 280, behavior: 'smooth' });
  }

  return (
    <section aria-labelledby="driving-heading" className="mb-6">
      <h2 id="driving-heading" className="mb-3 text-base font-semibold uppercase text-text-primary">
        Driving
      </h2>

      <div className="relative">
        {/* The team is editable, so this has to survive an arbitrary number of
            members: scroll sideways rather than squeezing every chip thinner.
            The edge buttons are what make that operable by keyboard and by
            mouse without a horizontal wheel. */}
        <ul
          ref={scrollerRef}
          onScroll={syncEdges}
          aria-label="Team members and what they are driving"
          className="flex gap-4 overflow-x-auto pb-2"
        >
          {team.map((member) => {
            const active = tasks.filter(
              (task) => task.assignee === member && task.status !== 'done'
            );
            const hidden = active.length - VISIBLE;

            return (
              <li
                key={member}
                className="w-64 shrink-0 rounded-lg border border-line bg-surface-card p-3"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={member} />
                  <span className="truncate text-sm font-medium text-text-primary">{member}</span>
                  <span className="ml-auto text-xs text-text-muted">{active.length}</span>
                </div>

                {active.length === 0 ? (
                  <p className="mt-2 text-xs text-text-muted">Nothing active — enjoy it.</p>
                ) : (
                  <>
                    <ul className="mt-2 space-y-1">
                      {active.slice(0, VISIBLE).map((task) => (
                        <li key={task.id} className="truncate text-xs text-text-muted">
                          {task.title}
                        </li>
                      ))}
                    </ul>

                    {hidden > 0 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          openerRef.current = event.currentTarget;
                          setOpenMember(member);
                        }}
                        className="mt-2 rounded-full bg-surface-page px-2.5 py-1 text-xs font-medium text-text-primary hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        +{hidden} more
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {edges.left && <ScrollEdge side="left" onScroll={() => scrollBy(-1)} />}
        {edges.right && <ScrollEdge side="right" onScroll={() => scrollBy(1)} />}
      </div>

      {openMember !== null && (
        <MemberTasksDialog
          member={openMember}
          tasks={tasks.filter(
            (task) => task.assignee === openMember && task.status !== 'done'
          )}
          onOpenTask={(task) => {
            // Hand the pill up as the opener, not the row that was clicked —
            // that row unmounts with this dialog, and focus cannot return to a
            // node that no longer exists.
            setOpenMember(null);
            onOpenTask(task, openerRef.current);
          }}
          onClose={() => {
            setOpenMember(null);
            openerRef.current?.focus();
          }}
        />
      )}
    </section>
  );
}
