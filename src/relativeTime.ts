// REQUIREMENTS 5.E — "last updated 2 hours ago" next to the Context field.
// Intl.RelativeTimeFormat does the wording, plurals and "yesterday" for us.
const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/**
 * Returns null for a timestamp that will not parse — contextUpdatedAt comes
 * back out of localStorage, where anything could have been written to it, and
 * Intl throws a RangeError on NaN rather than degrading.
 */
export function relativeTime(iso: string, now: Date = new Date()): string | null {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const seconds = Math.round((then - now.getTime()) / 1000); // negative = in the past

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RTF.format(Math.round(seconds / size), unit);
  }
  return RTF.format(0, 'second'); // "now"
}
