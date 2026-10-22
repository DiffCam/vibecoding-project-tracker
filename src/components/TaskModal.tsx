import { useEffect, useRef, useState } from 'react';
import { AI_TOOLS, CONTEXT_TEMPLATE, STAGES, TYPE_ACCENT } from '../constants';
import { relativeTime } from '../relativeTime';
import TypeIcon from './TypeIcon';
import { colorFor, TAG_INK } from '../tagColor';
import { dictatingSprint, orderSprints, sprintEnd, sprintNumbers } from '../sprints';
import type { AITool, Milestone, Sprint, Task, TaskStatus, TaskType, TeamMember } from '../types';

// Native <dialog> + showModal() so the focus trap, Escape-to-close, inert
// background and backdrop all come from the platform instead of our code.

const FIELD =
  'w-full rounded-lg border border-line bg-surface-card px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary';
const LABEL = 'block text-xs text-text-muted mb-1';

function blankTask(team: TeamMember[], defaults: NewTaskDefaults): Task {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    type: 'feature',
    status: defaults.status ?? 'todo',
    assignee: defaults.assignee ?? team[0]?.name ?? '',
    dueDate: null,
    createdDate: new Date().toISOString().slice(0, 10), // REQUIREMENTS 2.D
    context: CONTEXT_TEMPLATE, // REQUIREMENTS 5.B
    contextTool: null,
    contextUpdatedAt: null,
    milestoneId: defaults.milestoneId ?? null,
    tags: [],
    sprintId: defaults.sprintId ?? null,
  };
}

export type NewTaskDefaults = {
  status?: TaskStatus;
  assignee?: string;
  milestoneId?: string | null;
  sprintId?: string | null;
};

