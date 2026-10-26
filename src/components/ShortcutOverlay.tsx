import { ALT_LABEL, MODIFIER_LABEL } from '../useModifierKey';

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Board',
    rows: [
      [MODIFIER_LABEL, 'Jump to the board'],
      [`${MODIFIER_LABEL} hold`, 'This list'],
      ['← → ↑ ↓', 'Move between cards'],
      ['↵', 'Open the focused task'],
      ['↑', 'Up to the sprints row'],
      ['↵', 'On a sprint pill, filter by it'],
    ],
  },
  {
    // Its own group because the arrows mean something different mid-carry:
    // they aim the card rather than moving focus.
    title: 'Carrying a card',
    rows: [
      ['Space', 'Pick up, then place'],
      ['← →', 'Change lane'],
      ['↑ ↓', 'In and out of the sprints row'],
      [MODIFIER_LABEL, 'Place'],
      ['Esc', 'Cancel'],
    ],
  },
  {
    // Not in select mode: moving one sprint is a single-item action, the same
    // kind of thing as carrying one card.
    title: 'Carrying a sprint',
    rows: [
      ['↑', 'From the cards to the sprints row'],
      ['Space', 'Pick the sprint up'],
      ['Space', 'On "No sprint", pick up an eraser'],
      ['↑', 'On to the milestone tabs'],
      ['Space', 'File it under that milestone'],
      ['↓ ↓', 'Back down to the cards'],
      ['Space', 'Add the focused task, keep holding'],
      ['Esc', 'Put it back'],
    ],
  },
  {
    // Option, not Cmd: the Cmd tap still has to jump to the board and place a
    // carried card while a group is being picked.
    title: 'Selecting a group',
    rows: [
      [ALT_LABEL, 'Select mode on and off'],
      ['Space', 'Take or return a card'],
      ['← → ↑ ↓', 'Move between cards'],
      ['↑', 'Lift the pile out of the cards'],
      ['← →', 'Pick a lane, then ↑ for a sprint'],
      ['Space', 'Drop the pile there'],
      ['Esc', 'Back out, then leave the mode'],
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
      <div className="w-full max-w-2xl rounded-xl border border-line bg-surface-card p-6">
        <h2 className="mb-4 text-base font-semibold uppercase text-text-primary">
          Keyboard
        </h2>

        {/* Two columns: five groups in one would run off the bottom of a
            laptop screen, and the overlay cannot scroll — it is inert and
            disappears the moment the key comes up. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
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
