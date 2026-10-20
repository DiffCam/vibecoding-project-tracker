// Initials badge for a team member (REQUIREMENTS 4.C). Decorative — "CF" read
// aloud helps nobody, so callers render the full name as text or sr-only.
export default function Avatar({ name }: { name: string }) {
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
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-surface-page text-[10px] font-medium text-text-primary"
    >
      {initials}
    </span>
  );
}
