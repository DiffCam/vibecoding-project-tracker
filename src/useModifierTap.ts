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

/**
 * Calls `onTap` when Cmd (macOS) or Ctrl is pressed and released on its own.
 *
 * Firing on keydown would trigger on the first half of every ⌘C, ⌘V and ⌘R, so
 * this waits for keyup and cancels the moment any other key or a click lands —
 * a chord is never a tap. Window blur cancels too, because ⌘Tab leaves the page
 * while the key is still down and its keyup is never delivered.
 */
export function useModifierTap(onTap: () => void) {
  const armed = useRef(false);
  const handler = useRef(onTap);
  handler.current = onTap;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      armed.current = shouldArm(
        event,
        isTyping(event.target),
        document.querySelector('dialog[open]') !== null
      );
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === MODIFIER && armed.current) {
        armed.current = false;
        handler.current();
      }
    };

    const disarm = () => {
      armed.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', disarm);
    window.addEventListener('blur', disarm);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', disarm);
      window.removeEventListener('blur', disarm);
    };
  }, []);
}
