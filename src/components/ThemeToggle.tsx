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
    <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
      Dark
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        onClick={() => onChange(!dark)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
          dark ? 'bg-brand-primary' : 'bg-text-muted'
        }`}
      >
        {/* left-0.5 anchors the knob explicitly. Without it the knob falls at
            its static position, which a button's default text-align:center puts
            in the middle of the track — the misalignment. 24x40 track, 20px
            knob, 2px inset: travel is exactly 16px. */}
        <span
          aria-hidden="true"
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${
            dark ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
