import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import Icon from './Icon';

const CHEVRON = { left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6' };

/**
 * Tracks whether a horizontal scroller has more content past either end.
 *
 * Overflow depends on the container's width as much as its contents, so this
 * watches for resizes rather than only recomputing when the data changes.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [edges, setEdges] = useState({ left: false, right: false });

  function sync() {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px of slack: fractional scroll positions never land exactly on the end.
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { edges, sync };
}

/**
 * Whether a vertical scroller has more content below the fold.
 *
 * Separate from `useScrollEdges` rather than an axis on it: this one needs no
 * "above" half — the fade at the top of a list is the heading it scrolled
 * under — and the three horizontal callers would all have to be touched to
 * rename left/right into something axis-neutral.
 */
export function useMoreBelow(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [more, setMore] = useState(false);

  function sync() {
    const el = ref.current;
    if (!el) return;
    // 1px of slack: fractional scroll positions never land exactly on the end.
    setMore(el.scrollTop < el.scrollHeight - el.clientHeight - 1);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    // The children too: a card opening resizes the content without resizing
    // the box it scrolls in, and only the content changed.
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { more, sync };
}

/**
 * Fade and a chevron over the bottom of a vertical scroller, while there is
 * more below.
 *
 * No button, unlike the horizontal pair: a vertical list takes the wheel, and
 * tabbing to a card past the fold scrolls it into view on its own. This only
 * has to say that the list does not end where it appears to.
 */
export function MoreBelow({ show, fade }: { show: boolean; fade: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-9 items-end justify-center bg-gradient-to-t transition-opacity duration-150 ${fade} ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Icon name="down" className="h-4 w-4 text-text-muted" />
    </div>
  );
}

/**
 * Fade plus a scroll button, shown only on an end that actually has more past
 * it. The button is what makes a scroller with a hidden scrollbar operable by
 * keyboard, and by a mouse without a horizontal wheel.
 *
 * `fade` is passed in because the edge has to dissolve into whatever surface
 * it sits on, which differs per row.
 */
export default function ScrollEdge({
  side,
  fade,
  size = 'md',
  onScroll,
}: {
  side: 'left' | 'right';
  /** The `from-*` class matching the surface behind the scroller. */
  fade: string;
  size?: 'sm' | 'md';
  onScroll: () => void;
}) {
  const small = size === 'sm';

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 flex items-center ${
        small ? 'w-10' : 'w-16'
      } ${
        side === 'left'
          ? 'left-0 justify-start bg-gradient-to-r'
          : 'right-0 justify-end bg-gradient-to-l'
      } ${fade}`}
    >
      <button
        type="button"
        onClick={onScroll}
        aria-label={`Scroll ${side}`}
        className={`pointer-events-auto rounded-full border border-line bg-surface-card text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          small ? 'p-0.5' : 'p-1'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={small ? 'h-3 w-3' : 'h-4 w-4'}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={CHEVRON[side]} />
        </svg>
      </button>
    </div>
  );
}
