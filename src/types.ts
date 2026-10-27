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
export type ContextMode = 'simple' | 'spdd' | 'custom';

export interface Task {
  id: string; // UUID or timestamp
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  assignee: string; // Restricted to hardcoded team array
  dueDate: string | null; // ISO 'YYYY-MM-DD'
  createdDate: string; // ISO 'YYYY-MM-DD'
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
   * Which editor the context opens in.
   *
   * Per task rather than a global preference: a one-line bug does not need
   * seven prompts, and the choice should stay with the ticket. All three edit
   * the same markdown string, so this only picks the view.
   */
  contextMode: ContextMode;
  /** Which sprint the task sits in; null is unscheduled. */
  sprintId: string | null;
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
  /**
   * Present only on agents, and the thing that makes one an agent.
   *
   * Nested rather than two loose fields so the invalid state — a role on a
   * person, or an agent with nothing to say for itself — cannot be written.
   * Everything else about them is a teammate: they are assigned work, they
   * appear on the board, and Task.assignee still holds just the name.
   */
  agent?: {
    /** One line: "Frontend developer", "SecOps reviewer". */
    role: string;
    /** The detail behind the role. */
    context: string;
  };
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
