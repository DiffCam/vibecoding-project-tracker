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

/**
 * What to store when someone saves a deliverable link: the same http(s)-only
 * rule, but a bare `vercel.com/x` gets `https://` assumed the way a browser
 * address bar would. Null means "this is not a link" — the caller says so
 * rather than silently storing junk.
 *
 * Only safe because saving is now explicit: an unparseable value shows an
 * error instead of being quietly accepted while the user types.
 */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (value === '') return null;

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
  return safeUrl(hasScheme ? value : `https://${value}`);
}
