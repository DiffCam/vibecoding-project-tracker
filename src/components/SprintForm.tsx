import { useEffect, useRef, useState } from 'react';
import { MIN_DAYS, sprintEnd } from '../sprints';
import type { Milestone, Sprint } from '../types';

const FIELD =
  'w-full rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary';
const LABEL = 'mb-1 block text-xs text-text-muted';

/** Today, in the local calendar — the default start for a new sprint. */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Add or edit a sprint. No name field: the number comes from where the sprint
 * falls in date order, so naming it by hand would only let the two disagree.
 *
 * The end date is shown but not editable — it is start + duration, and having
 * it on screen is what makes a duration in days checkable at a glance.
 */
export default function SprintForm({
  sprint,
  milestones,
  defaultMilestoneId,
  onSave,
  onDelete,
  onClose,
}: {
  sprint: Sprint | null; // null = create
  milestones: Milestone[];
  /** The tab you added from, pre-selected. */
  defaultMilestoneId: string | null;
  onSave: (sprint: Sprint) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<Sprint>(
    () =>
      sprint ?? {
        id: crypto.randomUUID(),
        milestoneId: defaultMilestoneId,
        startDate: today(),
        days: 14,
      }
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const days = Number.isFinite(form.days) ? form.days : MIN_DAYS;
  const valid = form.startDate !== '' && days >= MIN_DAYS;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="sprint-form-title"
      onClose={onClose}
      className="m-auto w-full max-w-sm rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSave({ ...form, days });
        }}
      >
        <h2 id="sprint-form-title" className="mb-4 text-base font-semibold text-text-primary">
          {sprint ? 'Edit sprint' : 'New sprint'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className={LABEL} htmlFor="sprint-milestone">
              Milestone
            </label>
            <select
              id="sprint-milestone"
              className={FIELD}
              value={form.milestoneId ?? ''}
              onChange={(event) =>
                setForm({ ...form, milestoneId: event.target.value || null })
              }
            >
              <option value="">None — shows under every tab</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="sprint-start">
                Start date
              </label>
              <input
                id="sprint-start"
                type="date"
                autoFocus
                required
                className={FIELD}
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="sprint-days">
                Duration (days)
              </label>
              <input
                id="sprint-days"
                type="number"
                min={MIN_DAYS}
                required
                className={FIELD}
                value={Number.isFinite(form.days) ? form.days : ''}
                onChange={(event) =>
                  setForm({ ...form, days: Number.parseInt(event.target.value, 10) })
                }
              />
            </div>
          </div>

          {/* Derived, read-only: the sanity check on the duration above. */}
          <p className="font-mono text-xs text-text-muted">
            {valid ? `Ends ${sprintEnd({ ...form, days })}` : 'Set a start date and duration'}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {sprint ? (
            <button
              type="button"
              onClick={() => onDelete(sprint.id)}
              className="rounded-lg px-3 py-2 text-sm text-brand-accent hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              Delete
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
