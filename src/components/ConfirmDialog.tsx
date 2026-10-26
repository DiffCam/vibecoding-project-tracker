import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * A destructive-action confirm in the app's own style rather than the
 * browser's. Same native <dialog> as everything else, so the focus trap,
 * Escape and backdrop come from the platform.
 *
 * Focus lands on Cancel, and the arrows move between the two buttons so a
 * board action confirmed from the keyboard never has to reach for Tab.
 *
 * Cancel first matters most where this opens mid-keystroke: a drop commits on
 * Space *keydown*, so the keyup of that same press arrives after the dialog is
 * already up. A button is only activated by a keyup whose keydown it also
 * received, so that one cannot leak through — but a second, deliberate press
 * can, and it should land on the harmless choice.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  /** Two choices, so every arrow just means "the other one". */
  function onKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const other =
      document.activeElement === confirmRef.current ? cancelRef : confirmRef;
    other.current?.focus();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClose={onCancel}
      onKeyDown={onKeyDown}
      className="m-auto w-full max-w-sm rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2 id="confirm-title" className="text-base font-semibold text-text-primary">
        {title}
      </h2>
      <p id="confirm-message" className="mt-2 text-sm text-text-muted">
        {message}
      </p>

      <div className="mt-6 flex items-center justify-between gap-4">
        {/* Kept short: the dialog is 384px wide and the buttons need most of
            it. Escape is left unsaid — it is a modal, and every other one in
            the app closes the same way. */}
        <p aria-hidden="true" className="font-mono text-xs text-text-muted">
          ← → choose · Space picks
        </p>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            autoFocus
            ref={cancelRef}
            onClick={() => dialogRef.current?.close()}
            className="rounded-full border border-line px-4 py-1.5 text-sm text-text-primary hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className="rounded-full bg-brand-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
