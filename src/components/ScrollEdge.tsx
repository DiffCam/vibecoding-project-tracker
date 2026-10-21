import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

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
