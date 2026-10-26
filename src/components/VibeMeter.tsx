import { useState } from 'react';
import { createPortal } from 'react-dom';
import VibeDialog from './VibeDialog';
import { VIBES, vibe } from '../vibe';
import type { Task } from '../types';

/**
 * The project's mood, as one line in the header.
 *
 * Two axes off the board — how much has left To Do, and how little of the
 * unfinished work is late — land in one of five phrases. The line only states
 * the reading; the chart it comes from, and the numbers behind it, live one
 * click away so the header stays a header.
 *
 * A label and a value rather than a badge: a filled pill sat too heavily above
 * the shortcut hint, and the colour does not need a container to be read. The
 * tokens are tuned to clear 4.5:1 as text on both header tones, so the phrase
 * itself can carry it — and the words say the same thing as the colour, so
 * nothing is lost if the hue is hard to tell apart.
 */
export default function VibeMeter({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const reading = vibe(tasks);
  const { label, token } = VIBES[reading.zone];

  return (
    <>
      <p className="pointer-events-auto flex items-center gap-1.5 text-xs">
        <span className="font-mono text-text-muted">Vibe:</span>
        {/* Polite, so a changing vibe waits its turn rather than cutting
            across a drag or a carry. */}
        <span aria-live="polite" className="font-medium" style={{ color: `rgb(var(${token}))` }}>
          {label}
        </span>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="How the vibe is worked out"
          title="How the vibe is worked out"
          // Unringed: a bordered circle was the other half of what made this
          // feel like a badge. It sits directly after the phrase, so position
          // does the work the border was doing.
          className="shrink-0 rounded font-mono text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          (?)
        </button>
      </p>

      {/* Portalled: the header centres this block inside a pointer-events-none
          wrapper, which the dialog would otherwise inherit — leaving its own
          Close button unclickable. */}
      {open &&
        createPortal(<VibeDialog reading={reading} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
