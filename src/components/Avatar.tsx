import Icon from './Icon';

// Initials badge for a team member (REQUIREMENTS 4.C). Decorative — "CF" read
// aloud helps nobody, so callers render the full name as text or sr-only.
//
// An agent gets a robot glyph instead of initials: it is the one thing that
// has to be obvious at a glance on a card, where there is no room to say so
// in words.
export default function Avatar({
  name,
  accent,
  agent = false,
  small = false,
}: {
  name: string;
  accent?: string;
  agent?: boolean;
  /** 20px instead of 24px, to sit inside a form field without growing it. */
  small?: boolean;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      // Filled when a colour is known. Every palette entry clears 4.5:1 with
      // white, so the initials stay legible whichever one lands.
      style={accent ? { backgroundColor: accent, color: '#FFFFFF' } : undefined}
      className={`flex shrink-0 items-center justify-center rounded-full font-medium ${
        small ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'
      } ${accent ? '' : 'border border-line bg-surface-page text-text-primary'}`}
    >
      {agent ? <Icon name="robot" className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> : initials}
    </span>
  );
}
