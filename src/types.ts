// The locked data model — PRD §5 / CLAUDE_PROJECT_BRIEF §2.
// Do not change without team agreement.

export type TaskType = 'feature' | 'bug';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type AITool = 'Claude' | 'ChatGPT' | 'Cursor' | 'Lovable' | 'Replit' | 'Other' | null;

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
  /** Which sprint the task sits in; null is unscheduled. */
  sprintId: string | null;
}

export interface Sprint {
  id: string;
  /** null keeps the sprint visible under every milestone tab. */
  milestoneId: string | null;
  startDate: string; // ISO 'YYYY-MM-DD'
  days: number;
}

export interface TeamMember {
  name: string; // the value stored in Task.assignee
  github?: string;
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
