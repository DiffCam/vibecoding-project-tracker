import Avatar from './Avatar';
import { contextAt, lineStat } from '../contextHistory';
import { changedSections } from '../sections';
import type { ContextVersion } from '../contextHistory';
import { relativeTime } from '../relativeTime';

const MODE_LABEL: Record<string, string> = {
  simple: 'Simple',
  spdd: 'SPDD',
  custom: 'Custom',
};


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
  memberColors,
  onPick,
}: {
  history: ContextVersion[];
  /** Index of the version the editor is currently working from. */
  basedOn: number;
  /** For the author's avatar, so a face here matches the one on the board. */
  memberColors: Record<string, string>;
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
          // Against the version before it, so v1 is measured from empty.
          const was = contextAt(history, index - 1);
          const now = contextAt(history, index);
          const stat = lineStat(was, now);
          const touched = changedSections(was, now);

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
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-sm font-medium text-text-primary">
                      v{index + 1}
                    </span>
                    {/* Who saved it, beside the number it belongs to.
                        Versions written before there were accounts have
                        nobody to name, and show none. */}
                    {version.by && (
                      <>
                        <Avatar small name={version.by} accent={memberColors[version.by]} />
                        <span className="min-w-0 truncate text-xs text-text-muted">
                          {version.by}
                        </span>
                      </>
                    )}
                    {newest && (
                      <span className="shrink-0 text-xs font-normal text-text-muted">
                        · latest
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-text-muted">
                    {MODE_LABEL[version.mode] ?? version.mode}
                  </span>
                </span>
                {/* Green, red and blue for the three kinds, and each is
                    omitted at zero — a row of "+0 −0" is three noughts to
                    read past on every card. */}
                <span className="mt-0.5 flex items-center gap-2 font-mono text-[11px]">
                  {stat.added > 0 && <span className="text-status-done">+{stat.added}</span>}
                  {stat.removed > 0 && <span className="text-danger">−{stat.removed}</span>}
                  {stat.modified > 0 && (
                    <span className="text-brand-ink">~{stat.modified}</span>
                  )}
                  {stat.added + stat.removed + stat.modified === 0 && (
                    <span className="text-text-muted">no lines changed</span>
                  )}
                  <span className="text-text-muted">{relativeTime(version.at)}</span>
                </span>

                {/* What was edited, rather than what the document opens
                    with. The old line quoted the first heading, which in a
                    canvas is "Requirements" however little it was touched. */}
                <span
                  title={touched.join(', ')}
                  className={`mt-0.5 block truncate text-[11px] ${
                    current ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {touched.length > 0 ? touched.join(', ') : 'No sections changed'}
                </span>
              </button>
            </li>
          );
        })}
    </ul>
  );
}
