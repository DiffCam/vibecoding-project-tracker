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
 * REQUIREMENTS 5.G — the three tiers as one block, ready to paste straight
 * into Claude/ChatGPT/Cursor.
 *
 * Who you are, then what we are building, then the job. The persona leads
 * because it frames how everything after it should be read.
 *
 * One H1 per tier, so a model can tell where each begins without inferring
 * it from the prose. Previously the tier headings were H2 while the task's
 * own title was H1 — the thing inside outranked its container, which is
 * exactly backwards. The title is now an H2 under its section.
 *
 * Empty sections are dropped rather than pasted as blank headings: a task
 * with no description should not cost the reader a confusing gap, and an
 * agent with no brief should not announce itself twice.
 *
 * No `---` rules any more. They were separating sections that had no
 * headings to separate them; an H1 does that on its own, and a rule between
 * two H1s is punctuation nobody reads.
 */
export function toPromptContext(task: Task, brief: Brief = {}): string {
  const parts: string[] = [];

  if (brief.agent) {
    const { name, role, context } = brief.agent;
    parts.push('# Your Role');
    // The role is required of an agent, so this always says something even
    // when the longer brief is empty.
    parts.push(`You are ${name} — ${role}.`);
    if (context.trim()) parts.push(context.trim());
  }

  if (brief.project?.trim()) {
    parts.push('# Full Project Context', brief.project.trim());
  }

  parts.push('# Task Description');
  parts.push(`## ${task.title.trim() || 'Untitled task'}`);
  if (task.description.trim()) parts.push(task.description.trim());

  if (task.context.trim()) {
    parts.push('# Task Context', task.context.trim());
  }

  return parts.join('\n\n') + '\n';
}
