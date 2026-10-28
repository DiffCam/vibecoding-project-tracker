import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import CustomEditor from './CustomEditor';
import HistoryList from './HistoryList';
import NoteList from './NoteList';
import Icon from './Icon';
import PreviewPane from './PreviewPane';
import Segmented from './Segmented';
import { contextAt, recordVersion } from '../contextHistory';
import type { ContextVersion } from '../contextHistory';
import { parseSections, writeSection } from '../sections';
import type { AgentNote, ContextMode } from '../types';

/**
 * A tier of context, on a page of its own. The project's, or an agent's.
 *
 * The same shape as the task editor, because it is the same job — write
 * markdown, watch it render, keep the versions — and three different layouts
 * for one activity is two too many. What it does not have: SPDD, which asks
 * seven questions about a single task and none about a project or a role, and
 * a task history, since there are no fields here to log.
 *
 * Reached from the board, a task, or the team roster. Leaving goes back to
 * whichever, and an open task is only hidden while this is up, never
 * unmounted, so a draft survives the detour.
 *
 * Two tiers rather than one component per tier: the only differences are the
 * words, which is what these props are.
 */
const MODES: [ContextMode, string][] = [
  ['simple', 'Simple'],
  ['custom', 'Custom'],
];

export default function ContextPage({
  noun,
  intro,
  placeholder,
  emptyHint,
  context,
  mode,
  history,
  onSave,
  onClose,
  returnLabel,
  notes,
  userName,
  memberColors,
}: {
  /** Names the thing in the pane titles and on the Copy buttons. */
  noun: string;
  /** One line under the header saying what this tier is for. */
  intro: string;
  placeholder: string;
  /** Shown in the preview while nothing has been written. */
  emptyHint: string;
  context: string;
  mode: ContextMode;
  history: ContextVersion[];
  onSave: (next: { context: string; mode: ContextMode; history: ContextVersion[] }) => void;
  onClose: () => void;
  /** Where Cancel and the footer say you are going. */
  returnLabel: string;
  /** The signed-in account, stamped on each version it saves. */
  userName: string;
  memberColors: Record<string, string>;
  /**
   * An agent's notes, and the two ways to act on them. Absent for the
   * project tier, which has no agent to keep them — the third tab appears
   * only when there is something to put in it.
   */
  notes?: { items: AgentNote[]; taskTitle: (id: string | null) => string | undefined; onOpen: (id: string) => void; onAdd: () => void };
}) {
  const pageRef = useRef<HTMLElement>(null);

  const [draft, setDraft] = useState(context);
  // Custom here means the same thing it does on a task: `##` headings as
  // cards. Anything stored as 'spdd' has no canvas to open into, so it lands
  // in the plain box, where the headings are simply text.
  const [draftMode, setDraftMode] = useState<ContextMode>(mode === 'custom' ? 'custom' : 'simple');
  const [customIndex, setCustomIndex] = useState(0);
  const [rightPane, setRightPane] = useState<'preview' | 'context' | 'notes'>('preview');

  const [basedOn, setBasedOn] = useState(history.length - 1);
  const [restoredAt, setRestoredAt] = useState(0);
  const [pendingSave, setPendingSave] = useState<{
    context: string;
    mode: ContextMode;
    history: ContextVersion[];
  } | null>(null);

  const [saved, setSaved] = useState({ context, mode: draftMode });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirty = draft !== saved.context || draftMode !== saved.mode;

  /** The narrowest pasteable block: the open section, or in Simple the lot. */
  const section = (() => {
    if (draftMode !== 'custom') return draft;
    const { sections } = parseSections(draft);
    const picked = sections[Math.min(customIndex, sections.length - 1)];
    return picked ? writeSection(picked) : '';
  })();

  /** What a save would write. A version only when the text actually moved. */
  function commit() {
    const changed = draft !== contextAt(history, history.length - 1);
    return {
      context: draft,
      mode: draftMode,
      history: changed
        ? recordVersion(history, basedOn, {
            at: new Date().toISOString(),
            by: userName,
            mode: draftMode,
            context: draft,
          })
        : history,
    };
  }

  function persist(next: ReturnType<typeof commit>) {
    onSave(next);
    setSaved({ context: next.context, mode: next.mode });
    setBasedOn(next.history.length - 1);
    setSavedAt(new Date().toISOString());
  }

  // Focus lands on the page so Escape works before anything is touched.
  useEffect(() => {
    pageRef.current?.focus();
  }, []);

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
          if (next.history !== history && basedOn < history.length - 1) setPendingSave(next);
          else persist(next);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="editor-gutter flex min-h-0 flex-col overflow-y-auto py-8">
            <p className="shrink-0 text-sm text-text-muted">
              {intro}
            </p>

            <div className="mt-3 flex min-h-[20rem] flex-1 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <label
                  className="text-xs text-text-muted"
                  htmlFor={draftMode === "custom" ? "custom-body" : "context-page-body"}
                >
                  {noun[0].toUpperCase() + noun.slice(1)} (Markdown)
                </label>
                {/* Both edit the same string, so switching can never lose
                    work — which is why this is a view toggle and not a mode. */}
                <Segmented
                  label={`How to edit the ${noun}`}
                  options={MODES}
                  value={draftMode}
                  onChange={setDraftMode}
                />
              </div>

              {draftMode === 'custom' ? (
                <CustomEditor
                  key={restoredAt}
                  value={draft}
                  onChange={setDraft}
                  open={customIndex}
                  onOpen={setCustomIndex}
                />
              ) : (
                // Monospace because it is Markdown being written for a model
                // to read. Tailwind's default mono stack — no extra webfont.
                <textarea
                  id="context-page-body"
                  autoFocus
                  value={draft}
                  placeholder={placeholder}
                  onChange={(event) => setDraft(event.target.value)}
                  className="mt-1 min-h-0 w-full flex-1 resize-none rounded-lg bg-surface-card px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              )}
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="relative flex items-center justify-center bg-surface-preview px-4 py-2">
              <Segmented
                label="What the right pane shows"
                options={
                  notes
                    ? [
                        ['preview', 'Context preview'],
                        ['context', 'Context history'],
                        ['notes', 'Agent notes'],
                      ]
                    : [
                        ['preview', 'Context preview'],
                        ['context', 'Context history'],
                      ]
                }
                value={rightPane}
                onChange={setRightPane}
              />
              {rightPane === 'context' && history.length > 0 && (
                <span className="absolute right-4 font-mono text-[11px] text-text-muted">
                  v{basedOn + 1} of {history.length}
                </span>
              )}
            </div>

            {rightPane === 'notes' && notes ? (
              <div className="min-h-0 overflow-y-auto bg-surface-preview-alt">
                <NoteList
                  notes={notes.items}
                  taskTitle={notes.taskTitle}
                  onOpen={notes.onOpen}
                  onAdd={notes.onAdd}
                />
              </div>
            ) : rightPane === 'context' ? (
              <div className="min-h-0 overflow-y-auto bg-surface-preview-alt">
                <HistoryList
                  history={history}
                  basedOn={basedOn}
                  memberColors={memberColors}
                  onPick={(index) => {
                    // Loads the version into the editor without writing
                    // anything — including the view it was written in.
                    setBasedOn(index);
                    setRestoredAt((n) => n + 1);
                    setDraft(contextAt(history, index));
                    setDraftMode(history[index].mode === 'custom' ? 'custom' : 'simple');
                  }}
                />
              </div>
            ) : draftMode === 'custom' ? (
              // Two panes only when there is a part and a whole to tell
              // apart. In Simple they would be the same string twice.
              <div className="grid min-h-0 grid-rows-2">
                <PreviewPane
                  title="This section"
                  markdown={section}
                  copyLabel="Copy section"
                  empty="Nothing written in this section yet."
                  tone="preview"
                />
                <PreviewPane
                  title={`Full ${noun}`}
                  markdown={draft}
                  copyLabel={`Copy ${noun}`}
                  empty="Nothing to preview yet."
                  tone="preview-alt"
                />
              </div>
            ) : (
              <PreviewPane
                title={`Full ${noun}`}
                markdown={draft}
                copyLabel={`Copy ${noun}`}
                empty={emptyHint}
                tone="preview"
              />
            )}
          </div>
        </div>

        <div className="editor-gutter flex shrink-0 items-center justify-between border-t border-line py-3">
          <p className="font-mono text-xs text-text-muted">
            {draft.trim()
              ? `${draft.trim().length} characters`
              : 'Empty — nothing is added to copied context.'}
          </p>

          <div className="flex items-center gap-3">
            {savedAt && !dirty && (
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Icon name="check" className="h-4 w-4 shrink-0 text-status-done" />
                Saved
              </span>
            )}
            {/* Two buttons, never both: there is either something to write or
                nothing left to do. */}
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
            history.length - basedOn - 1
          } later version${history.length - basedOn - 1 === 1 ? '' : 's'} with this one.`}
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
