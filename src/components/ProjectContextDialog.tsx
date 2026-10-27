import { useEffect, useRef } from 'react';

/**
 * The widest tier of context: what the project is, for everyone working on it.
 *
 * Saved as you type rather than behind a Save button. There is one field and
 * nothing to validate, so a draft state would only create a way to lose work
 * by closing the dialog.
 */
export default function ProjectContextDialog({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="project-context-title"
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="project-context-title"
            className="text-base font-semibold text-text-primary"
          >
            Project context
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            The background every task shares. Copying a task's context puts this
            first, then the agent's role, then the task itself.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-text-primary hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          Close
        </button>
      </div>

      <label className="sr-only" htmlFor="project-context">
        Project context
      </label>
      <textarea
        id="project-context"
        autoFocus
        value={value}
        rows={12}
        placeholder={
          'What is being built, and for whom.\n' +
          'The stack, and anything unusual about it.\n' +
          'Conventions worth following, and lines not to cross.'
        }
        onChange={(event) => onChange(event.target.value)}
        className="mt-4 w-full resize-y rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />

      <p className="mt-2 font-mono text-xs text-text-muted">
        {value.trim() ? `${value.trim().length} characters · saved` : 'Empty — nothing is added to copied context.'}
      </p>
    </dialog>
  );
}
