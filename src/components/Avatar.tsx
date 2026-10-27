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
}: {
  name: string;
  accent?: string;
  agent?: boolean;
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
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
        accent ? '' : 'border border-line bg-surface-page text-text-primary'
      }`}
    >
      {agent ? <Icon name="robot" className="h-3.5 w-3.5" /> : initials}
    </span>
  );
}
