// The locked data model — PRD §5 / CLAUDE_PROJECT_BRIEF §2.
// Do not change without team agreement.

export type TaskType = 'feature' | 'bug';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
/**
 * Which assistant the context was written with.
 *
 * A free string rather than a union of the six we happen to list: "Other"
 * means someone types a name AI_TOOLS does not have, and pinning this to
 * literals would make that list a schema needing a release to extend.
 */
export type AITool = string | null;

/** simple = one box, spdd = the REASONS canvas, custom = sections you name. */
import type { ContextVersion } from './contextHistory';
import type { NoteVersion } from './agentNotes';
import type { TaskEntry } from './taskHistory';

export type ContextMode = 'simple' | 'spdd' | 'custom';

export interface Task {
  id: string; // UUID or timestamp
  /**
   * The short number a person uses to refer to this task — the `#12` on the
   * card. Stored rather than derived: position in the array is not stable
   * across a delete, and an identifier that renumbers itself is worse than
   * none. Assigned once, never reused, and never edited.
   */
  key: number;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  assignee: string; // Restricted to hardcoded team array
  dueDate: string | null; // ISO 'YYYY-MM-DD'
  createdDate: string; // ISO 'YYYY-MM-DD'
  /**
   * The account that made it. Empty on tasks that predate sign-in, which
   * is why an unknown creator never unlocks anything — see permissions.ts.
   */
  createdBy: string;
  context: string; // Markdown supported string
  contextTool: AITool;
  contextUpdatedAt: string | null; // ISO timestamp
  /**
   * Which milestone tab the task belongs to; null is the unfiled default.
   * An addition to the model PRD §5 calls locked — worth recording there.
   * Tasks saved before this existed read back as undefined, so every
   * comparison coalesces with `?? null`.
   */
  milestoneId: string | null;
  /** Free-form labels, optionally grouped as "Group:Name". See src/tags.ts. */
  tags: string[];
  /**
   * How much of a sprint this task is worth — points, days, whatever the team
   * agrees. A positive integer, defaulting to 1, so a board with nobody
   * estimating still adds up to a task count.
   *
   * Another addition to the model PRD §5 calls locked. Tasks saved before it
   * existed read back as undefined, which the reviver fills in.
   */
  weight: number;
  /**
   * Which editor the context opens in.
   *
   * Per task rather than a global preference: a one-line bug does not need
   * seven prompts, and the choice should stay with the ticket. All three edit
   * the same markdown string, so this only picks the view.
   */
  contextMode: ContextMode;
  /**
   * Past versions of `context`, oldest first, stored as patches rather than
   * snapshots. Replaying the chain from empty reproduces any version, and the
   * last one always equals `context`.
   *
   * Only the context is versioned: a save with no change to it records
   * nothing, so switching editor view is not a version of the content.
   */
  history: ContextVersion[];
  /**
   * One entry per save that altered something, newest last.
   *
   * Field values are stored as the text that was true at the time, so
   * renaming a milestone later does not rewrite what this task used to be in.
   * The context appears only as a jump between version numbers; its content
   * lives in `history`.
   */
  events: TaskEntry[];
  /** Which sprint the task sits in; null is unscheduled. */
  sprintId: string | null;
  /**
   * What came of the work, written when the task reaches Done.
   *
   * Separate from `context`, which is the brief going in — this is the
   * finding coming out, and keeping them apart is what lets a finished
   * task be read without unpicking which half is which.
   */
  outcome: string;
  /** Rendered as markdown rather than plain text. Off by default. */
  outcomeMarkdown: boolean;
}

export interface Sprint {
  id: string;
  /** null files the sprint under no milestone, so it shows only under All. */
  milestoneId: string | null;
  startDate: string; // ISO 'YYYY-MM-DD'
  days: number;
}

export interface TeamMember {
  name: string; // the value stored in Task.assignee
  /** A person's GitHub handle. Agents have none. */
  github?: string;
  /** A person's email. Validated, because it is rendered as a mailto link. */
  email?: string;
  /**
   * What a person does, for the roster only.
   *
   * Deliberately not part of any prompt: a person's job title is not context
   * an agent should be told about. An agent's role is, and lives below.
   */
  role?: string;
  /**
   * Present only on agents, and the thing that makes one an agent.
   *
   * Nested rather than loose fields so the invalid state — an agent with
   * nothing to say for itself — cannot be written. Everything else about them
   * is a teammate: they are assigned work, they appear on the board, and
   * Task.assignee still holds just the name.
   */
  agent?: {
    /** One line: "Frontend developer", "SecOps reviewer". */
    role: string;
    /** The detail behind the role. */
    context: string;
    /**
     * The same two things a task's and the project's context carry: which
     * editor it opens in, and the patch chain behind it. An agent's context
     * is a document like theirs, so it is versioned like theirs.
     */
    mode: ContextMode;
    history: ContextVersion[];
    /**
     * What the agent has written down for itself — the CLAUDE.md of this
     * board. Kept per agent and versioned, because the whole point is that
     * a memory an agent gave itself can be read back and corrected.
     */
    notes: AgentNote[];
  };
}

/**
 * One note an agent keeps.
 *
 * The title and the body version together: renaming a note is as much an
 * edit as rewriting it, and a history where the two could disagree would be
 * unreadable. `taskId` sits outside that chain — it says where the note came
 * from, which is not something a version of the text should record.
 */
export interface AgentNote {
  id: string;
  title: string;
  body: string;
  /** The task it came out of, if any. */
  taskId: string | null;
  history: NoteVersion[];
}

export interface Milestone {
  id: string;
  name: string;
}

export interface Anchor {
  id: 'presentation' | 'demo' | 'report' | 'documentation';
  label: string;
  url: string | null;
}
