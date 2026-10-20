import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { FILTER_FIELDS, isUsable } from '../taskFilter';
import type { Filter, FilterField } from '../taskFilter';

/**
 * Type a value, then pick the field it applies to — the buttons restate what
 * you typed so the filter you are about to add is legible before you add it.
 *
 * Stays open after adding, because filters combine with AND and adding two is
 * the normal case.
 */
export default function SearchDialog({
  filters,
  onAdd,
  onRemove,
  onClose,
}: {
  filters: Filter[];
  onAdd: (field: FilterField, value: string) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const ready = isUsable(value);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function add(field: FilterField) {
    onAdd(field, value);
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="search-dialog-title"
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2 id="search-dialog-title" className="mb-3 text-base font-semibold text-text-primary">
        Filter the board
      </h2>

      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Enter is the common case: filter by title.
          if (event.key === 'Enter' && ready) {
            event.preventDefault();
            add('title');
          }
        }}
        placeholder="What are you looking for?"
        aria-label="Filter value"
        className="w-full rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />

      <p className="mb-2 mt-3 text-xs text-text-muted">Match it against</p>
      <div className="flex flex-wrap gap-2">
        {FILTER_FIELDS.map((field) => (
          <button
            key={field.id}
            type="button"
            disabled={!ready}
            onClick={() => add(field.id)}
            className="rounded-full border border-line px-3 py-1 text-xs text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-40 disabled:hover:border-line"
          >
            {field.label}
            {ready && <span className="text-text-muted"> contains “{value.trim()}”</span>}
          </button>
        ))}
      </div>

      {filters.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-xs text-text-muted">
            Active filters · all must match
          </p>
          <ul className="flex flex-wrap gap-2">
            {filters.map((filter, index) => (
              <li key={`${filter.field}-${filter.value}`}>
                <FilterTag filter={filter} onRemove={() => onRemove(index)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="rounded-lg px-4 py-2 text-sm text-text-muted hover:opacity-70"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}

/** Shared by the dialog and the board header, so a tag looks the same in both. */
export function FilterTag({ filter, onRemove }: { filter: Filter; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 py-0.5 pl-2.5 pr-1 text-xs text-text-primary">
      <span className="font-mono text-text-muted">{filter.field}:</span>
      {filter.value}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${filter.field} contains ${filter.value}`}
        className="rounded-full p-0.5 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Icon name="close" className="h-3 w-3" />
      </button>
    </span>
  );
}
