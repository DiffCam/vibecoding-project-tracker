/**
 * Returns a pasted deliverable link only if it is safe to put in an href.
 *
 * Anything the user types ends up rendered as a link, so `javascript:` and
 * `data:` URLs have to be rejected here rather than trusted — this is the one
 * place in the app where stored text becomes executable.
 *
 * Doubles as the "is this a real link yet?" test behind the status dot (6.D),
 * so a half-typed address does not read as a finished deliverable.
 */
export function safeUrl(raw: string | null): string | null {
  if (raw === null || raw.trim() === '') return null;

  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null; // no scheme, or not a URL at all
  }
}
