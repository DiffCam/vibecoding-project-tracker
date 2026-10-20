import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

// Overshoots slightly on arrival, which is what reads as weight.
const SPRINGY = 'cubic-bezier(0.22, 1.25, 0.36, 1)';

/**
 * FLIP: after each render, slide every `[data-flip-id]` element from where it
 * used to be to where it now is.
 *
 * Without this a card teleports between columns — the move is instant, so
 * there is nothing to follow. This covers both the keyboard carry and the
 * cards that shift up to close a gap, which no drag overlay can animate
 * because they are not the thing being dragged.
 */
export function useFlip(containerRef: RefObject<HTMLElement | null>) {
  const previous = useRef(new Map<string, { x: number; y: number }>());

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<string, { x: number; y: number }>();

    root.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((el) => {
      const id = el.dataset.flipId as string;
      let from = previous.current.get(id);

      // Mid-flight already: measure where it actually is, not where it began.
      const running = el.getAnimations();
      if (running.length > 0) {
        const live = el.getBoundingClientRect();
        from = { x: live.left + window.scrollX, y: live.top + window.scrollY };
        running.forEach((animation) => animation.cancel());
      }

      const rect = el.getBoundingClientRect();
      const to = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
      next.set(id, to);

      if (!from || reduced) return;
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 340, easing: SPRINGY }
      );
    });

    previous.current = next;
  });
}
