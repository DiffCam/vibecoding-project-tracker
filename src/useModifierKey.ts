import { useEffect, useRef } from 'react';

// navigator.platform is deprecated; userAgent is the portable check.
const MODIFIER = /Mac|iPhone|iPad/.test(navigator.userAgent) ? 'Meta' : 'Control';

export const MODIFIER_LABEL = MODIFIER === 'Meta' ? '⌘' : 'Ctrl';

export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

type KeyLike = Pick<
  KeyboardEvent,
  'key' | 'repeat' | 'altKey' | 'shiftKey' | 'ctrlKey' | 'metaKey'
>;

/**
 * Whether a keydown starts a candidate tap: the bare modifier, nothing else
 * held, not auto-repeating, not while typing or in a dialog.
 *
 * Pure so it can be checked without a browser — `modifier` is injected for the
 * same reason, and defaults to whatever this platform uses.
 */
export function shouldArm(
  event: KeyLike,
  typing: boolean,
  dialogOpen: boolean,
  modifier: string = MODIFIER
): boolean {
  if (event.key !== modifier) return false;
  if (event.repeat || typing || dialogOpen) return false;
  if (event.altKey || event.shiftKey) return false;
  // The modifier itself is reported held during its own keydown — only the
  // *other* one disqualifies the press.
  return modifier === 'Meta' ? !event.ctrlKey : !event.metaKey;
}

/** How long the modifier must be held before it stops being a tap. */
const HOLD_MS = 350;

/**
 * Two gestures on one key: tap Cmd/Ctrl and `onTap` fires, hold it and
 * `onHoldChange(true)` fires until release.
 *
 * Firing on keydown would trigger on the first half of every ⌘C, ⌘V and ⌘R, so
 * the tap waits for keyup and is cancelled the moment any other key or a click
 * lands — a chord is never a tap. A hold that has already begun is likewise
 * ended by any other key, so the cheat sheet cannot get stuck open. Window blur
 * resets both, because ⌘Tab leaves the page with the key still down and its
 * keyup is never delivered.
 */
export function useModifierKey({
  onTap,
  onHoldChange,
}: {
  onTap: () => void;
  onHoldChange: (holding: boolean) => void;
}) {
  const armed = useRef(false);
  const holding = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handlers = useRef({ onTap, onHoldChange });
  handlers.current = { onTap, onHoldChange };

  useEffect(() => {
    const endHold = () => {
      clearTimeout(timer.current);
      if (holding.current) {
        holding.current = false;
        handlers.current.onHoldChange(false);
      }
    };

    const reset = () => {
      armed.current = false;
      endHold();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const arms = shouldArm(
        event,
        isTyping(event.target),
        document.querySelector('dialog[open]') !== null
      );

      if (!arms) {
        // Any other key both cancels a pending tap and closes an open hold.
        if (event.key !== MODIFIER) reset();
        return;
      }

      armed.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        holding.current = true;
        handlers.current.onHoldChange(true);
      }, HOLD_MS);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== MODIFIER) return;
      const wasHolding = holding.current;
      const wasArmed = armed.current;
      armed.current = false;
      endHold();
      // A hold is not also a tap.
      if (wasArmed && !wasHolding) handlers.current.onTap();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', reset);
    window.addEventListener('blur', reset);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);
}
