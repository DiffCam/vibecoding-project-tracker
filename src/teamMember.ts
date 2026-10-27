import { TAG_PALETTE } from './tagColor';
import type { TeamMember } from './types';

/**
 * Cleans a typed GitHub handle, or returns undefined if it is not one.
 *
 * Forgiving about what gets pasted — a bare handle, "@handle", or the profile
 * URL all reduce to the same thing. Rejecting rather than storing junk matters
 * because the handle goes on to build a link.
 */
export function normalizeHandle(raw: string): string | undefined {
  const handle = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/\/+$/, '');

  // GitHub's own rule: alphanumerics and single hyphens, 39 characters max.
  return /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(handle)
    ? handle
    : undefined;
}

/** Safe because the handle has already been constrained to [A-Za-z0-9-]. */
export function githubUrl(handle: string): string {
  return `https://github.com/${handle}`;
}

/**
 * Cleans a typed email, or returns undefined if it is not one.
 *
 * Same contract as the handle, and for the same reason: this becomes a
 * `mailto:` link, so junk must be refused rather than stored. Deliberately
 * not an attempt at RFC 5322 — one @, something either side, a dot in the
 * domain, and no whitespace or characters that could break out of the URL.
 */
export function normalizeEmail(raw: string): string | undefined {
  const email = raw.trim();
  return /^[^\s@<>"'`]+@[^\s@<>"'`.]+(\.[^\s@<>"'`.]+)+$/.test(email)
    ? email.toLowerCase()
    : undefined;
}

/** Whether a teammate is an agent rather than a person. */
export function isAgent(member: TeamMember): boolean {
  return member.agent !== undefined;
}

/** The names on the roster that belong to agents, for lookups by name. */
export function agentNames(team: TeamMember[]): Set<string> {
  return new Set(team.filter(isAgent).map((member) => member.name));
}

/**
 * A colour per teammate, by position in the roster rather than by hashing the
 * name — same reasoning as tags, where hashing collided often enough to read
 * as a bug. Used as a ring, not a fill.
 */
export function memberAccent(name: string, team: TeamMember[]): string {
  const index = team.findIndex((member) => member.name === name);
  return TAG_PALETTE[(index === -1 ? 0 : index) % TAG_PALETTE.length];
}
