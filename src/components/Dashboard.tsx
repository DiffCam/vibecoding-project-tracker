import { useState } from 'react';
import { DUE_PILL, STATUS_DOT, STAGES } from '../constants';
import { byUrgency, dueBadge, dueState } from '../dueState';
import Icon from './Icon';
import TypeIcon from './TypeIcon';
import { TYPE_ACCENT } from '../constants';
import type { Project } from '../projects';
import type { Task } from '../types';

export type Assigned = { task: Task; project: Project };

/**
 * What is waiting for you, across every project.
 *
 * The one view a project page structurally cannot give you: a board is one
 * board by definition, and the reason to come here rather than straight to a
 * project is to find out which project needs you. So this is your work and
 * nothing else — no counts of other people's, no project summaries.
 */
export default function Dashboard({
  user,
  assigned,
  projects,
  onOpenProject,
  onOpenTask,
  onNewProject,
}: {
  user: string;
  /** Every unfinished task assigned to the user, with the project it is in. */
  assigned: Assigned[];
  projects: Project[];
  onOpenProject: (id: string) => void;
  onOpenTask: (projectId: string, taskId: string) => void;
  onNewProject: () => void;
}) {
  // Soonest first, the same order the Driving strip uses, so "what is next"
  // means the same thing in both places — and because the soonest date is
  // the most overdue one, the worst arrears lead the list for free.
  const sorted = [...assigned].sort((a, b) => byUrgency(a.task, b.task));

  const [expanded, setExpanded] = useState(false);
  /**
   * Three, unless there is more arrears than that.
   *
   * A dashboard that lists everything is a second board. Three is what fits
   * above the fold and what a person can act on — but hiding overdue work
   * behind a fold would be the one thing this view must not do, so the
   * count of what is buried is offered as a way in.
   */
  const CAP = 3;
  const overdue = sorted.filter(({ task }) => dueState(task) === 'overdue');
  const hiddenOverdue = Math.max(0, overdue.length - CAP);
  const shown = expanded ? sorted : sorted.slice(0, CAP);

  /** Counted across every project, which is the only place this adds up. */
  const soon = sorted.filter(({ task }) => dueState(task) === 'soon').length;
  const weight = sorted.reduce((sum, { task }) => sum + Math.max(1, task.weight || 1), 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-text-primary">
        {projects.length === 0 ? 'Nothing here yet' : `Hello, ${user}`}
      </h1>

      {projects.length === 0 ? (
        <>
          <p className="mt-2 text-sm text-text-muted">
            A project is a board: tasks, milestones, sprints and the team that works on them.
          </p>
          <button
            type="button"
            onClick={onNewProject}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <Icon name="plus" className="h-4 w-4 shrink-0" />
            New project
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-text-muted">
            {sorted.length === 0
              ? `Nothing assigned to you across ${projects.length} project${
                  projects.length === 1 ? '' : 's'
                }.`
              : `${sorted.length} task${sorted.length === 1 ? '' : 's'} waiting for you across ${
                  projects.length
                } project${projects.length === 1 ? '' : 's'}.`}
          </p>

          {/* Four figures, all about you and all across every project —
              which is the only place they add up. Each is a plain number
              with its label beneath; a dashboard of dials would be weight
              without information. */}
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ['Assigned', sorted.length, 'text-text-primary'],
              ['Overdue', overdue.length, overdue.length > 0 ? 'text-danger' : 'text-text-muted'],
              ['Due soon', soon, soon > 0 ? 'text-brand-ink' : 'text-text-muted'],
              ['Weight', weight, 'text-text-primary'],
            ] as const).map(([label, value, ink]) => (
              <div key={label} className="rounded-lg border border-line bg-surface-card px-3 py-2">
                <dd className={`text-2xl font-semibold leading-tight ${ink}`}>{value}</dd>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
                  {label}
                </dt>
              </div>
            ))}
          </dl>

          <section className="mt-6" aria-labelledby="my-tasks">
            <h2
              id="my-tasks"
              className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-muted"
            >
              My tasks
            </h2>

            {sorted.length === 0 ? (
              <p className="rounded-xl border border-dashed border-text-muted px-4 py-8 text-center text-sm text-text-muted">
                Nothing assigned to you. Open a project to pick something up.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {shown.map(({ task, project }) => {
                  const due = dueBadge(task);
                  const stage = STAGES.find((one) => one.id === task.status);

                  return (
                    <li key={`${project.id}-${task.id}`}>
                      <button
                        type="button"
                        onClick={() => onOpenTask(project.id, task.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface-card px-3 py-2 text-left hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                            TYPE_ACCENT[task.type].fill
                          }`}
                        >
                          <TypeIcon type={task.type} className="h-4 w-4 text-white" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-1.5">
                            <span className="shrink-0 font-mono text-xs text-text-muted">
                              #{task.key}
                            </span>
                            <span className="min-w-0 truncate text-sm text-text-primary">
                              {task.title || 'Untitled task'}
                            </span>
                          </span>
                          {/* Which project, because that is the whole point
                              of looking at this list rather than a board. */}
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-muted">
                            <span
                              aria-hidden="true"
                              className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`}
                            />
                            {stage?.label}
                            <span aria-hidden="true">·</span>
                            <span className="min-w-0 truncate">{project.name}</span>
                          </span>
                        </span>

                        {due.state !== 'none' && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              DUE_PILL[due.state]
                            }`}
                          >
                            {due.label}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Overdue work must never be the thing a fold hides, so the
                count of it is the affordance rather than a bare "show all".
                Collapsing again is offered once expanded. */}
            {!expanded && sorted.length > CAP && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <Icon name="down" className="h-3.5 w-3.5 shrink-0" />
                {hiddenOverdue > 0 ? (
                  <>
                    <span className="font-medium text-danger">+{hiddenOverdue} overdue</span>
                    <span className="text-text-muted">
                      · {sorted.length - CAP} more in total
                    </span>
                  </>
                ) : (
                  <span>+{sorted.length - CAP} more</span>
                )}
              </button>
            )}
            {expanded && sorted.length > CAP && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-text-muted hover:border-brand-primary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                Show the next {CAP} only
              </button>
            )}
          </section>

          <section className="mt-8" aria-labelledby="projects">
            <h2
              id="projects"
              className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-muted"
            >
              Projects
            </h2>
            <ul className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => onOpenProject(project.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <Icon name="brief" className="h-4 w-4 shrink-0" />
                    {project.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
