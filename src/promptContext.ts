import type { Task } from './types';

/**
 * REQUIREMENTS 5.G — title, description and Markdown context as one block,
 * ready to paste straight into Claude/ChatGPT/Cursor.
 *
 * Empty sections are dropped rather than pasted as blank headings: a task with
 * no description should not cost the reader a confusing gap.
 */
export function toPromptContext(task: Task): string {
  const parts = [`# ${task.title}`];

  if (task.description.trim()) parts.push(task.description.trim());
  if (task.context.trim()) parts.push('---', task.context.trim());

  return parts.join('\n\n') + '\n';
}
