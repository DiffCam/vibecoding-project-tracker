/**
 * One choice from a few, as a track with a thumb that slides to it.
 *
 * The movement is what says the options are exclusive — separate pills read
 * as several independent toggles. Shared so the context-mode and
 * preview-mode selectors cannot drift apart.
 *
 * The thumb is positioned arithmetically from the option count, so adding a
 * fourth option needs no change here.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(
    0,
    options.findIndex(([option]) => option === value)
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      // A hairline as well as a fill: the track sits on the page in one place
      // and on the preview surface in another, and no single fill is distinct
      // from both — surface-card is invisible on the light preview, and
      // anything that works there is wrong on the page.
      className="relative grid rounded-full border border-line bg-surface-card p-0.5 text-xs"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        // Inset by the track's own padding so it never overhangs the edge.
        style={{
          width: `calc((100% - 0.25rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
        className="absolute inset-y-0.5 left-0.5 rounded-full bg-text-primary transition-transform duration-200 ease-out"
      />
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            option === value ? 'text-surface-card' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
