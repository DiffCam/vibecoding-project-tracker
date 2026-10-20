import Icon from './Icon';

// An iOS-style switch: pill track, sliding knob, 200 ms ease.
// role="switch" + aria-checked is the native-feeling control's accessible
// equivalent, so screen readers announce "Dark mode, switch, on/off".
export default function ThemeToggle({
  dark,
  onChange,
}: {
  dark: boolean;
  onChange: (dark: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode (L)' : 'Switch to dark mode (D)'}
      onClick={() => onChange(!dark)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
        dark ? 'bg-brand-primary' : 'bg-text-muted'
      }`}
    >
      {/* Both destinations sit on the track, so the switch says what it does
          rather than only what state it is in. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-between px-1.5 text-white/70"
      >
        <Icon name="sun" className="h-3 w-3" />
        <Icon name="moon" className="h-3 w-3" />
      </span>

      {/* left-0 anchors the knob explicitly. Without it the knob falls at its
          static position, which a button's default text-align:center puts in
          the middle of the track. 28x48 track, 24px knob, 2px inset: travel
          is exactly 20px. */}
      <span
        aria-hidden="true"
        className={`absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-card text-text-primary transition-transform duration-200 motion-reduce:transition-none ${
          dark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        <Icon name={dark ? 'moon' : 'sun'} className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
