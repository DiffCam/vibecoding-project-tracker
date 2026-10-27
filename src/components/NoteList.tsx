import Icon from './Icon';
import { relativeTime } from '../relativeTime';
import type { AgentNote } from '../types';

/**
 * An agent's notes, as cards.
 *
 * Read-only here — this is the index, and the note itself is a page. The
 * version count is on the card because "how many times has it rewritten
 * this" is the question you come here to answer.
 */
export default function NoteList({
  notes,
  taskTitle,
  onOpen,
  onAdd,
}: {
  notes: AgentNote[];
  /** The referenced task's title, or undefined if it is gone or unset. */
  taskTitle: (id: string | null) => string | undefined;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="px-4 py-1">
      <button
        type="button"
        onClick={onAdd}
        className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-text-muted p-2 text-sm text-text-muted hover:border-brand-primary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Icon name="plus" className="h-4 w-4 shrink-0" />
        Add note
      </button>

      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          Nothing written down yet. This is where the agent keeps what it has learned, and
          where you correct it.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map((note) => {
            const task = taskTitle(note.taskId);
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onOpen(note.id)}
                  className="w-full rounded-lg bg-surface-card px-3 py-2 text-left transition-colors hover:bg-surface-chosen/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                      {note.title.trim() || 'Untitled note'}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-text-muted">
                      v{note.history.length}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-baseline gap-1.5 text-[11px] text-text-muted">
                    {/* The task it came out of, when it came out of one.
                        A note the agent wrote for itself has none, and says
                        so rather than leaving the line blank. */}
                    <span className="min-w-0 truncate">
                      {note.taskId === null
                        ? 'No task'
                        : (task ?? 'A task that no longer exists')}
                    </span>
                    {note.history.length > 0 && (
                      <span className="shrink-0 font-mono">
                        · {relativeTime(note.history[note.history.length - 1].at)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
