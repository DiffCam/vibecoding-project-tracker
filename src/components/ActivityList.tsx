import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import Markdown from './Markdown';
import Segmented from './Segmented';
import { relativeTime } from '../relativeTime';
import type { TaskEntry } from '../taskHistory';

/**
 * Everything that has happened to this task, said or done, oldest first.
 *
 * Comments and changes share one list because they are one story: "rejecting
 * — the handle still swallows clicks" immediately above the status going
 * back to In Progress reads as cause and effect, which two lists side by
 * side would make the reader assemble from timestamps.
 *
 * Oldest first, unlike the context history. That list is a stack of versions
 * to pick from, where the newest is the one you want; this one is a
 * conversation, and conversations read downward.
 *
 * Numbering runs across both kinds, so #4 is the fourth thing that happened
 * whoever did it — which is the point of putting them together.
 */
export default function ActivityList({
  entries,
  user,
  memberColors,
  onComment,
}: {
  entries: TaskEntry[];
  /** The signed-in account: their own comments sit on the right. */
  user: string;
  memberColors: Record<string, string>;
  onComment: (body: string, markdown: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const [format, setFormat] = useState<'plain' | 'markdown'>('plain');

  const listRef = useRef<HTMLUListElement>(null);
  /**
   * Whether the reader is at the live end of the list.
   *
   * Scrolled up to re-read something, a change recorded by somebody else
   * should not yank them back down — the same rule every chat follows. A
   * ref, not state: it changes on every scroll event and nothing renders
   * from it.
   */
  const atEnd = useRef(true);
  /** Set when this pane caused the addition, which always wins. */
  const force = useRef(true);
  /** The first run lands at the bottom without animating there. */
  const first = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (force.current || atEnd.current) {
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: first.current || still ? 'auto' : 'smooth',
      });
    }
    force.current = false;
    first.current = false;
    // `format` too: opening the preview shortens the list, and the end
    // should stay the end.
  }, [entries.length, format]);

  function post() {
    const body = draft.trim();
    if (!body) return;
    // Your own message always scrolls, wherever you were reading.
    force.current = true;
    onComment(body, format === 'markdown');
    setDraft('');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ul
        ref={listRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          // A little slack: fractional scroll positions never land exactly
          // on the end, and neither does a reader who is near enough.
          atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3"
      >
        {entries.length === 0 && (
          <li className="py-6 text-center text-sm text-text-muted">
            Nothing yet. Saving a change records one, and anything said here sits alongside it.
          </li>
        )}

        {entries.map((entry, index) => {
          const n = index + 1;

          if (entry.kind === 'comment') {
            const mine = entry.by === user;
            return (
              <li
                key={`${entry.at}-${index}`}
                // Yours on the right, everyone else's on the left — the one
                // convention every chat shares, so it needs no explaining.
                className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}
              >
                <Avatar small name={entry.by} accent={memberColors[entry.by]} />
                <div className={`min-w-0 max-w-[80%] ${mine ? 'items-end' : ''}`}>
                  <p
                    className={`mb-0.5 flex items-baseline gap-1.5 text-[11px] text-text-muted ${
                      mine ? 'justify-end' : ''
                    }`}
                  >
                    <span className="font-mono">#{n}</span>
                    <span className="truncate">{entry.by}</span>
                    <span className="shrink-0">{relativeTime(entry.at)}</span>
                  </p>
                  <div
                    className={`rounded-xl px-3 py-2 text-sm ${
                      mine
                        ? 'rounded-br-sm bg-surface-chosen text-text-primary'
                        : 'rounded-bl-sm bg-surface-card text-text-primary'
                    }`}
                  >
                    {entry.markdown ? (
                      <Markdown>{entry.body}</Markdown>
                    ) : (
                      // Plain text, so a stray # or * is a character and not
                      // a heading. whitespace-pre-wrap keeps the line breaks
                      // somebody actually typed.
                      <p className="whitespace-pre-wrap break-words">{entry.body}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={`${entry.at}-${index}`} className="rounded-lg bg-surface-card px-3 py-2">
              <p className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 font-mono text-xs text-text-muted">#{n}</span>
                  {entry.by && (
                    <>
                      <Avatar small name={entry.by} accent={memberColors[entry.by]} />
                      <span className="min-w-0 truncate text-xs text-text-muted">{entry.by}</span>
                    </>
                  )}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-text-muted">
                  {relativeTime(entry.at)}
                </span>
              </p>

              <ul className="mt-1 space-y-0.5">
                {entry.changes.map((change, i) => (
                  <li key={i} className="text-[11px] leading-snug text-text-muted">
                    <span className="text-text-primary">{change.label}</span>{' '}
                    <span className="break-words">{change.from}</span>
                    {/* An arrow rather than the word "to": these lines are
                        scanned down a narrow column, not read as prose. */}
                    <span aria-label="changed to"> → </span>
                    <span className="break-words text-text-primary">{change.to}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {/* Posts on its own, not behind the footer's Save: a comment is a thing
          you send, and holding it hostage to unsaved field edits would be
          surprising in both directions. */}
      <div className="shrink-0 border-t border-line px-4 py-3">
        {/* Only in markdown: in plain text what you typed is what appears,
            so a preview would be the same box twice. Rendered whenever the
            mode is on rather than only once something is typed — the layout
            then shifts on a deliberate toggle instead of on a keystroke.

            Capped and scrollable: this squeezes the activity list above it,
            and a long comment should cost that list a fixed amount rather
            than all of it. */}
        {format === 'markdown' && (
          <div className="mb-2 rounded-lg bg-surface-card px-3 py-2">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
              Preview
            </p>
            <div className="max-h-32 overflow-y-auto">
              {draft.trim() ? (
                <Markdown>{draft}</Markdown>
              ) : (
                <p className="text-sm text-text-muted">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        )}

        <textarea
          value={draft}
          rows={2}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter is a newline. Not a <form>: this
            // renders inside the editor's, and a nested one is invalid.
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            post();
          }}
          className={`w-full resize-none rounded-lg bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary ${
            format === 'markdown' ? 'font-mono' : ''
          }`}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Segmented
            label="How to read the comment"
            options={[
              ['plain', 'Plain'],
              ['markdown', 'Markdown'],
            ]}
            value={format}
            onChange={setFormat}
          />
          <button
            type="button"
            onClick={post}
            disabled={draft.trim().length === 0}
            title={draft.trim() ? undefined : 'Write something first.'}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="check" className="h-4 w-4 shrink-0" />
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
