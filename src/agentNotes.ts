import { applySplice, diff } from './contextHistory';
import type { Splice } from './contextHistory';

/**
 * One saved state of a note.
 *
 * The body is a splice patch forward-chained from empty, exactly as a task's
 * context is — same `diff`, same replay, same guarantees. The title is stored
 * whole: it is a line, and patching a line costs more than keeping it.
 *
 * Both live in one entry rather than two chains, because a rename and a
 * rewrite are the same event to anyone reading the history back.
 */
export type NoteVersion = {
  at: string;
  title: string;
  patch: Splice;
};

/** The note as it stood at `index`, by replaying the chain from empty. */
export function noteAt(history: NoteVersion[], index: number): { title: string; body: string } {
  let body = '';
  let title = '';
  for (let i = 0; i <= index && i < history.length; i++) {
    body = applySplice(body, history[i].patch);
    title = history[i].title;
  }
  return { title, body };
}

/**
 * Records a save, dropping anything after the version it was based on —
 * editing v2 when v3 exists replaces v3, the same as everywhere else here.
 * The caller warns before that happens.
 */
export function recordNote(
  history: NoteVersion[],
  basedOn: number,
  next: { at: string; title: string; body: string }
): NoteVersion[] {
  const kept = history.slice(0, basedOn + 1);
  return [
    ...kept,
    {
      at: next.at,
      title: next.title,
      patch: diff(noteAt(kept, kept.length - 1).body, next.body),
    },
  ];
}

/**
 * Whether a save would record anything.
 *
 * A note with no versions yet always has: that first save is what creates
 * v1, even for an empty note, so an untouched new note still shows up in its
 * own history rather than appearing from nowhere on the second edit.
 */
export function noteChanged(
  history: NoteVersion[],
  title: string,
  body: string
): boolean {
  if (history.length === 0) return true;
  const latest = noteAt(history, history.length - 1);
  return latest.title !== title || latest.body !== body;
}
