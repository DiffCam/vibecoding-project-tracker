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
 * `by` is the account that saved it. It used to be left out — there was no
 * sign-in, and the assignee is not reliably the person who edited — but
 * there is one now, so the record can name somebody honestly.
 */
export type ContextVersion = {
  /** ISO timestamp of the save. */
  at: string;
  /** The editor it was written in, so opening it restores that view. */
  mode: ContextMode;
  /** Turns the previous version into this one; the first turns '' into it. */
  patch: Splice;
  /** The signed-in account that saved it. Empty on versions predating sign-in. */
  by?: string;
};

/** How much moved, in lines. */
export type LineStat = { added: number; removed: number; modified: number };

/**
 * What changed between two versions, counted in lines.
 *
 * Common lines are trimmed from both ends and whatever is left in the middle
 * is the change. Lines that line up across that middle are counted as
 * modified, and the surplus on either side as added or removed — so
 * rewording a line reads as one modification rather than as a deletion and
 * an insertion, which is what anyone scanning the list actually wants.
 *
 * The same prefix/suffix idea as `diff`, one level up. Not a minimal diff:
 * two changes far apart make everything between them look modified. That is
 * the same bargain the patches themselves make, and for a few paragraphs of
 * context it costs nothing but an occasional over-count.
 */
export function lineStat(before: string, after: string): LineStat {
  // A genuinely empty document has no lines; ''.split('\n') claims one.
  const old = before === '' ? [] : before.split('\n');
  const now = after === '' ? [] : after.split('\n');

  let head = 0;
  while (head < old.length && head < now.length && old[head] === now[head]) head++;

  let tail = 0;
  while (
    tail < old.length - head &&
    tail < now.length - head &&
    old[old.length - 1 - tail] === now[now.length - 1 - tail]
  ) {
    tail++;
  }

  const gone = old.length - head - tail;
  const came = now.length - head - tail;
  const modified = Math.min(gone, came);
  return { added: came - modified, removed: gone - modified, modified };
}

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
