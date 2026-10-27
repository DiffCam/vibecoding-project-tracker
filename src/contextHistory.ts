import type { ContextMode } from './types';

/**
 * One edit, as the span it replaced and what replaced it.
 *
 * A single splice rather than a real diff: find the common prefix and suffix
 * of the two versions and store the middle. It is exact, it reverses by
 * construction, and for a normal edit it stores only what was typed.
 *
 * The cost is that two changes far apart produce one patch spanning both, so
 * this is not minimal — at worst it degrades to storing the whole text, which
 * for a few kilobytes of context is a price worth paying to avoid a diff
 * algorithm and the bugs that come with one.
 */
export type Splice = { at: number; remove: number; insert: string };

/**
 * A saved state of a task's context. Nothing about the project or agent
 * tiers — those are shared and not versioned per task.
 *
 * No "saved by": there is no sign-in here, and the assignee is not reliably
 * the person who edited, so a name on these cards would usually be wrong.
 */
export type ContextVersion = {
  /** ISO timestamp of the save. */
  at: string;
  /** The editor it was written in, so opening it restores that view. */
  mode: ContextMode;
  /** Turns the previous version into this one; the first turns '' into it. */
  patch: Splice;
};

/** The patch that turns `before` into `after`. */
export function diff(before: string, after: string): Splice {
  const max = Math.min(before.length, after.length);

  let start = 0;
  while (start < max && before[start] === after[start]) start++;

  // Stop before overlapping the prefix: "aa" -> "aaa" must not count the
  // same character twice at both ends.
  let end = 0;
  while (
    end < max - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }

  return {
    at: start,
    remove: before.length - start - end,
    insert: after.slice(start, after.length - end),
  };
}

export function applySplice(text: string, { at, remove, insert }: Splice): string {
  return text.slice(0, at) + insert + text.slice(at + remove);
}

/**
 * The context as it stood at `index`, by replaying the chain from empty.
 *
 * Forward-only, so there is one direction to get wrong instead of two. The
 * chain is short — one entry per save — and each step is a string splice.
 */
export function contextAt(history: ContextVersion[], index: number): string {
  let text = '';
  for (let i = 0; i <= index && i < history.length; i++) {
    text = applySplice(text, history[i].patch);
  }
  return text;
}

/** The newest stored context, which should always equal the task's own. */
export function latestContext(history: ContextVersion[]): string {
  return contextAt(history, history.length - 1);
}

/**
 * Records a save, dropping anything that came after the version it was based
 * on — editing v9 when v10 exists replaces v10, the same way an undo branch
 * is lost once you type over it. The caller warns before this happens.
 */
export function recordVersion(
  history: ContextVersion[],
  basedOn: number,
  next: Omit<ContextVersion, 'patch'> & { context: string }
): ContextVersion[] {
  const kept = history.slice(0, basedOn + 1);
  const { context, ...meta } = next;
  return [...kept, { ...meta, patch: diff(contextAt(kept, kept.length - 1), context) }];
}
