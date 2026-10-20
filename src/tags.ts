const MAX_TAG = 32;

/**
 * A tag is either a bare label ("VIP") or a grouped one ("System:Users").
 * The group is everything before the first colon — later colons are part of
 * the name, so "Env:prod:eu" groups under "Env".
 */
export function parseTag(tag: string): { group: string | null; name: string } {
  const at = tag.indexOf(':');
  if (at === -1) return { group: null, name: tag };
  return { group: tag.slice(0, at), name: tag.slice(at + 1) };
}

/**
 * Cleans a typed tag, or returns null if there is nothing usable in it.
 * Spaces around the colon are forgiving — "System : Users" is the same tag as
 * "System:Users", otherwise near-identical tags pile up in the library.
 */
export function normalizeTag(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (collapsed === '') return null;

  const { group, name } = parseTag(collapsed);
  const cleanName = name.trim();
  if (cleanName === '') return null; // "VIP:" is not a tag

  const cleanGroup = group?.trim();
  const joined = cleanGroup ? `${cleanGroup}:${cleanName}` : cleanName;
  return joined.slice(0, MAX_TAG);
}

/** Case-insensitive membership, so "vip" and "VIP" are not two separate tags. */
export function hasTag(tags: string[], tag: string): boolean {
  return tags.some((existing) => existing.toLowerCase() === tag.toLowerCase());
}

/** Groups first, in the order they appear, with ungrouped tags last. */
export function groupTags(tags: string[]): { group: string | null; tags: string[] }[] {
  const groups: { group: string | null; tags: string[] }[] = [];

  for (const tag of tags) {
    const { group } = parseTag(tag);
    const bucket = groups.find((candidate) => candidate.group === group);
    if (bucket) bucket.tags.push(tag);
    else groups.push({ group, tags: [tag] });
  }

  // Ungrouped last: a flat list under the named groups reads as "everything else".
  return groups.sort((a, b) => Number(a.group === null) - Number(b.group === null));
}
