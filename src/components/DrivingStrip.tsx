import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import CollapsibleSection from './CollapsibleSection';
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
  onNewTask,
}: {
  tasks: Task[];
  team: string[];
  onOpenTask: (task: Task, opener: HTMLElement | null) => void;
  onNewTask: (assignee: string, opener: HTMLElement) => void;
}) {
  const [openMember, setOpenMember] = useState<string | null>(null);
  // The pill that opened the dialog, so focus returns to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  const activeTotal = tasks.filter(
    (task) => task.status !== 'done' && team.includes(task.assignee)
  ).length;

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
    <CollapsibleSection
      id="driving"
      title="Driving"
      meta={`${activeTotal} active`}
    >

      <div className="relative">
        {/* The team is editable, so this has to survive an arbitrary number of
            members: scroll sideways rather than squeezing every chip thinner.
            The edge buttons are what make that operable by keyboard and by
            mouse without a horizontal wheel. */}
        <ul
          ref={scrollerRef}
          onScroll={syncEdges}
          aria-label="Team members and what they are driving"
          // Scrollbar hidden: the fade and the edge buttons already say there
          // is more, so the bar is noise. pb-2 stays — overflow-x:auto also
          // clips vertically, and without it the chips' focus rings get cut.
          className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {team.map((member) => {
            const active = tasks.filter(
              (task) => task.assignee === member && task.status !== 'done'
            );
            const hidden = active.length - VISIBLE;

            return (
              <li
                key={member}
                // The header tone: in dark that reads recessed, in light
                // raised. Either way it is the same material as the chrome.
                className="w-64 shrink-0 rounded-lg bg-surface-chrome p-3"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={member} />
                  <span className="truncate text-sm font-medium text-text-primary">{member}</span>
                  <span className="ml-auto font-mono text-xs text-text-muted">{active.length}</span>
                  <button
                    type="button"
                    onClick={(event) => onNewTask(member, event.currentTarget)}
                    aria-label={`Add task for ${member}`}
                    className="shrink-0 rounded-full p-1 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                {active.length === 0 ? (
                  <p className="mt-2 text-xs text-text-muted">Nothing active — enjoy it.</p>
                ) : (
                  <>
                    {/* Clickable in their own right — with two or fewer tasks
                        there is no "+N more" pill, so plain text would leave
                        the chip with no way into a task at all. */}
                    <ul className="mt-2 space-y-1">
                      {active.slice(0, VISIBLE).map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={(event) => onOpenTask(task, event.currentTarget)}
                            className="block w-full truncate rounded text-left text-xs text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                          >
                            {task.title}
                          </button>
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
    </CollapsibleSection>
  );
}
