import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import CollapsibleSection from './CollapsibleSection';
import Icon from './Icon';
import MemberTasksDialog from './MemberTasksDialog';
import Switch from './Switch';
import { STAGES, STATUS_DOT } from '../constants';
import { byUrgency, dueState } from '../dueState';
import { githubUrl } from '../teamMember';
import { useLocalStorage } from '../useLocalStorage';
import type { Task, TeamMember } from '../types';

/**
 * Task pills shown on an expanded card before the rest go to the overview.
 * Two, because the "+N more" row below is always present: three rows total,
 * the same for everyone.
 */
const VISIBLE = 2;

const CHEVRON = { left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6' };

// Shared by the real pills and their invisible stand-ins, so the space a
// placeholder reserves is exactly the space a pill would occupy. Every variant
// carries `border`, so the 1px never changes the row height between them.
const PILL_BASE = 'flex w-full items-center gap-1.5 rounded-full border px-2 py-1 text-xs';

/** A hairline like the board's cards — in dark it does most of the separating. */
const PILL = `${PILL_BASE} border-line`;

/** Same metrics, no outline: for copy that is not a control. */
const PILL_QUIET = `${PILL_BASE} border-transparent`;

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
  memberColors,
}: {
  tasks: Task[];
  team: TeamMember[];
  onOpenTask: (task: Task, opener: HTMLElement | null) => void;
  onNewTask: (assignee: string, opener: HTMLElement) => void;
  /** Resolved per-teammate colours, keyed by name. */
  memberColors: Record<string, string>;
}) {
  const [openMember, setOpenMember] = useState<string | null>(null);
  // Whatever opened the dialog, so focus returns to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  /**
   * One switch for the whole row, not one per card. Per-card would give the
   * chips different heights and the row would start resizing again, which is
   * the thing the reserved placeholders exist to prevent.
   */
  const [detail, setDetail] = useLocalStorage<boolean>('vibetracker.drivingDetail', false);

  // One pass over the roster answers all three: how much work is in flight,
  // how many people are carrying it, and how many are not. Tasks assigned to
  // someone no longer on the team fall out of the total, as they did before.
  const load = team.map((member) => ({
    name: member.name,
    count: tasks.filter((task) => task.assignee === member.name && task.status !== 'done')
      .length,
  }));
  const activeTotal = load.reduce((total, member) => total + member.count, 0);
  const driving = load.filter((member) => member.count > 0).length;
  const free = team.length - driving;

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

  function openOverview(member: string, opener: HTMLElement) {
    openerRef.current = opener;
    setOpenMember(member);
  }

  return (
    <CollapsibleSection
      id="driving"
      title="Driving"
      action={
        // The same control as the theme switch, a size down — consistency is
        // the point. The label carries the meaning; the eye says which way.
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Icon name="list" className="h-3.5 w-3.5 shrink-0" />
            Tasks
          </span>
          <Switch
            size="sm"
            checked={detail}
            onChange={setDetail}
            label="Show task lists"
            title={detail ? 'Hide the task lists' : 'Show the task lists'}
            onIcon="eye"
            offIcon="eye-off"
          />
        </span>
      }
      meta={
        <span
          title={`${activeTotal} unfinished task${activeTotal === 1 ? '' : 's'}, carried by ${driving} of ${team.length} teammate${team.length === 1 ? '' : 's'}`}
        >
          {activeTotal} active · {driving} driving · {free} free
        </span>
      }
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
            // Soonest first, so the pills on show are the ones that matter.
            const active = tasks
              .filter((task) => task.assignee === member.name && task.status !== 'done')
              .sort(byUrgency);
            const overdue = active.filter((task) => dueState(task) === 'overdue').length;
            const split = {
              todo: active.filter((task) => task.status === 'todo').length,
              'in-progress': active.filter((task) => task.status === 'in-progress').length,
              review: active.filter((task) => task.status === 'review').length,
            };

            return (
              <li
                key={member.name}
                className="w-64 shrink-0 overflow-hidden rounded-lg bg-surface-chrome"
              >
                {/* Header: the chrome tone. Its ::after covers only this block,
                    so the pills below stay independently clickable. */}
                <div className="relative p-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={member.name} accent={memberColors[member.name]} />
                    <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                      <button
                        type="button"
                        onClick={(event) => openOverview(member.name, event.currentTarget)}
                        title={`Everything ${member.name} is driving`}
                        className="max-w-full truncate text-left after:absolute after:inset-0 focus:outline-none focus-visible:underline"
                      >
                        {member.name}
                      </button>
                    </h3>
                    {overdue > 0 && (
                      <span
                        title={`${overdue} overdue`}
                        className="shrink-0 rounded-full bg-due-overdue px-1.5 font-mono text-[10px] font-medium text-white"
                      >
                        {overdue}
                      </span>
                    )}
                    <span className="font-mono text-xs text-text-muted">{active.length}</span>
                    <button
                      type="button"
                      onClick={(event) => onNewTask(member.name, event.currentTarget)}
                      aria-label={`Add task for ${member.name}`}
                      className="relative z-10 shrink-0 rounded-full p-1 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    {member.github ? (
                      <a
                        href={githubUrl(member.github)}
                        target="_blank"
                        rel="noreferrer"
                        className="relative z-10 min-w-0 truncate font-mono text-[11px] text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        @{member.github}
                      </a>
                    ) : (
                      <span />
                    )}

                    {/* Always rendered, zeros included: an empty meta row made
                        the header shorter for idle members, which left a gap at
                        the bottom of their card. Dots match the lane titles,
                        which is the key. */}
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                        {STAGES.filter((stage) => stage.id !== 'done').map((stage) => (
                        <span
                          key={stage.id}
                          title={`${split[stage.id as keyof typeof split]} in ${stage.label}`}
                          className="flex items-center gap-1 font-mono text-[11px] text-text-muted"
                        >
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 rounded-full ${STATUS_DOT[stage.id]}`}
                          />
                          {split[stage.id as keyof typeof split]}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>

                {/* 0fr -> 1fr is the CSS-only way to animate to an unknown
                    height. A deliberate toggle is worth animating; the
                    involuntary resize this replaced was not. */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                    detail ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    {/* A second tone, so the list reads as a different surface
                        from the header above it. */}
                    <ul className="m-1.5 mt-0 space-y-1 rounded-md bg-surface-list p-2">
                      {Array.from({ length: VISIBLE }, (_, slot) => {
                        const task = active[slot];

                        // Stand-ins keep every card the same height, so one
                        // person finishing a task cannot resize the row.
                        if (!task) {
                          return (
                            <li key={`slot-${slot}`}>
                              {slot === 0 && active.length === 0 ? (
                                <p className={`${PILL_QUIET} text-text-muted`}>Nothing active.</p>
                              ) : (
                                <span aria-hidden="true" className={`${PILL} invisible`}>
                                  placeholder
                                </span>
                              )}
                            </li>
                          );
                        }

                        return (
                          <li key={task.id}>
                            <button
                              type="button"
                              tabIndex={detail ? 0 : -1}
                              onClick={(event) => onOpenTask(task, event.currentTarget)}
                              title={task.title}
                              className={`${PILL} bg-surface-pill text-left text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary`}
                            >
                              <span
                                aria-hidden="true"
                                className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`}
                              />
                              <span className="min-w-0 truncate">{task.title}</span>
                            </button>
                          </li>
                        );
                      })}

                      {/* Always a row, even with nothing hidden — conditional
                          rendering here made one card taller than the rest,
                          and a flex row stretches to its tallest child. */}
                      <li>
                        {active.length > VISIBLE ? (
                          <button
                            type="button"
                            tabIndex={detail ? 0 : -1}
                            onClick={(event) => openOverview(member.name, event.currentTarget)}
                            className={`${PILL_QUIET} justify-center text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary`}
                          >
                            +{active.length - VISIBLE} more
                          </button>
                        ) : (
                          <span aria-hidden="true" className={`${PILL_QUIET} invisible`}>
                            placeholder
                          </span>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
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
          // Everything they hold, done included — this is the full overview.
          tasks={tasks
            .filter((task) => task.assignee === openMember)
            .sort(byUrgency)}
          accent={memberColors[openMember]}
          onOpenTask={(task) => {
            // Hand the opener up, not the row that was clicked — that row
            // unmounts with this dialog, and focus cannot return to a node
            // that no longer exists.
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
