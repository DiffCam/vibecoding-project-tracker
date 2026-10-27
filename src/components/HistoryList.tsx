import { contextAt } from '../contextHistory';
import type { ContextVersion } from '../contextHistory';
import { relativeTime } from '../relativeTime';

const MODE_LABEL: Record<string, string> = {
  simple: 'Simple',
  spdd: 'SPDD',
  custom: 'Custom',
};

/** First line of a version, as a hint at what changed. */
function gist(text: string): string {
  const line = text
    .split('\n')
    .map((one) => one.replace(/^#+\s*/, '').trim())
    .find(Boolean);
  return line ? (line.length > 60 ? `${line.slice(0, 60)}…` : line) : 'Empty';
}

/**
 * Saved versions of the task's context, newest first.
 *
 * Picking one loads it back into the editor, in the view it was written in.
 * Nothing is written until Save, so browsing here costs nothing — and the
 * card you are currently based on is marked, because saving from an older
 * one discards everything after it.
 */
export default function HistoryList({
  history,
  basedOn,
  onPick,
}: {
  history: ContextVersion[];
  /** Index of the version the editor is currently working from. */
  basedOn: number;
  onPick: (index: number) => void;
}) {
  if (history.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-text-muted">
        No versions yet. Saving a change to this task's context records one.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 px-4 py-1">
      {history
        .map((version, index) => ({ version, index }))
        .reverse()
        .map(({ version, index }) => {
          const current = index === basedOn;
          const newest = index === history.length - 1;

          return (
            <li key={`${version.at}-${index}`}>
              <button
                type="button"
                onClick={() => onPick(index)}
                aria-current={current}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                  current ? 'bg-surface-chosen' : 'bg-surface-card hover:bg-surface-chosen/40'
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    v{index + 1}
                    {newest && <span className="font-normal text-text-muted"> · latest</span>}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-text-muted">
                    {MODE_LABEL[version.mode] ?? version.mode}
                  </span>
                </span>
                <span
                  className={`mt-0.5 block truncate text-[11px] ${
                    current ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {relativeTime(version.at)} · {gist(contextAt(history, index))}
                </span>
              </button>
            </li>
          );
        })}
    </ul>
  );
}
