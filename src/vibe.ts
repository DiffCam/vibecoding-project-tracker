import { dueState } from './dueState';
import type { Task } from './types';

export type VibeZone = 'letsgo' | 'ball' | 'back' | 'over' | 'vibing' | 'whatever' | 'mom';

/**
 * Every figure here is a sum of task weights, not a count of tasks.
 *
 * A board is not twenty equal things: one task worth 8 slipping matters more
 * than three worth 1 each, and a count says otherwise. Weight defaults to 1,
 * so a board where nobody estimates reads exactly as it did when these were
 * counts — the change only shows up once someone says a task is bigger.
 */
export type Vibe = {
  zone: VibeZone;
  /** 0–1. How much of the board's weight has left To Do. */
  energy: number;
  /** 0–1. How little of the unfinished weight is late. */
  pleasantness: number;
  /** Weight that has left To Do. */
  moving: number;
  /** Weight on the board. */
  total: number;
  overdue: number;
  soon: number;
  /** Weight not yet done — the only work that can be late. */
  active: number;
  /** How many tasks that weight is spread across, for the reading. */
  tasks: number;
};

/** Which register the meter speaks in. A reading, not a different metric. */
export type Tone = 'informal' | 'formal';

/**
 * The phrase and the colour token for each zone. Tokens resolve per theme in
 * index.css: the poster's palette is tuned for a white page and three of the
 * five fall under 3:1 as a dot on the light header.
 *
 * Two registers for the same seven readings. The maths does not change — a
 * zone is a region of the chart either way — but "Mom would be sad" does not
 * belong in front of a client, and "Critical" does not belong on a hackathon
 * board. The formal wording names the two axes rather than the mood: how far
 * the work has got, and whether it is late.
 */
export const VIBES: Record<VibeZone, { label: string; formal: string; token: string }> = {
  // Spelled as the chart spells it, because the chart is what the dialog shows.
  letsgo: { label: 'LETS GOOOOOO', formal: 'Ahead of plan', token: '--vibe-letsgo' },
  mom: { label: 'Mom would be sad', formal: 'Critical', token: '--vibe-mom' },
  ball: { label: 'Forget it, we ball', formal: 'Progressing, deadlines slipping', token: '--vibe-ball' },
  back: { label: 'We are so back', formal: 'On track', token: '--vibe-back' },
  over: { label: "It's so over", formal: 'Off track', token: '--vibe-over' },
  vibing: { label: 'We vibing', formal: 'On schedule, early days', token: '--vibe-vibing' },
  whatever: { label: 'It is what it is', formal: 'Needs attention', token: '--vibe-whatever' },
};

/** What to call a zone in the register currently selected. */
export function zoneLabel(zone: VibeZone, tone: Tone): string {
  return tone === 'formal' ? VIBES[zone].formal : VIBES[zone].label;
}

/** What the whole meter is called, and what each axis measures. */
export const WORDING: Record<Tone, { title: string; energy: string; pleasantness: string }> = {
  informal: { title: 'Vibe', energy: 'Energy', pleasantness: 'Pleasantness' },
  formal: { title: 'Project health', energy: 'Progress', pleasantness: 'Deadline health' },
};

/**
 * The zones as the chart actually draws them, in fractions of each axis.
 *
 * Not a tidy 2x2: "It is what it is" is a wide L wrapping the bottom-left,
 * and the two corner zones are small squares cut out of their quadrants. Each
 * entry is the corner the zone reaches toward — `p` along pleasantness, `e`
 * up energy — and the ORDER below is part of the definition, since every zone
 * excludes the ones tested before it.
 */
const EDGES = {
  mom: { p: 0.12, e: 0.12 },
  over: { p: 0.48, e: 0.48 },
  whatever: { p: 0.61, e: 0.64 },
  vibing: { p: 0.61, e: 0.48 },
  ball: { p: 0.48, e: 0.64 },
  letsgo: { p: 0.84, e: 0.9 },
};

/** Due soon is half a sin; overdue is a whole one. */
const SOON_WEIGHT = 0.5;

/**
 * The project's mood, as the two axes of the vibe meter.
 *
 * Energy is progression: weight that has left To Do. A board nobody has
 * started has none, and piling on new work lowers it, which is the honest
 * reading — scope added is progress undone.
 *
 * Pleasantness is lateness, inverted, over the work that can still be late.
 * Done tasks are excluded: a finished task cannot sour the mood, however long
 * it sat there.
 *
 * Both are weighted by `task.weight`, so an eight-point task slipping moves
 * the needle eight times as far as a one-pointer. A weight below 1 is treated
 * as 1: the field is clamped on the way in, but a hand-edited store should
 * not be able to make a task weigh nothing and vanish from the reading.
 *
 * Deliberately whole-project. It ignores the milestone tab and the sprint
 * filter, so the vibe does not swing every time the board is narrowed.
 */
export function vibe(tasks: Task[], now: Date = new Date()): Vibe {
  const weigh = (of: Task[]) => of.reduce((sum, task) => sum + Math.max(1, task.weight || 1), 0);

  const total = weigh(tasks);
  const moving = weigh(tasks.filter((task) => task.status !== 'todo'));
  const live = tasks.filter((task) => task.status !== 'done');
  const active = weigh(live);
  const overdue = weigh(live.filter((task) => dueState(task, now) === 'overdue'));
  const soon = weigh(live.filter((task) => dueState(task, now) === 'soon'));

  // An empty board has no mood either way, and dividing by it says nothing.
  const energy = total === 0 ? 0.5 : moving / total;
  const pleasantness = active === 0 ? 1 : 1 - (overdue + soon * SOON_WEIGHT) / active;

  return {
    zone: total === 0 ? 'whatever' : zoneAt(energy, pleasantness),
    energy,
    pleasantness,
    moving,
    total,
    overdue,
    soon,
    active,
    tasks: tasks.length,
  };
}

/**
 * The zone a point on the chart falls in.
 *
 * Exported so the chart in the dialog can be probed directly — reading a
 * position off the picture and asking what it maps to is the only way to
 * check the regions against the artwork.
 */
export function zoneAt(energy: number, pleasantness: number): VibeZone {
  const e = energy;
  const p = pleasantness;

  // Most specific first. Each test assumes the earlier ones have missed.
  if (p <= EDGES.mom.p && e <= EDGES.mom.e) return 'mom';
  if (p <= EDGES.over.p && e <= EDGES.over.e) return 'over';
  if (p <= EDGES.whatever.p && e <= EDGES.whatever.e) return 'whatever';
  if (p >= EDGES.vibing.p && e <= EDGES.vibing.e) return 'vibing';
  if (p <= EDGES.ball.p && e >= EDGES.ball.e) return 'ball';
  if (p >= EDGES.letsgo.p && e >= EDGES.letsgo.e) return 'letsgo';
  return 'back';
}
