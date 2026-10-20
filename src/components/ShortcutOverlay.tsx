import { MODIFIER_LABEL } from '../useModifierKey';

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Board',
    rows: [
      [MODIFIER_LABEL, 'Jump to the board'],
      [`${MODIFIER_LABEL} hold`, 'This list'],
      ['← → ↑ ↓', 'Move between cards'],
      ['Space', 'Grab a card, then place it'],
      [`${MODIFIER_LABEL}`, 'Place a carried card'],
      ['Esc', 'Cancel a carry'],
      ['↵', 'Open the focused task'],
    ],
  },
  {
    title: 'Everywhere',
    rows: [
      ['N', 'New task'],
      ['T', 'Team'],
      ['M', 'Next milestone tab'],
      ['D', 'Dark mode'],
      ['L', 'Light mode'],
    ],
  },
];

/**
 * The cheat sheet shown while Cmd/Ctrl is held down.
 *
 * Deliberately not a <dialog>: it appears and disappears on a key that is
 * still being held, so trapping focus and then yanking it back a moment later
 * would be worse than useless. It is inert and aria-hidden — the board's own
 * hint line and the buttons' titles are the path for screen readers, which do
 * not benefit from a transient visual peek.
 */
export default function ShortcutOverlay() {
  return (
    <div
      aria-hidden="true"
      className="anim-rise pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-surface-card p-6">
        <h2 className="mb-4 text-base font-semibold uppercase text-text-primary">
          Keyboard
        </h2>

        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 font-mono text-xs text-text-muted">{group.title}</p>
              <ul className="space-y-1.5">
                {group.rows.map(([keys, label]) => (
                  <li key={label} className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-text-primary">{label}</span>
                    <kbd className="shrink-0 rounded border border-line bg-surface-page px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-primary">
                      {keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-5 font-mono text-xs text-text-muted">
          Release {MODIFIER_LABEL} to close
        </p>
      </div>
    </div>
  );
}
