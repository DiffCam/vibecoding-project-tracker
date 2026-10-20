import { useEffect, useRef, useState } from 'react';
import { STAGES, TEAM, TYPE_ACCENT } from '../constants';
import TypeIcon from './TypeIcon';
import type { Task, TaskStatus, TaskType } from '../types';

// Native <dialog> + showModal() so the focus trap, Escape-to-close, inert
// background and backdrop all come from the platform instead of our code.

const FIELD =
  'w-full rounded-lg border border-gray-200 bg-surface-card px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary';
const LABEL = 'block text-xs text-text-muted mb-1';

function blankTask(): Task {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    type: 'feature',
    status: 'todo',
    assignee: TEAM[0],
    dueDate: null,
    createdDate: new Date().toISOString().slice(0, 10), // REQUIREMENTS 2.D
    context: '',
    contextTool: null,
    contextUpdatedAt: null,
  };
}

export default function TaskModal({
  task,
  onSave,
  onDelete,
  onClose,
}: {
  task: Task | null; // null = create mode
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  // The context fields are not edited here (M9 owns them) but they live on
  // `form`, so editing a task round-trips its briefing instead of wiping it.
  const [form, setForm] = useState<Task>(() => task ?? blankTask());
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-modal-title"
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-xl border border-gray-200 bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        {/* Same accent as the card, live-updating with the Type select (3.A). */}
        <h2
          id="task-modal-title"
          className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary"
        >
          <TypeIcon
            type={form.type}
            className={`h-4 w-4 shrink-0 ${TYPE_ACCENT[form.type].text}`}
          />
          {task ? 'Edit Task' : 'New Task'}
          <span className={`text-sm font-normal ${TYPE_ACCENT[form.type].text}`}>
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
                {TEAM.map((member) => (
                  <option key={member} value={member}>
                    {member}
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

        {/* TODO M9 task-context: Context textarea + AI Tool dropdown + "last updated" hint. */}

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
