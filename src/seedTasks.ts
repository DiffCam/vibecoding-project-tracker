import type { Task } from './types';

// First-load demo data (REQUIREMENTS 1.B / 1.E) — one task per column, with the
// In Progress task carrying a fully filled-in prompt context for the pitch demo.
// Dates are fixed constants, not new Date(), so the seed never shifts under us.
export const SEED_TASKS: Task[] = [
  {
    id: 'seed-1',
    title: 'Build the Anchor Board',
    description:
      'Four pinned deliverable slots (Presentation, Demo, Report, Documentation) with a URL field and a filled/empty status dot on each.',
    type: 'feature',
    status: 'todo',
    assignee: 'Cameron Farr',
    dueDate: '2026-10-24',
    createdDate: '2026-10-19',
    context: '',
    contextTool: null,
    contextUpdatedAt: null,
    milestoneId: null,
    tags: [],
    sprintId: null,
    contextMode: 'simple',
    history: [],
    events: [],
    weight: 1,
    createdBy: 'Cameron Farr',
    outcome: '',
    outcomeMarkdown: false,
    key: 1,
  },
  {
    id: 'seed-2',
    title: 'Copy as Prompt Context button',
    description:
      'One click should put the task title, description and markdown context on the clipboard, ready to paste into an AI chat.',
    type: 'feature',
    status: 'in-progress',
    assignee: 'Cameron Farr',
    dueDate: '2026-10-21',
    createdDate: '2026-10-19',
    context: `## Background

The whole point of the tracker: two days later nobody remembers the prompt that
produced the working code. Every card carries its own briefing so any teammate —
or any model — can pick the thread back up cold.

## Constraints

- \`navigator.clipboard.writeText\` only. No library, no fallback \`textarea\` hack.
- Output is plain Markdown, pasteable into Claude, ChatGPT or Cursor unchanged.
- The button sits on the **card**, not just the modal (REQUIREMENTS 5.F).

## Tried so far

Serializing with a template literal rather than a builder — it stays readable:

\`\`\`ts
const asPrompt = (t: Task) =>
  \`# \${t.title}\\n\\n\${t.description}\\n\\n---\\n\\n\${t.context}\`;
\`\`\`

Clipboard write needs a user gesture, so it has to live in the click handler —
it cannot be hoisted into an effect.

## Pick up

1. Decide whether assignee and due date belong in the copied block.
2. Wire the "Context copied. Ready to paste." toast (DESIGN.md §5).
3. Confirm the fenced code block survives the round-trip into a chat window.`,
    contextTool: 'Claude',
    contextUpdatedAt: '2026-10-20T09:14:00.000Z',
    milestoneId: null,
    tags: ['VIP', 'System:Clipboard'],
    sprintId: null,
    contextMode: 'simple',
    history: [],
    events: [],
    weight: 1,
    createdBy: 'Cameron Farr',
    outcome: '',
    outcomeMarkdown: false,
    key: 2,
  },
  {
    id: 'seed-3',
    title: 'Due-date tinting ignores Done',
    description:
      'A completed task still shows the red overdue tint. Status "done" should override every other due-date state.',
    type: 'bug',
    status: 'review',
    assignee: 'Cameron Farr',
    dueDate: '2026-10-18',
    createdDate: '2026-10-17',
    context: '',
    contextTool: null,
    contextUpdatedAt: null,
    milestoneId: null,
    tags: ['System:Clipboard'],
    sprintId: null,
    contextMode: 'simple',
    history: [],
    events: [],
    weight: 1,
    createdBy: 'Cameron Farr',
    outcome: '',
    outcomeMarkdown: false,
    key: 3,
  },
  {
    id: 'seed-4',
    title: 'Pick the palette and typography',
    description:
      'DESIGN.md §2 and §3: brand hexes in tailwind.config.js, Inter for heading and body, JetBrains Mono for badges.',
    type: 'feature',
    status: 'done',
    assignee: 'Cameron Farr',
    dueDate: '2026-10-19',
    createdDate: '2026-10-17',
    context: '',
    contextTool: null,
    contextUpdatedAt: null,
    milestoneId: null,
    tags: [],
    sprintId: null,
    contextMode: 'simple',
    history: [],
    events: [],
    weight: 1,
    createdBy: 'Cameron Farr',
    outcome: '',
    outcomeMarkdown: false,
    key: 4,
  },
];
