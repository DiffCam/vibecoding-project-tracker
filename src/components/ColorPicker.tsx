import { TAG_PALETTE } from '../tagColor';

/**
 * The swatch grid behind "change this colour". Shared by tags and teammates so
 * both pickers look and behave identically.
 *
 * `onPick(null)` hands the key back to automatic assignment.
 */
export default function ColorPicker({
  label,
  current,
  onPick,
}: {
  label: string;
  current?: string;
  onPick: (colour: string | null) => void;
}) {
  return (
    <div className="rounded-lg bg-surface-page p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate font-mono text-xs text-text-muted">{label}</p>
        <button
          type="button"
          onClick={() => onPick(null)}
          className="shrink-0 text-xs text-text-muted underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Automatic
        </button>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {TAG_PALETTE.map((colour) => (
          <li key={colour}>
            <button
              type="button"
              onClick={() => onPick(colour)}
              aria-label={colour}
              aria-pressed={current === colour}
              title={colour}
              style={{ backgroundColor: colour }}
              className={`h-6 w-6 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                current === colour
                  ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-surface-page'
                  : ''
              }`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
