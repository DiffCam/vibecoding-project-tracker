import { safeUrl } from '../safeUrl';
import type { Anchor } from '../types';

// REQUIREMENTS §6 — the four final deliverables, pinned above the board.
export default function AnchorBoard({
  anchors,
  onChange,
}: {
  anchors: Anchor[];
  onChange: (id: Anchor['id'], url: string) => void;
}) {
  return (
    <section aria-labelledby="anchors-heading" className="mb-6">
      <h2 id="anchors-heading" className="mb-3 text-base font-semibold uppercase text-text-primary">
        Deliverables
      </h2>

      <ul className="flex items-start gap-4">
        {anchors.map((anchor) => {
          // Only a parseable http(s) link counts as filled (6.D), so a
          // half-typed address does not light the dot.
          const href = safeUrl(anchor.url);
          const inputId = `anchor-${anchor.id}`;

          return (
            <li
              key={anchor.id}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-surface-card p-3"
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    href ? 'bg-brand-primary' : 'border border-gray-400'
                  }`}
                  aria-hidden="true"
                />
                <label htmlFor={inputId} className="truncate text-xs text-text-muted">
                  {anchor.label}
                </label>
                {/* The dot is colour-only, so the state is also said in words. */}
                <span className="sr-only">{href ? 'Link added' : 'No link yet'}</span>

                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto shrink-0 text-xs text-text-primary underline hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    Open
                  </a>
                )}
              </div>

              <input
                id={inputId}
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={anchor.url ?? ''}
                onChange={(event) => onChange(anchor.id, event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-surface-page px-2 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
