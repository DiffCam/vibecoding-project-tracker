import { useEffect, useRef, useState } from 'react';
import ColorPicker from './ColorPicker';
import Icon from './Icon';
import { groupTags, hasTag, normalizeTag, parseTag } from '../tags';
import { colorFor, TAG_INK, tagColorKey } from '../tagColor';

/**
 * The tag library: create, review and remove the labels available to tasks.
 *
 * Grouping is a naming convention rather than a structure — type
 * "System:Users" and it files itself under System. That keeps a tag a plain
 * string everywhere else in the app.
 */
export default function TagsDialog({
  tags,
  usage,
  colors,
  onAdd,
  onRemove,
  onPickColor,
  onClose,
}: {
  tags: string[];
  /** How many tasks currently carry each tag, so removal is an informed choice. */
  usage: Record<string, number>;
  colors: Record<string, string>;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  /** `colour: null` hands the key back to automatic assignment. */
  onPickColor: (key: string, colour: string | null) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Which colour key has its swatches open, if any.
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function add(event: React.FormEvent) {
    event.preventDefault();
    const tag = normalizeTag(draft);
    if (tag === null) return setError('Give the tag a name.');
    if (hasTag(tags, tag)) return setError(`${tag} already exists.`);
    onAdd(tag);
    setDraft('');
    setError(null);
  }

  const preview = normalizeTag(draft);
  const grouped = groupTags(tags);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="tags-title"
      onClose={onClose}
      className="m-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2 id="tags-title" className="mb-1 text-base font-semibold text-text-primary">
        Tags
      </h2>
      <p className="mb-4 text-xs text-text-muted">
        A plain name like <span className="font-mono">VIP</span>, or{' '}
        <span className="font-mono">Group:Name</span> to file it under a group. Click a tag to
        recolour it.
      </p>

      <form onSubmit={add} noValidate className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          aria-label="New tag"
          aria-invalid={error !== null}
          aria-describedby={error ? 'tags-error' : undefined}
          placeholder="System:Users"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <button
          type="submit"
          disabled={preview === null}
          className="shrink-0 rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {error && (
        <p id="tags-error" role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      {preview && !hasTag(tags, preview) && (
        <p className="mt-2 text-xs text-text-muted">
          Adds <TagChip tag={preview} colors={colors} /> {parseTag(preview).group ? 'to that group' : 'on its own'}
        </p>
      )}

      {grouped.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">No tags yet.</p>
      ) : (
        <div className="mt-5 space-y-2">
          {grouped.map((bucket) => (
            // Group name sits on the same row as its tags rather than above
            // them — four groups of two should not be eight stacked blocks.
            <div key={bucket.group ?? '_ungrouped'} className="flex items-start gap-3">
              <p className="w-24 shrink-0 truncate pt-0.5 font-mono text-xs text-text-muted">
                {bucket.group ?? 'Ungrouped'}
              </p>
              <ul className="flex min-w-0 flex-wrap gap-1.5">
                {bucket.tags.map((tag) => {
                  const count = usage[tag] ?? 0;
                  return (
                    <li key={tag}>
                      <span
                        style={{ backgroundColor: colorFor(tag, colors), color: TAG_INK }}
                        className="inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-1 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setPicking((open) =>
                              open === tagColorKey(tag) ? null : tagColorKey(tag)
                            )
                          }
                          aria-expanded={picking === tagColorKey(tag)}
                          title={`Change the colour of ${parseTag(tag).group ?? tag}`}
                          className="rounded-full px-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          {parseTag(tag).name}
                        </button>
                        {count > 0 && (
                          <span
                            title={`On ${count} task${count === 1 ? '' : 's'}`}
                            className="rounded-full bg-black/30 px-1.5 text-[10px] tabular-nums"
                          >
                            {count}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemove(tag)}
                          aria-label={`Delete tag ${tag}${count > 0 ? `, used on ${count} task${count === 1 ? '' : 's'}` : ''}`}
                          title={
                            count > 0
                              ? `Delete — removes it from ${count} task${count === 1 ? '' : 's'}`
                              : 'Delete tag'
                          }
                          className="rounded-full p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <Icon name="close" className="h-3 w-3" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {picking !== null && (
            <ColorPicker
              label={picking}
              current={colors[picking]}
              onPick={(colour) => {
                onPickColor(picking, colour);
                setPicking(null);
              }}
            />
          )}
        </div>
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

/** The one place a tag's look is defined — cards, modal and library all use it. */
export function TagChip({ tag, colors }: { tag: string; colors: Record<string, string> }) {
  const { group, name } = parseTag(tag);
  return (
    <span
      style={{ backgroundColor: colorFor(tag, colors), color: TAG_INK }}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px]"
    >
      {group && <span className="font-mono opacity-75">{group}:</span>}
      {name}
    </span>
  );
}
