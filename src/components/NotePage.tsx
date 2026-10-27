import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';
import Picker from './Picker';
import PreviewPane from './PreviewPane';
import Segmented from './Segmented';
import { noteAt, noteChanged, recordNote } from '../agentNotes';
import { relativeTime } from '../relativeTime';
import type { AgentNote } from '../types';

/**
 * One of an agent's notes, on a page of its own.
 *
 * The same two-column shape as the context pages, with two deliberate
 * differences: a title, which versions alongside the body, and no Simple /
 * Custom toggle. A note is one piece of prose the agent wrote; splitting it
 * into named sections is a thing you do to a brief, not to a memory.
 */
export default function NotePage({
  note,
  tasks,
  onSave,
  onDelete,
  onClose,
  returnLabel,
}: {
  note: AgentNote;
  /** Every task, so the note can say which one it came out of. */
  tasks: { id: string; title: string }[];
  onSave: (next: AgentNote) => void;
  onDelete: () => void;
  onClose: () => void;
  returnLabel: string;
}) {
  const pageRef = useRef<HTMLElement>(null);

  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [taskId, setTaskId] = useState(note.taskId);
  const [rightPane, setRightPane] = useState<'preview' | 'history'>('preview');

  const [basedOn, setBasedOn] = useState(note.history.length - 1);
  const [pendingSave, setPendingSave] = useState<AgentNote | null>(null);
  const [saved, setSaved] = useState({ title: note.title, body: note.body, taskId: note.taskId });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirty = title !== saved.title || body !== saved.body || taskId !== saved.taskId;

  /** What a save would write. */
  function commit(): AgentNote {
    const changed = noteChanged(note.history, title, body);
    return {
      ...note,
      title,
      body,
      taskId,
      // The reference is not part of the text, so moving it alone is a save
      // without a version — there is nothing to read back.
      history: changed
        ? recordNote(note.history, basedOn, { at: new Date().toISOString(), title, body })
        : note.history,
    };
  }

  function persist(next: AgentNote) {
    onSave(next);
    setSaved({ title: next.title, body: next.body, taskId: next.taskId });
    setBasedOn(next.history.length - 1);
    setSavedAt(new Date().toISOString());
  }

  useEffect(() => {
    pageRef.current?.focus();
  }, []);

  const rendered = title.trim() ? `# ${title.trim()}\n\n${body}` : body;

  return (
    <section
      ref={pageRef}
      tabIndex={-1}
      aria-labelledby="context-page-title"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (document.querySelector('dialog[open]')) return;
        event.stopPropagation();
        onClose();
      }}
      className="flex min-h-0 w-full flex-1 flex-col focus:outline-none"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const next = commit();
          // Positional, not a length comparison: replacing one version with
          // one leaves the length unchanged, so saving from v2 of 3 would
          // destroy v3 silently.
          if (next.history !== note.history && basedOn < note.history.length - 1) {
            setPendingSave(next);
          } else {
            persist(next);
          }
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="editor-gutter flex min-h-0 flex-col overflow-y-auto py-8">
            <div className="grid shrink-0 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <div>
                <label className="mb-1 block text-xs text-text-muted" htmlFor="note-title">
                  Title
                </label>
                <input
                  id="note-title"
                  autoFocus
                  value={title}
                  placeholder="What this note is about"
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted" htmlFor="note-task">
                  From task <span className="text-text-muted">· optional</span>
                </label>
                <Picker
                  id="note-task"
                  value={taskId ?? ''}
                  onChange={(id) => setTaskId(id || null)}
                  choices={[
                    { value: '', label: 'No task', row: <span className="text-text-muted">No task</span> },
                    ...tasks.map((task) => ({
                      value: task.id,
                      label: task.title || 'Untitled task',
                      row: <span className="truncate">{task.title || 'Untitled task'}</span>,
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="mt-3 flex min-h-[20rem] flex-1 flex-col">
              <label className="mb-1 shrink-0 text-xs text-text-muted" htmlFor="note-body">
                Note (Markdown)
              </label>
              <textarea
                id="note-body"
                value={body}
                placeholder={
                  'What was learned, and from what.\n' +
                  'What to do differently next time.\n' +
                  'Anything that cost time and should not twice.'
                }
                onChange={(event) => setBody(event.target.value)}
                className="min-h-0 w-full flex-1 resize-none rounded-lg bg-surface-card px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="relative flex items-center justify-center bg-surface-preview px-4 py-2">
              <Segmented
                label="What the right pane shows"
                options={[
                  ['preview', 'Note preview'],
                  ['history', 'Note history'],
                ]}
                value={rightPane}
                onChange={setRightPane}
              />
              {rightPane === 'history' && note.history.length > 0 && (
                <span className="absolute right-4 font-mono text-[11px] text-text-muted">
                  v{basedOn + 1} of {note.history.length}
                </span>
              )}
            </div>

            {rightPane === 'history' ? (
              <div className="min-h-0 overflow-y-auto bg-surface-preview-alt">
                {note.history.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-text-muted">
                    No versions yet. Saving records one.
                  </p>
                ) : (
                  <ul className="space-y-1.5 px-4 py-1">
                    {note.history
                      .map((version, index) => ({ version, index }))
                      .reverse()
                      .map(({ version, index }) => {
                        const current = index === basedOn;
                        return (
                          <li key={`${version.at}-${index}`}>
                            <button
                              type="button"
                              aria-current={current}
                              onClick={() => {
                                // Loads it into the editor without writing.
                                const was = noteAt(note.history, index);
                                setBasedOn(index);
                                setTitle(was.title);
                                setBody(was.body);
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                                current
                                  ? 'bg-surface-chosen'
                                  : 'bg-surface-card hover:bg-surface-chosen/40'
                              }`}
                            >
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="text-sm font-medium text-text-primary">
                                  v{index + 1}
                                  {index === note.history.length - 1 && (
                                    <span className="font-normal text-text-muted"> · latest</span>
                                  )}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-text-muted">
                                  {relativeTime(version.at)}
                                </span>
                              </span>
                              {/* The title as it was then — a rename is a
                                  version here, so it has to be visible. */}
                              <span
                                className={`mt-0.5 block truncate text-[11px] ${
                                  current ? 'text-text-primary' : 'text-text-muted'
                                }`}
                              >
                                {version.title.trim() || 'Untitled note'}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            ) : (
              <PreviewPane
                title="Note preview"
                markdown={rendered}
                copyLabel="Copy note"
                empty="Nothing written yet."
                tone="preview"
              />
            )}
          </div>
        </div>

        <div className="editor-gutter flex shrink-0 items-center justify-between border-t border-line py-3">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-brand-accent hover:opacity-70"
            onClick={() => {
              if (window.confirm('Delete this note? This cannot be undone.')) onDelete();
            }}
          >
            Delete
          </button>

          <div className="flex items-center gap-3">
            {savedAt && !dirty && (
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Icon name="check" className="h-4 w-4 shrink-0 text-status-done" />
                Saved
              </span>
            )}
            {dirty ? (
              <>
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-text-muted hover:opacity-70"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                Back to {returnLabel}
              </button>
            )}
          </div>
        </div>
      </form>

      {pendingSave && (
        <ConfirmDialog
          title="Overwrite the newer versions?"
          confirmLabel="Overwrite"
          message={`You are working from v${basedOn + 1}, and v${
            basedOn + 2
          } onwards came after it. Saving replaces ${
            note.history.length - basedOn - 1
          } later version${note.history.length - basedOn - 1 === 1 ? '' : 's'} with this one.`}
          onConfirm={() => {
            const next = pendingSave;
            setPendingSave(null);
            persist(next);
          }}
          onCancel={() => setPendingSave(null)}
        />
      )}
    </section>
  );
}
