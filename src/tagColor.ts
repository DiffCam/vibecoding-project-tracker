import { parseTag } from './tags';

/**
 * Thirty hues, every one of which clears WCAG AA against white text — the
 * worst pair is 4.92:1. Each chip carries both its background and its text
 * colour, so it is self-contained: the surface underneath cannot break it, in
 * either theme.
 *
 * Applied as inline styles rather than Tailwind classes, because the colour is
 * computed and Tailwind only emits classes it can see written out.
 */
export const TAG_PALETTE = [
  '#9A3412', '#C2410C', '#B45309', '#A16207', '#854D0E',
  '#4D7C0F', '#3F6212', '#15803D', '#166534', '#047857',
  '#0F766E', '#115E59', '#0E7490', '#155E75', '#0369A1',
  '#1D4ED8', '#1E40AF', '#4338CA', '#5B21B6', '#6D28D9',
  '#7E22CE', '#86198F', '#A21CAF', '#9D174D', '#BE123C',
  '#9F1239', '#B91C1C', '#44403C', '#57534E', '#3F3F46',
] as const;

/** White everywhere — see the contrast note above. */
export const TAG_INK = '#FFFFFF';

/**
 * What a colour belongs to: the group, or the whole tag if ungrouped. Picking
 * a colour for "System:Users" therefore recolours every System tag.
 */
export function tagColorKey(tag: string): string {
  const { group } = parseTag(tag);
  return (group ?? tag).toLowerCase();
}

/** Stable fallback for a tag that is on a task but no longer in the library. */
function hashKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * The colour of every key in the library, resolved once.
 *
 * Automatic colours go by order of first appearance rather than by hashing the
 * name. Hashing looks tidier but collides: with thirty colours and eight
 * groups there is a 64% chance two come out identical, which reads as a bug.
 * Order gives none until the palette is exhausted.
 *
 * A chosen colour wins over the automatic one, and is skipped when handing out
 * automatic colours so a pick cannot be duplicated by its neighbour.
 */
export function resolveTagColors(
  allTags: string[],
  chosen: Record<string, string> = {}
): Record<string, string> {
  const keys: string[] = [];
  for (const tag of allTags) {
    const key = tagColorKey(tag);
    if (!keys.includes(key)) keys.push(key);
  }
  return assignColors(keys, chosen);
}

/**
 * The palette is ordered by hue family, so walking it one at a time hands
 * neighbouring keys near-identical colours — the first two sprints would both
 * be burnt orange, ΔE 13 apart. Striding by 11 jumps hue families instead:
 * adjacent assignments land ΔE 79 apart across the first six, and since
 * gcd(11, 30) = 1 every colour is still used before any repeats.
 */
const STRIDE = 11;

/**
 * Hands every key a colour: the one it was given, or the next unused one.
 * Shared by tags, teammates and sprints so all three behave the same way — a
 * pick sticks, and automatic assignment never duplicates a pick.
 */
export function assignColors(
  keys: string[],
  chosen: Record<string, string> = {}
): Record<string, string> {
  const taken = new Set(keys.map((key) => chosen[key]).filter(Boolean));
  const strided = TAG_PALETTE.map(
    (_, index) => TAG_PALETTE[(index * STRIDE) % TAG_PALETTE.length]
  );
  const available = strided.filter((colour) => !taken.has(colour));

  const resolved: Record<string, string> = {};
  let next = 0;
  for (const key of keys) {
    if (chosen[key]) {
      resolved[key] = chosen[key];
    } else {
      resolved[key] = available.length
        ? available[next++ % available.length]
        : strided[next++ % strided.length];
    }
  }
  return resolved;
}

/**
 * The palette tuned for use as text or an outline rather than as a fill.
 *
 * These colours are chosen so WHITE sits on them at 4.9:1 or better, which
 * makes them too close in luminance to be read ON a surface: as text they
 * manage only 3.60:1 on the light row and 1.71:1 on the dark one. Nudging
 * each one away from the surface behind it — darker on light, lighter on
 * dark — clears AA both ways off a single palette, and works just as well
 * for a colour picked by hand.
 */
export function accentInk(colour: string, dark: boolean): string {
  const [target, amount] = dark ? [255, 0.4] : [0, 0.2];
  const channels = colour.replace('#', '').match(/../g) ?? [];

  return (
    '#' +
    channels
      .map((pair) => {
        const value = Math.round(parseInt(pair, 16) * (1 - amount) + target * amount);
        return value.toString(16).padStart(2, '0');
      })
      .join('')
  );
}

/** A tag's colour, falling back to a stable hash if it is not in the library. */
export function colorFor(tag: string, colors: Record<string, string>): string {
  const key = tagColorKey(tag);
  return colors[key] ?? TAG_PALETTE[hashKey(key) % TAG_PALETTE.length];
}
