import { relativeTime } from '../relativeTime';
import type { TaskEvent } from '../taskHistory';

/**
 * Every save that altered the task, newest first.
 *
 * A record, not a control: unlike the context history there is nothing to
 * restore here, because these are fields rather than a document. The context
 * appears only as the version numbers it moved between — the writing itself
 * is one tab over.
 */
export default function TaskEventList({ events }: { events: TaskEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-text-muted">
        No changes yet. Saving an edit to this task records what moved.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 px-4 py-1">
      {events
        .map((event, index) => ({ event, index }))
        .reverse()
        .map(({ event, index }) => (
          <li key={`${event.at}-${index}`} className="rounded-lg bg-surface-card px-3 py-2">
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">#{index + 1}</span>
              <span className="shrink-0 font-mono text-[11px] text-text-muted">
                {relativeTime(event.at)}
              </span>
            </p>

            <ul className="mt-1 space-y-0.5">
              {event.changes.map((change, i) => (
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
        ))}
    </ul>
  );
}
