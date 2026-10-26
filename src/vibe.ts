import { dueState } from './dueState';
import type { Task } from './types';

export type VibeZone = 'letsgo' | 'ball' | 'back' | 'over' | 'vibing' | 'whatever' | 'mom';

export type Vibe = {
  zone: VibeZone;
  /** 0–1. How much of the board has left To Do. */
  energy: number;
  /** 0–1. How little of the unfinished work is late. */
  pleasantness: number;
  moving: number;
  total: number;
  overdue: number;
  soon: number;
  /** Tasks not yet done — the only ones that can be late. */
  active: number;
};

/**
 * The phrase and the colour token for each zone. Tokens resolve per theme in
 * index.css: the poster's palette is tuned for a white page and three of the
 * five fall under 3:1 as a dot on the light header.
 */
export const VIBES: Record<VibeZone, { label: string; token: string }> = {
  // Spelled as the chart spells it, because the chart is what the dialog shows.
  letsgo: { label: 'LETS GOOOOOO', token: '--vibe-letsgo' },
  mom: { label: 'Mom would be sad', token: '--vibe-mom' },
  ball: { label: 'Forget it, we ball', token: '--vibe-ball' },
  back: { label: 'We are so back', token: '--vibe-back' },
  over: { label: "It's so over", token: '--vibe-over' },
  vibing: { label: 'We vibing', token: '--vibe-vibing' },
  whatever: { label: 'It is what it is', token: '--vibe-whatever' },
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
 * Energy is progression: tasks that have left To Do. A board nobody has
 * started has none, and piling on new work lowers it, which is the honest
 * reading — scope added is progress undone.
 *
 * Pleasantness is lateness, inverted, over the work that can still be late.
 * Done tasks are excluded: a finished task cannot sour the mood, however long
 * it sat there.
 *
 * Deliberately whole-project. It ignores the milestone tab and the sprint
 * filter, so the vibe does not swing every time the board is narrowed.
 */
export function vibe(tasks: Task[], now: Date = new Date()): Vibe {
  const total = tasks.length;
  const moving = tasks.filter((task) => task.status !== 'todo').length;
  const live = tasks.filter((task) => task.status !== 'done');
  const states = live.map((task) => dueState(task, now));
  const overdue = states.filter((state) => state === 'overdue').length;
  const soon = states.filter((state) => state === 'soon').length;

  // An empty board has no mood either way, and dividing by it says nothing.
  const energy = total === 0 ? 0.5 : moving / total;
  const pleasantness =
    live.length === 0 ? 1 : 1 - (overdue + soon * SOON_WEIGHT) / live.length;

  return {
    zone: total === 0 ? 'whatever' : zoneAt(energy, pleasantness),
    energy,
    pleasantness,
    moving,
    total,
    overdue,
    soon,
    active: live.length,
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
