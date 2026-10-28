import { useEffect, useRef, useState } from 'react';
import Markdown from './Markdown';
import Segmented from './Segmented';

/**
 * Asked for when a task reaches Done.
 *
 * The moment work finishes is the only moment anyone remembers what
 * actually happened, so this is the one place worth interrupting. It can
 * still be waved away — an outcome nobody has is not worth inventing — but
 * dismissing an empty one asks twice, because the usual reason for an empty
 * box is that the dialog arrived before the thought did.
 */
export default function OutcomeDialog({
  title,
  outcome,
  markdown,
  onSave,
  onDismiss,
}: {
  /** The task's title, so the dialog says what it is asking about. */
  title: string;
  outcome: string;
  markdown: boolean;
  onSave: (outcome: string, markdown: boolean) => void;
  /** Closes without recording anything. */
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(outcome);
  const [format, setFormat] = useState<'plain' | 'markdown'>(markdown ? 'markdown' : 'plain');
  /** Set by the first press of Dismiss on an empty box. */
  const [sure, setSure] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const filled = draft.trim().length > 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="outcome-title"
      // Escape is the browser's for a dialog, and it means the same as
      // Dismiss — but it skips the are-you-sure, which is the point of a
      // key you press to get out of things.
      onClose={onDismiss}
      className={`m-auto max-h-[85vh] w-full overflow-hidden rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm ${
        format === 'markdown' ? 'max-w-3xl' : 'max-w-lg'
      }`}
    >
      <h2 id="outcome-title" className="text-base font-semibold text-text-primary">
        What came of it?
      </h2>
      <p className="mt-1 truncate text-sm text-text-muted">
        {title || 'Untitled task'} is done.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="text-xs text-text-muted" htmlFor="outcome-body">
          Outcome notes <span className="text-text-muted">· optional</span>
        </label>
        <Segmented
          label="How to read the outcome notes"
          options={[
            ['plain', 'Plain'],
            ['markdown', 'Markdown'],
          ]}
          value={format}
          onChange={setFormat}
        />
      </div>

      {/* The renderer appears beside the box rather than under it: the two
          are the same text and reading them one above the other means
          scrolling between a line and its own output. */}
      <div
        className={`mt-2 grid gap-3 ${format === 'markdown' ? 'md:grid-cols-2' : 'grid-cols-1'}`}
      >
        <textarea
          id="outcome-body"
          autoFocus
          value={draft}
          rows={8}
          placeholder={
            'What was built or fixed, and how.\n' +
            'Anything surprising, and what it cost.\n' +
            'What the next person should know.'
          }
          onChange={(event) => {
            setDraft(event.target.value);
            // Typing answers the question the confirm was asking.
            setSure(false);
          }}
          className={`w-full resize-none rounded-lg bg-surface-page px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary ${
            format === 'markdown' ? 'font-mono' : ''
          }`}
        />

        {format === 'markdown' && (
          <div className="min-w-0 overflow-y-auto rounded-lg bg-surface-page px-3 py-2">
            {draft.trim() ? (
              <Markdown>{draft}</Markdown>
            ) : (
              <p className="text-sm text-text-muted">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      {sure && (
        <p role="alert" className="mt-3 text-xs text-text-primary">
          Nothing will be recorded against this task. Finish without notes?
        </p>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        {/* One button, three readings: save what is there, wave away what is
            not, and confirm that you meant to. A separate Cancel would be a
            third way to leave a dialog that already has two. */}
        {filled ? (
          <button
            type="button"
            onClick={() => onSave(draft.trim(), format === 'markdown')}
            className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Save
          </button>
        ) : (
          <button
            type="button"
            onClick={() => (sure ? onDismiss() : setSure(true))}
            className={`rounded-lg px-5 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              sure
                ? 'border border-danger text-danger hover:bg-danger/10'
                : 'bg-brand-primary text-white hover:opacity-80'
            }`}
          >
            {sure ? 'Yes, finish without notes' : 'Dismiss'}
          </button>
        )}
      </div>
    </dialog>
  );
}
