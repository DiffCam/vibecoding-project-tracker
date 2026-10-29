import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import type { ReactNode } from 'react';

export type Choice = {
  value: string;
  /** What a screen reader hears. The rows are pictures; this is the text. */
  label: string;
  /** The row in the open list. */
  row: ReactNode;
  /** The closed control, when this is the one chosen. Defaults to `row`. */
  face?: ReactNode;
};

/** How much of the screen an open list may eat, whatever is in it. */
const MAX_LIST = 18 * 16;

/**
 * Where the list goes, in viewport coordinates.
 *
 * Flipping is decided against the height the list *wants*, not the height it
 * ends up with, so the answer cannot change once it has been measured — and
 * the list carries the -100% itself, so it never has to be. When neither side
 * fits, it opens downward: both will scroll, and down is where it is expected.
 *
 * `row` is the caller's estimate, because rows differ per picker — a sprint
 * stacks three lines where a status is one. Only the flip decision depends on
 * it, so an over-estimate just flips sooner.
 */
export function placeList(
  rect: { top: number; bottom: number; left: number; width: number },
  count: number,
  viewport: number,
  row: number
) {
  const need = Math.min(count * row + 8, MAX_LIST);
  const below = viewport - rect.bottom;
  const flip = below < need && rect.top > below;
  return { left: rect.left, top: flip ? rect.top : rect.bottom, width: rect.width, flip };
}

/**
 * A select whose options are ours to draw.
 *
 * `<option>` can hold text and nothing else, so a sprint pill, a type badge
 * or an avatar in the list is only possible by replacing the control. That
 * costs everything the native one gave away for free, so all of it is here:
 * the listbox roles, arrow keys, Home/End, Escape, click-away, the focus
 * ring, and returning focus to the button on close.
 *
 * The list is portalled out and positioned fixed. The editor's left pane
 * scrolls and the page itself is `overflow-hidden`, so a list positioned
 * inside the field would be clipped by the first ancestor that scrolls —
 * but see `host`, because portalling all the way to the body is wrong
 * inside a modal dialog.
 */
export default function Picker({
  id,
  value,
  choices,
  onChange,
  disabled = false,
  title,
  rowHeight = 40,
  tone = 'card',
}: {
  id: string;
  value: string;
  choices: Choice[];
  onChange: (value: string) => void;
  disabled?: boolean;
  title?: string;
  /** Roughly how tall one row is. Only the decision to flip uses it. */
  rowHeight?: number;
  /**
   * Which surface this sits on, because the field has to differ from it.
   *
   * `card` is the default and suits the editor pages, whose panes are the
   * page colour. On a card-coloured dialog that same fill is the background
   * — the control disappears — so `page` recesses it and adds the hairline
   * the dialog's other fields already wear.
   */
  tone?: 'card' | 'page';
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Type-ahead buffer: what has been typed, and when, so it can expire. */
  const typed = useRef({ text: '', at: 0 });
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, flip: false });

  /**
   * Where the list is portalled to.
   *
   * The body, unless this sits inside a modal `<dialog>` — one opened with
   * `showModal()` is in the top layer, which paints above everything in the
   * body no matter the z-index, so a list portalled out of it would be
   * hidden behind the dialog that owns it. Fixed positioning still measures
   * against the viewport either way.
   */
  const host = buttonRef.current?.closest('dialog') ?? document.body;

  const index = Math.max(
    0,
    choices.findIndex((choice) => choice.value === value)
  );
  const chosen = choices[index];

  function place() {
    const el = buttonRef.current;
    if (!el) return;
    setBox(placeList(el.getBoundingClientRect(), choices.length, window.innerHeight, rowHeight));
  }

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();

    // Capture, because the pane that scrolls is an ancestor and scroll does
    // not bubble. Following the button beats closing: the field often sits
    // near the top of a pane that has barely anywhere to go.
    const follow = () => place();
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);

    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', away);

    return () => {
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
      document.removeEventListener('pointerdown', away);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Arrowing past the fold should bring the row with it.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function show() {
    setActive(index);
    setOpen(true);
  }

  function pick(at: number) {
    onChange(choices[at].value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        title={title}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;
          event.preventDefault();
          show();
        }}
        className={`relative flex w-full items-center gap-2 overflow-hidden rounded-lg py-2 pl-3 pr-8 text-left text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-60 ${
          tone === 'page' ? 'border border-line bg-surface-page' : 'bg-surface-card'
        }`}
      >
        {chosen?.face ?? chosen?.row}
        <Icon
          name="down"
          aria-hidden="true"
          className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={id}
            aria-activedescendant={`${id}-option-${active}`}
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              maxHeight: MAX_LIST,
              transform: box.flip ? 'translateY(-100%)' : undefined,
            }}
            onKeyDown={(event) => {
              // Portalled content still bubbles through the React tree, so
              // without this the editor's own Escape handler sees this one
              // and leaves the page.
              event.stopPropagation();

              if (event.key === 'Escape' || event.key === 'Tab') {
                event.preventDefault();
                return close();
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                return pick(active);
              }
              const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
              if (step !== undefined) {
                event.preventDefault();
                // Clamped, not wrapped: the ends of a short list are easier
                // to feel than to count past.
                return setActive((at) => Math.min(choices.length - 1, Math.max(0, at + step)));
              }
              if (event.key === 'Home') {
                event.preventDefault();
                return setActive(0);
              }
              if (event.key === 'End') {
                event.preventDefault();
                return setActive(choices.length - 1);
              }
              // Type-ahead, which the native select had and this would
              // otherwise take away. Space never reaches here — it selects,
              // the same as in a native listbox — so it cannot start a word.
              if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                const now = Date.now();
                const text =
                  (now - typed.current.at < 700 ? typed.current.text : '') +
                  event.key.toLowerCase();
                typed.current = { text, at: now };
                const hit = choices.findIndex((choice) =>
                  choice.label.toLowerCase().startsWith(text)
                );
                if (hit >= 0) setActive(hit);
              }
            }}
            className="popover-lift fixed z-50 overflow-y-auto rounded-lg border border-line bg-surface-card py-1 focus:outline-none"
          >
            {choices.map((choice, at) => (
              <li
                key={choice.value}
                id={`${id}-option-${at}`}
                role="option"
                aria-selected={choice.value === value}
                data-active={at === active}
                title={choice.label}
                // Mouse down rather than click: the click-away listener fires
                // on pointerdown, and would close the list out from under it.
                onPointerDown={(event) => {
                  event.preventDefault();
                  pick(at);
                }}
                onPointerEnter={() => setActive(at)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text-primary ${
                  at === active ? 'bg-surface-chosen' : ''
                }`}
              >
                {choice.row}
                {choice.value === value && (
                  <Icon
                    name="check"
                    aria-hidden="true"
                    className="ml-auto h-4 w-4 shrink-0 text-brand-ink"
                  />
                )}
              </li>
            ))}
          </ul>,
          host
        )}
    </>
  );
}
