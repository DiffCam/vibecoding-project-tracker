import { boardHints, modeName } from '../boardHints';
import type { BoardState } from '../boardHints';

/**
 * What the keyboard does from here, above the board.
 *
 * Replaces a fixed cheat sheet that listed everything and therefore said
 * nothing about the moment you were in. The row changes as the board does,
 * so the question it answers is "what do these keys do now" rather than
 * "what keys exist".
 *
 * Decorative: every one of these actions is reachable without reading it,
 * and a live region that re-announced five items on every arrow press would
 * make the board unusable with a screen reader. The mode changes are spoken
 * by the toast instead, which says one thing when something happens.
 */
export default function ShortcutBar({ state }: { state: BoardState }) {
  const hints = boardHints(state);
  const live = state.armed || state.selectMode;

  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-x-4 gap-y-1 overflow-hidden rounded-lg px-3 py-1.5 transition-colors ${
        live ? 'bg-surface-chrome' : ''
      }`}
    >
      <span
        className={`shrink-0 font-mono text-[11px] uppercase tracking-wide ${
          live ? 'text-text-primary' : 'text-text-muted'
        }`}
      >
        {modeName(state)}
      </span>

      <ul className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        {hints.map((hint) => (
          <li key={hint.keys + hint.label} className="flex shrink-0 items-center gap-1.5">
            <kbd className="rounded border border-line bg-surface-card px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-primary">
              {hint.keys}
            </kbd>
            <span className="text-xs text-text-muted">{hint.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
