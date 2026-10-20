import { useEffect, useRef } from 'react';

/**
 * A destructive-action confirm in the app's own style rather than the
 * browser's. Same native <dialog> as everything else, so the focus trap,
 * Escape and backdrop come from the platform.
 *
 * Focus lands on Cancel, not Confirm — a stray Enter should not delete.
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

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClose={onCancel}
      className="m-auto w-full max-w-sm rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2 id="confirm-title" className="text-base font-semibold text-text-primary">
        {title}
      </h2>
      <p id="confirm-message" className="mt-2 text-sm text-text-muted">
        {message}
      </p>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full bg-brand-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