export default function TaskModal({
  task,
  team,
  milestones,
  sprints,
  allTags,
  tagColors,
  defaults,
  onSave,
  onDelete,
  onClose,
}: {
  task: Task | null; // null = create mode
  team: TeamMember[];
  milestones: Milestone[];
  sprints: Sprint[];
  allTags: string[];
  tagColors: Record<string, string>;
  /** Pre-selections when creating: the lane or the teammate you came from. */
  defaults: NewTaskDefaults;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Task>(() => task ?? blankTask(team, defaults));
  const dialogRef = useRef<HTMLDialogElement>(null);

  // What the context started as, so saving only re-stamps it when it actually
  // changed (5.D). Derived from props — blankTask() always seeds the template.
  const originalContext = task ? task.context : CONTEXT_TEMPLATE;
  const updatedHint = form.contextUpdatedAt && relativeTime(form.contextUpdatedAt);

  const numbers = sprintNumbers(sprints);
  const milestoneOf = (id: string | null) =>
    id === null ? 'no milestone' : (milestones.find((one) => one.id === id)?.name ?? 'a milestone');

  // Every sprint, not just this milestone's: picking one is how a task changes
  // milestone, so filtering by the milestone would make that unreachable.
  const sprintChoices = orderSprints(sprints);

  // A sprint filed under a milestone decides this task's, so the field shows
  // that and stops being editable — two editable fields answering the same
  // question is the confusing case. `form.milestoneId` is left alone
  // underneath, so it returns the moment the sprint does not decide any more.
  const lockedBy = dictatingSprint(form, sprints);
  const lockNote = lockedBy
    ? `Set by Sprint ${numbers[lockedBy.id]}, which is filed under this milestone. Change Sprint to Unscheduled to pick a milestone yourself; the one saved on this task comes back.`
    : undefined;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-modal-title"
      onClose={onClose}
      className="m-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(
            form.context === originalContext
              ? form
              : { ...form, contextUpdatedAt: new Date().toISOString() } // 5.D
          );
        }}
      >
        {/* Same accent as the card, live-updating with the Type select (3.A). */}
        <h2
          id="task-modal-title"
          className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary"
        >
          {/* The same filled square the card uses. These hues are picked for a
              white glyph on them, so they cannot double as text colours. */}
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${TYPE_ACCENT[form.type].fill}`}
          >
            <TypeIcon type={form.type} className="h-4 w-4 text-white" />
          </span>
          {task ? 'Edit Task' : 'New Task'}
          <span className="text-sm font-normal text-text-muted">
            · {TYPE_ACCENT[form.type].label}
          </span>
        </h2>

        <div className="space-y-3">
          <div>
            <label className={LABEL} htmlFor="task-title">
              Title
            </label>
            <input
              id="task-title"
              className={FIELD}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              className={FIELD}
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="task-type">
                Type
              </label>
              <select
                id="task-type"
                className={FIELD}
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as TaskType })
                }
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
              </select>
            </div>

            <div>
              <label className={LABEL} htmlFor="task-status">
                Status
              </label>
              <select
                id="task-status"
                className={FIELD}
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as TaskStatus })
                }
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL} htmlFor="task-assignee">
                Assignee
              </label>
              <select
                id="task-assignee"
                className={FIELD}
                value={form.assignee}
                onChange={(event) => setForm({ ...form, assignee: event.target.value })}
              >
                {/* An assignee no longer on the team (hand-edited storage, or
                    data from an older roster) would otherwise render as blank
                    and be silently rewritten on save. Show the truth instead. */}
                {!team.some((member) => member.name === form.assignee) && (
                  <option value={form.assignee}>{form.assignee} (not on the team)</option>
                )}
                {team.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`${LABEL} flex items-center gap-1`} htmlFor="task-milestone">
                Milestone
                {lockNote && (
                  <span
                    role="img"
                    aria-label={lockNote}
                    title={lockNote}
                    className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-line font-mono text-[9px] leading-none"
                  >
                    ?
                  </span>
                )}
              </label>
              <select
                id="task-milestone"
                className={`${FIELD} disabled:cursor-not-allowed disabled:opacity-60`}
                // The derived milestone while a sprint decides it, the task's
                // own otherwise. Writes only ever touch the task's own.
                value={(lockedBy ? lockedBy.milestoneId : form.milestoneId) ?? ''}
                disabled={lockedBy !== undefined}
                onChange={(event) =>
                  setForm({ ...form, milestoneId: event.target.value || null })
                }
              >
                <option value="">None</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL} htmlFor="task-sprint">
                Sprint
              </label>
              <select
                id="task-sprint"
                className={FIELD}
                value={form.sprintId ?? ''}
                onChange={(event) =>
                  setForm({ ...form, sprintId: event.target.value || null })
                }
              >
                <option value="">Unscheduled</option>
                {/* Milestone shown on each option, because choosing one here
                    is what sets the task's milestone. */}
                {sprintChoices.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    Sprint {numbers[sprint.id]} · {milestoneOf(sprint.milestoneId)} ·{' '}
                    {sprint.startDate} → {sprintEnd(sprint)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL} htmlFor="task-due">
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                className={FIELD}
                value={form.dueDate ?? ''}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value || null })
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <label className={LABEL} htmlFor="task-context">
              Context (Markdown)
            </label>
            {updatedHint && (
              <span className="mb-1 text-xs text-text-muted">Last updated {updatedHint}</span>
            )}
          </div>
          {/* Monospace because it is Markdown being written for a model to read.
              Tailwind's default mono stack — no extra webfont to download. */}
          <textarea
            id="task-context"
            className={`${FIELD} font-mono`}
            rows={8}
            value={form.context}
            onChange={(event) => setForm({ ...form, context: event.target.value })}
          />
        </div>

        {allTags.length > 0 && (
          <div className="mt-3">
            <p className={LABEL}>Tags</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const on = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setForm({
                        ...form,
                        tags: on
                          ? form.tags.filter((existing) => existing !== tag)
                          : [...form.tags, tag],
                      })
                    }
                    // Selected tags wear their own colour, so the picker and
                    // the card agree on what each tag looks like.
                    style={on ? { backgroundColor: colorFor(tag, tagColors), color: TAG_INK } : undefined}
                    className={`rounded-full px-2.5 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                      on ? '' : 'bg-surface-page text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 w-48">
          <label className={LABEL} htmlFor="task-tool">
            AI Tool
          </label>
          <select
            id="task-tool"
            className={FIELD}
            value={form.contextTool ?? ''}
            onChange={(event) =>
              setForm({ ...form, contextTool: (event.target.value || null) as AITool })
            }
          >
            <option value="">Not recorded</option>
            {AI_TOOLS.map((tool) => (
              <option key={tool} value={tool}>
                {tool}
              </option>
            ))}
          </select>
        </div>


        <div className="mt-6 flex items-center justify-between">
          {task ? (
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-brand-accent hover:opacity-70"
              onClick={() => {
                if (window.confirm('Delete this task? This cannot be undone.')) {
                  onDelete(task.id);
                }
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:opacity-70"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
