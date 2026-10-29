import type { Milestone, Sprint, Task, TaskStatus, TaskType, TeamMember } from './types';
import type { VibeZone } from './vibe';

export type Demo = {
  tasks: Task[];
  milestones: Milestone[];
  sprints: Sprint[];
  team: TeamMember[];
  /** Every tag the cast uses, so the library resolves their colours. */
  tags: string[];
};

/** Days from today, as a plain date. Keeps every scenario fresh on any day. */
function day(offset: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const TEAM: TeamMember[] = [
  { name: 'Cameron Farr', github: 'itscamfarr' },
  // No handle: a plausible-looking one belongs to a real person. An
  // example.com address is reserved by RFC 2606 and never will.
  { name: 'Robin Vale', email: 'robin@example.com' },
  { name: 'Theo Okafor' },
];

const MILESTONES: Milestone[] = [
  { id: 'demo-m1', name: 'MVP' },
  { id: 'demo-m2', name: 'Polish' },
];

/**
 * One cast, seven situations.
 *
 * The same eight tasks in every scenario — only their status and due date
 * move. A demo that swaps the whole project each time shows seven unrelated
 * boards; this shows one project going well or badly, which is the thing the
 * vibe meter is actually measuring.
 */
const CAST: {
  title: string;
  description: string;
  type: TaskType;
  assignee: string;
  milestoneId: string;
  tags: string[];
}[] = [
  {
    title: 'Prompt context on every card',
    description: 'One click puts the title, description and notes on the clipboard.',
    type: 'feature',
    assignee: 'Cameron Farr',
    milestoneId: 'demo-m1',
    tags: ['VIP'],
  },
  {
    title: 'Drag a card onto a sprint',
    description: 'Pointer drag and keyboard carry land on the same drop targets.',
    type: 'feature',
    assignee: 'Robin Vale',
    milestoneId: 'demo-m1',
    tags: ['System:Board'],
  },
  {
    title: 'Deliverable links go dead on reload',
    description: 'Anchor URLs come back empty after a refresh in Safari.',
    type: 'bug',
    assignee: 'Theo Okafor',
    milestoneId: 'demo-m1',
    tags: ['System:Storage'],
  },
  {
    title: 'Keyboard carry for groups',
    description: 'Option to select, Space to take, arrows to aim, Space to drop.',
    type: 'feature',
    assignee: 'Cameron Farr',
    milestoneId: 'demo-m1',
    tags: ['VIP', 'System:Board'],
  },
  {
    title: 'Due countdown misreads February',
    description: 'A task due on the 29th reads as overdue on the 28th in leap years.',
    type: 'bug',
    assignee: 'Robin Vale',
    milestoneId: 'demo-m2',
    tags: ['System:Dates'],
  },
  {
    title: 'Dark mode for the sprints row',
    description: 'Outlined pills need a per-theme nudge to clear contrast.',
    type: 'feature',
    assignee: 'Theo Okafor',
    milestoneId: 'demo-m2',
    tags: ['System:Theme'],
  },
  {
    title: 'Team avatars collide on initials',
    description: 'Two teammates with the same initials get the same colour.',
    type: 'bug',
    assignee: 'Cameron Farr',
    milestoneId: 'demo-m2',
    tags: ['System:Team'],
  },
  {
    title: 'Pitch script and run-through',
    description: 'Three minutes, one laptop, no live coding.',
    type: 'feature',
    assignee: 'Robin Vale',
    milestoneId: 'demo-m2',
    tags: ['VIP'],
  },
];

/**
 * Status and due-date offset per task, per zone.
 *
 * Energy is the share that has left To Do; pleasantness is how little of the
 * unfinished work is late. Every row is checked against `vibe()` in the
 * self-check, so a scenario cannot drift away from the zone it claims.
 */
const SCENARIOS: Record<VibeZone, { status: TaskStatus; due: number }[]> = {
  // Everything moved, nothing late: both axes at 1.0.
  letsgo: [
    { status: 'done', due: -6 },
    { status: 'done', due: -3 },
    { status: 'done', due: -1 },
    { status: 'review', due: 6 },
    { status: 'review', due: 8 },
    { status: 'in-progress', due: 9 },
    { status: 'in-progress', due: 11 },
    { status: 'in-progress', due: 14 },
  ],
  // Good, not flawless: one slipped, one tightening, one untouched. Kept well
  // clear of the LETS GOOOOOO corner — a scenario sitting 2pts from the next
  // zone demonstrates a boundary rather than a zone.
  back: [
    { status: 'done', due: -4 },
    { status: 'done', due: -2 },
    { status: 'review', due: 5 },
    { status: 'review', due: 1 },
    { status: 'in-progress', due: -2 },
    { status: 'in-progress', due: 9 },
    { status: 'in-progress', due: 12 },
    { status: 'todo', due: 15 },
  ],
  // Plenty in flight, most of it already late.
  ball: [
    { status: 'done', due: -9 },
    { status: 'done', due: -7 },
    { status: 'review', due: -4 },
    { status: 'review', due: -3 },
    { status: 'in-progress', due: -2 },
    { status: 'in-progress', due: -1 },
    { status: 'in-progress', due: 8 },
    { status: 'todo', due: 10 },
  ],
  // Barely started, and only one thing even close. Not a clean sweep: at 100%
  // the dot pins itself to the right edge of the chart.
  vibing: [
    { status: 'done', due: -2 },
    { status: 'in-progress', due: 9 },
    { status: 'todo', due: 1 },
    { status: 'todo', due: 13 },
    { status: 'todo', due: 16 },
    { status: 'todo', due: 18 },
    { status: 'todo', due: 21 },
    { status: 'todo', due: 24 },
  ],
  // Barely started and already behind.
  over: [
    { status: 'review', due: -6 },
    { status: 'in-progress', due: -5 },
    { status: 'todo', due: -4 },
    { status: 'todo', due: -3 },
    { status: 'todo', due: -2 },
    { status: 'todo', due: 12 },
    { status: 'todo', due: 15 },
    { status: 'todo', due: 18 },
  ],
  // Half moved and a few slipping: inside the L, which needs middling marks
  // on BOTH axes — a board with nothing late sails past it into "so back".
  // Sits ~4pts from an edge, which is about as central as this zone gets: the
  // L's arm is only 13pts wide, and energy comes in eighths with eight tasks.
  whatever: [
    { status: 'done', due: -5 },
    { status: 'review', due: -4 },
    { status: 'in-progress', due: -3 },
    { status: 'in-progress', due: -2 },
    { status: 'todo', due: 13 },
    { status: 'todo', due: 16 },
    { status: 'todo', due: 19 },
    { status: 'todo', due: 22 },
  ],
  // Nothing moved, everything late: both axes at 0.0.
  mom: [
    { status: 'todo', due: -14 },
    { status: 'todo', due: -12 },
    { status: 'todo', due: -11 },
    { status: 'todo', due: -9 },
    { status: 'todo', due: -7 },
    { status: 'todo', due: -5 },
    { status: 'todo', due: -3 },
    { status: 'todo', due: -1 },
  ],
};

/** A whole board that reads as `zone`, ready to drop into storage. */
export function buildDemo(zone: VibeZone, from: Date = new Date()): Demo {
  const plan = SCENARIOS[zone];

  return {
    team: TEAM,
    milestones: MILESTONES,
    tags: [...new Set(CAST.flatMap((card) => card.tags))],
    sprints: [
      { id: 'demo-s1', milestoneId: 'demo-m1', startDate: day(-10, from), days: 14 },
      { id: 'demo-s2', milestoneId: 'demo-m2', startDate: day(4, from), days: 14 },
    ],
    tasks: CAST.map((card, index) => ({
      id: `demo-${zone}-${index}`,
      title: card.title,
      description: card.description,
      type: card.type,
      status: plan[index].status,
      assignee: card.assignee,
      dueDate: day(plan[index].due, from),
      createdDate: day(-20, from),
      context: '',
      contextTool: null,
      contextUpdatedAt: null,
      milestoneId: card.milestoneId,
      tags: card.tags,
      // Each milestone's tasks sit in that milestone's sprint.
      sprintId: card.milestoneId === 'demo-m1' ? 'demo-s1' : 'demo-s2',
      contextMode: 'spdd',
      history: [],
      events: [],
      weight: 1,
      createdBy: 'Cameron Farr',
      outcome: '',
      outcomeMarkdown: false,
      key: index + 1,
    })),
  };
}
