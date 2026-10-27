import type { Task } from './types';

/**
 * The standing context around a task, widest first.
 *
 * Three tiers: the project, the agent doing the work, and the task itself.
 * The first two are shared and change rarely; the third is on the card. Only
 * the task is required, so a board with neither of the others still copies
 * exactly what it always did.
 */
export type Brief = {
  /** Context for the whole project, if any has been written. */
  project?: string;
  /** The assignee's standing brief — only agents have one. */
  agent?: { name: string; role: string; context: string };
};

/**
 * REQUIREMENTS 5.G — title, description and Markdown context as one block,
 * ready to paste straight into Claude/ChatGPT/Cursor.
 *
 * Who you are, then what we are building, then the job. The persona leads
 * because it frames how everything after it should be read. Empty sections
 * are dropped
 * rather than pasted as blank headings — a task with no description should
 * not cost the reader a confusing gap, and an agent with no brief should not
 * announce itself twice.
 */
export function toPromptContext(task: Task, brief: Brief = {}): string {
  const parts: string[] = [];

  if (brief.agent) {
    const { name, role, context } = brief.agent;
    // The role is required of an agent, so this heading always says something
    // even when the longer brief is empty.
    parts.push(`## You are ${name} — ${role}`);
    if (context.trim()) parts.push(context.trim());
  }

  if (brief.project?.trim()) {
    parts.push('## Project context', brief.project.trim());
  }

  // The task's own block, unchanged, and separated from anything above it.
  if (parts.length > 0) parts.push('---');

  parts.push(`# ${task.title}`);
  if (task.description.trim()) parts.push(task.description.trim());
  if (task.context.trim()) parts.push('---', task.context.trim());

  return parts.join('\n\n') + '\n';
}
