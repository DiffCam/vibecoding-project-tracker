import Switch from './Switch';

/** The theme control. All of its behaviour lives in the shared Switch. */
export default function ThemeToggle({
  dark,
  onChange,
}: {
  dark: boolean;
  onChange: (dark: boolean) => void;
}) {
  return (
    <Switch
      checked={dark}
      onChange={onChange}
      label="Dark mode"
      title={dark ? 'Switch to light mode (L)' : 'Switch to dark mode (D)'}
      onIcon="moon"
      offIcon="sun"
    />
  );
}
