import type { Anchor, TaskStatus, TaskType, TeamMember } from './types';

// The four columns of the board, in render order (PRD §7).
// Use these IDs everywhere — do not invent new ones.
export const STAGES: readonly { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

// PRD §8 — the starting roster. The live list is editable and lives in
// localStorage under 'vibetracker.team'; this is only the first-run default.
// B and C are placeholders so hand-off is demoable; rename them in the app.
export const DEFAULT_TEAM: TeamMember[] = [
  { name: 'Cameron Farr', github: 'DiffCam' },
  { name: 'Teammate B' },
  { name: 'Teammate C' },
];

// REQUIREMENTS 6.B — exactly these four slots, in this order. Only `url` ever
// changes, so this doubles as the default state for the anchors key.
export const SEED_ANCHORS: Anchor[] = [
  { id: 'presentation', label: 'Presentation', url: null },
  { id: 'demo', label: 'Demo', url: null },
  { id: 'report', label: 'Report', url: null },
  { id: 'documentation', label: 'Documentation', url: null },
];

// REQUIREMENTS 5.C — the only tools the context dropdown offers.
export const AI_TOOLS = ['Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other'] as const;

// REQUIREMENTS 5.B — every new task starts from the same four headings, so a
// briefing is a fill-in-the-blanks job rather than a blank page at 11pm.
export const CONTEXT_TEMPLATE = `## Background

## Constraints

## Tried so far

## Pick up
`;

// DESIGN.md §2 task-type accents. Written out per type rather than built as
// `bg-type-${type}` because Tailwind only emits classes it can see as literals.
export const TYPE_ACCENT: Record<TaskType, { fill: string; label: string }> = {
  feature: { fill: 'bg-type-feature', label: 'Feature' },
  bug: { fill: 'bg-type-bug', label: 'Bug' },
};

/** The dot that links a lane title to a task pill — one key, used in both. */
export const STATUS_DOT: Record<TaskStatus, string> = {
  todo: 'bg-status-todo',
  'in-progress': 'bg-status-progress',
  review: 'bg-status-review',
  done: 'bg-status-done',
};

// DESIGN.md §2 due states as a solid fill. Text colour differs per state
// because the fills do: near-black reads 7.6:1 on the green and 11.1:1 on the
// yellow, but only 4.7:1 on red — marginal, and perceptually worse than the
// number suggests. Overdue therefore uses a deeper red carrying white (5.4:1).
export const DUE_PILL: Record<'overdue' | 'soon' | 'safe', string> = {
  overdue: 'bg-due-overdue text-white', // the only band white reads better on
  soon: 'bg-due-warning text-ink',
  safe: 'bg-due-safe text-ink',
};
