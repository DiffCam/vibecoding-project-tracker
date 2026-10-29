import { useEffect, useRef, useState } from 'react';
import { VIBES, zoneLabel } from '../vibe';
import type { Tone, VibeZone } from '../vibe';

const ZONES = Object.keys(VIBES) as VibeZone[];

/**
 * Loads a whole board that reads as a chosen vibe, for demoing.
 *
 * Deliberately plain and labelled rather than an unmarked icon: it throws away
 * everything on the board, so it should look like a tool and not a feature.
 * The confirmation lives with the caller, which owns the data it would replace.
 */
export default function DebugFab({
  onPick,
  tone,
}: {
  onPick: (zone: VibeZone) => void;
  /** The demo scenarios are named by their reading, so they follow it too. */
  tone: Tone;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click anywhere else and the menu goes away. Capture, so it still closes
  // when the press lands on something that stops propagation.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {open && (
        <div
          role="menu"
          aria-label="Load demo data"
          className="w-56 overflow-hidden rounded-xl border border-line bg-surface-card py-1"
        >
          <p className="px-3 py-1.5 font-mono text-[11px] text-text-muted">
            Replace the board with…
          </p>
          {ZONES.map((zone) => (
            <button
              key={zone}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(zone);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-primary hover:bg-surface-sunken focus:bg-surface-sunken focus:outline-none"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `rgb(var(${VIBES[zone].token}))` }}
              />
              {zoneLabel(zone, tone)}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((on) => !on)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Load a board that reads as a given vibe"
        className="rounded-full border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        Demo data
      </button>
    </div>
  );
}
