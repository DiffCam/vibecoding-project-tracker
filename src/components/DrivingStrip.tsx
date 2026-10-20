import { useRef, useState } from 'react';
import Avatar from './Avatar';
import MemberTasksDialog from './MemberTasksDialog';
import type { Task } from '../types';

// How many task titles a chip shows before the rest go behind "+N more".
// Two keeps every chip the same height, so the board below never shifts.
const VISIBLE = 2;

// REQUIREMENTS 4.D — who is holding what right now. "Active" is everything that
// is not Done; a finished task is no longer being driven.
export default function DrivingStrip({ tasks, team }: { tasks: Task[]; team: string[] }) {
  const [openMember, setOpenMember] = useState<string | null>(null);
  // The pill that opened the dialog, so focus returns to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <section aria-labelledby="driving-heading" className="mb-6">
      <h2 id="driving-heading" className="mb-3 text-base font-semibold uppercase text-text-primary">
        Driving
      </h2>

      {/* The team is editable, so this has to survive an arbitrary number of
          members: scroll sideways rather than squeezing every chip thinner.
          tabIndex makes the scroller reachable by keyboard, which a scrollable
          region needs when its contents are not all focusable. */}
      <ul
        tabIndex={0}
        aria-label="Team members and what they are driving"
        className="flex gap-4 overflow-x-auto pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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

      {openMember !== null && (
        <MemberTasksDialog
          member={openMember}
          tasks={tasks.filter(
            (task) => task.assignee === openMember && task.status !== 'done'
          )}
          onClose={() => {
            setOpenMember(null);
            openerRef.current?.focus();
          }}
        />
      )}
    </section>
  );
}
