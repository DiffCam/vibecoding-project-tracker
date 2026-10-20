import { useState } from 'react';
import { normalizeUrl, safeUrl } from '../safeUrl';
import CollapsibleSection from './CollapsibleSection';
import type { Anchor } from '../types';

// REQUIREMENTS §6 — the four final deliverables, pinned above the board.
export default function AnchorBoard({
  anchors,
  onChange,
}: {
  anchors: Anchor[];
  onChange: (id: Anchor['id'], url: string | null) => void;
}) {
  const linked = anchors.filter((anchor) => safeUrl(anchor.url)).length;

  return (
    <CollapsibleSection
      id="deliverables"
      title="Deliverables"
      meta={`${linked}/${anchors.length} linked`}
    >
      <ul className="grid grid-cols-4 gap-3">
        {anchors.map((anchor) => (
          // Remount on save so the draft resets to whatever was stored.
          <li key={anchor.id}>
            <AnchorSlot key={anchor.url ?? 'empty'} anchor={anchor} onChange={onChange} />
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}

function AnchorSlot({
  anchor,
  onChange,
}: {
  anchor: Anchor;
  onChange: (id: Anchor['id'], url: string | null) => void;
}) {
  const href = safeUrl(anchor.url);
  const [draft, setDraft] = useState(anchor.url ?? '');
  const [error, setError] = useState<string | null>(null);

  const dirty = draft.trim() !== '';

  function save(event: React.FormEvent) {
    event.preventDefault();

    if (draft.trim() === '') {
      onChange(anchor.id, null); // clearing the field clears the link
      setError(null);
      return;
    }

    const url = normalizeUrl(draft);
    if (url === null) {
      setError('Needs to be a valid http(s) link.');
      return;
    }

    setError(null);
    onChange(anchor.id, url);
  }

  return (
    // Filled and empty are different materials, not just a different dot:
    // a brand tint once it is done, the header tone while it is not.
    // noValidate + type="text": the browser's own url validation rejects a bare
    // "vercel.com" before our handler ever runs, which is the whole point of
    // normalizeUrl. We validate on save instead.
    <form
      onSubmit={save}
      noValidate
      className={`flex h-full flex-col gap-2 rounded-lg p-3 ${
        href ? 'bg-brand-primary/10' : 'bg-surface-chrome'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            href ? 'bg-brand-primary' : 'border border-text-muted'
          }`}
        />
        <span className="truncate text-sm font-medium text-text-primary">{anchor.label}</span>
        {/* The dot is colour-only, so the state is also said in words. */}
        <span className="sr-only">{href ? 'Link added' : 'No link yet'}</span>
      </div>

      {href ? (
        // Saved: the link is the content. Editing means clearing it first, so a
        // stray keystroke cannot quietly detach a deliverable.
        <div className="flex items-center gap-2">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate font-mono text-xs text-text-primary underline hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            {href}
          </a>
          <button
            type="button"
            onClick={() => onChange(anchor.id, null)}
            className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-text-muted hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="url"
            aria-label={`${anchor.label} link`}
            placeholder="paste a link"
            value={draft}
            aria-invalid={error !== null}
            aria-describedby={error ? `anchor-error-${anchor.id}` : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            className="min-w-0 flex-1 rounded-md border border-line bg-surface-card px-2 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button
            type="submit"
            disabled={!dirty}
            className="shrink-0 rounded-full bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-40 disabled:hover:opacity-40"
          >
            Save
          </button>
        </div>
      )}

      {error && (
        <p id={`anchor-error-${anchor.id}`} role="alert" className="text-xs text-brand-accent">
          {error}
        </p>
      )}
    </form>
  );
}
