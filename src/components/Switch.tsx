import Icon from './Icon';

/**
 * An iOS-style switch. Both destinations ride on the track and the active one
 * rides in the knob, so it says what it *does*, not only what state it is in.
 *
 * role="switch" + aria-checked is the accessible equivalent of the control it
 * imitates, so it announces as "…, switch, on/off".
 *
 * Both sizes travel exactly 20px: 48−24−4 and 44−20−4 both come to 20.
 */
const SIZES = {
  md: { track: 'h-7 w-12', knob: 'h-6 w-6', knobIcon: 'h-3.5 w-3.5', railIcon: 'h-3 w-3' },
  sm: { track: 'h-6 w-11', knob: 'h-5 w-5', knobIcon: 'h-3.5 w-3.5', railIcon: 'h-3 w-3' },
} as const;

export default function Switch({
  checked,
  onChange,
  label,
  title,
  onIcon,
  offIcon,
  size = 'md',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  title?: string;
  onIcon: 'moon' | 'eye';
  offIcon: 'sun' | 'eye-off';
  size?: keyof typeof SIZES;
}) {
  const metrics = SIZES[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
        metrics.track
      } ${checked ? 'bg-brand-primary' : 'bg-text-muted'}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-between px-1 text-white/70"
      >
        <Icon name={offIcon} className={metrics.railIcon} />
        <Icon name={onIcon} className={metrics.railIcon} />
      </span>

      {/* left-0 anchors the knob explicitly. Without it the knob falls at its
          static position, which a button's default text-align:center puts in
          the middle of the track. */}
      <span
        aria-hidden="true"
        className={`absolute left-0.5 top-0.5 flex items-center justify-center rounded-full bg-surface-card text-text-primary transition-transform duration-200 motion-reduce:transition-none ${
          metrics.knob
        } ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      >
        <Icon name={checked ? onIcon : offIcon} className={metrics.knobIcon} />
      </span>
    </button>
  );
}
