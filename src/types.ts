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
}

export interface Anchor {
  id: 'presentation' | 'demo' | 'report' | 'documentation';
  label: string;
  url: string | null;
}
