// Initials badge for a team member (REQUIREMENTS 4.C). Decorative — "CF" read
// aloud helps nobody, so callers render the full name as text or sr-only.
export default function Avatar({ name, accent }: { name: string; accent?: string }) {
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
      {initials}
    </span>
  );
}
