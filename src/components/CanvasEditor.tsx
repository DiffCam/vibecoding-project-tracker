import Icon from './Icon';
import { filledCount, parseCanvas, REASONS, toMarkdown } from '../reasons';
import type { ReasonKey } from '../reasons';
import { TAG_INK } from '../tagColor';

/**
 * The REASONS canvas as seven cards and one editor.
 *
 * It edits the same markdown string the plain box does — the canvas is a view,
 * not a second place to keep things. Every keystroke is parsed, changed and
 * re-serialised, which is what lets the toggle be lossless and why that round
 * trip is asserted rather than assumed.
 *
 * A section only becomes a heading once it has content, so an untouched canvas
 * contributes nothing to the copied prompt.
 */
export default function CanvasEditor({
  value,
  onChange,
  open,
  onOpen,
}: {
  value: string;
  onChange: (markdown: string) => void;
  /** Lifted, because the preview beside the editor follows the selection. */
  open: ReasonKey;
  onOpen: (key: ReasonKey) => void;
}) {
  const canvas = parseCanvas(value);
  const current = REASONS.find((entry) => entry.key === open) ?? REASONS[0];
  const done = filledCount(canvas.sections);

  function write(key: ReasonKey, body: string) {
    onChange(toMarkdown({ ...canvas, sections: { ...canvas.sections, [key]: body } }));
  }

  return (
    <div className="mt-1 grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-[11px] text-text-muted">{done} of 7 written</p>

        {REASONS.map((entry) => {
          const filled = canvas.sections[entry.key]?.trim().length > 0;
          const active = entry.key === open;

          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => onOpen(entry.key)}
              aria-pressed={active}
              // One fill per state, rather than a fill plus a border saying
              // the same thing: selected is brand, written is green, and
              // untouched is the same surface every other field uses.
              className={`flex items-start gap-2.5 rounded-lg p-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                active
                  ? 'bg-surface-chosen'
                  : filled
                    ? 'bg-status-done/10'
                    : 'bg-surface-card'
              }`}
            >
              {/* Coloured because two of the seven badge as "S". The letter is
                  the acronym; the colour is what separates them. */}
              <span
                aria-hidden="true"
                style={{ backgroundColor: entry.colour, color: TAG_INK }}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-medium"
              >
                {entry.letter}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary">{entry.title}</span>
                  {/* Kept alongside the tint: the green is the glance, but
                      colour on its own should never be the only signal. */}
                  {filled && (
                    <Icon
                      name="check"
                      aria-label="written"
                      className="h-3.5 w-3.5 shrink-0 text-status-done"
                    />
                  )}
                </span>
                {/* Full strength on the chosen card: muted only reaches
                    3.3:1 on that fill. Size and weight still separate it
                    from the title above. */}
                <span
                  className={`mt-0.5 block text-[11px] leading-snug ${
                    active ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {entry.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-col">
        <label className="mb-1 block text-xs text-text-muted" htmlFor="canvas-section">
          {current.title} <span className="text-text-muted">· {current.blurb}</span>
        </label>
        <textarea
          id="canvas-section"
          // Uncontrolled, and keyed per section so switching resets it.
          // The value round-trips through parse/serialise on every
          // keystroke, and that serialiser trims — so a trailing space or
          // newline was being thrown away before it could render, which
          // made Space and Enter look like dead keys. The DOM holds the
          // raw text; trimming applies only to what gets stored.
          key={current.key}
          defaultValue={canvas.sections[current.key] ?? ''}
          onChange={(event) => write(current.key, event.target.value)}
          placeholder={current.blurb}
          className="w-full flex-1 resize-none rounded-lg bg-surface-card px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />

        {canvas.extra.trim() && (
          <p className="mt-1.5 text-[11px] text-text-muted">
            This task also has notes outside the canvas. They are kept, and visible in Simple.
          </p>
        )}
      </div>
    </div>
  );
}
