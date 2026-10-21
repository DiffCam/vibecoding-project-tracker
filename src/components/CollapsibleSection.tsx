import type { ReactNode } from 'react';
import { useLocalStorage } from '../useLocalStorage';

/**
 * A section that collapses to just its header row, so the board can have the
 * screen when you want it. Open/closed is a view preference, so it lives in
 * localStorage under its own key rather than resetting every reload.
 *
 * `meta` stays visible while collapsed — a closed row should still tell you
 * something ("2/4 linked") rather than going blank.
 */
export default function CollapsibleSection({
  id,
  title,
  action,
  meta,
  children,
}: {
  id: string;
  title: string;
  /** Sits immediately right of the title — for a control that belongs to it. */
  action?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useLocalStorage<boolean>(`vibetracker.open.${id}`, true);
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3 w-3 shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none ${
              open ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          <h2 id={headingId} className="text-base font-semibold uppercase text-text-primary">
            {title}
          </h2>
        </button>

          {action}
        </div>

        {meta && <p className="font-mono text-xs text-text-muted">{meta}</p>}
      </div>

      {/* Hidden rather than unmounted, so aria-controls always points at a
          real element and the content keeps its state while closed. */}
      <div id={contentId} hidden={!open} className="mt-2">
        {children}
      </div>
    </section>
  );
}
