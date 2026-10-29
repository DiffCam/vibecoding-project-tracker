import type { Task } from './types';

/** How the signed-in person relates to the project. See `projects.ts`. */
export type Standing = 'owner' | 'manager' | 'participant' | 'none';

/**
 * Who may hand a task to someone else.
 *
 * Whoever is holding it, plus whoever runs the project. The assignee is in
 * the list because handing your own work on is how work moves — needing a
 * manager for it would make the board a queue for one person's attention.
 * Everyone else can read it and say so in the activity, which is the point
 * of having comments.
 *
 * A new task has no assignee to protect, so anyone creating one picks who
 * it goes to.
 *
 * Nothing is enforced below this: there is no server, and a determined
 * person has the console. This is the product rule written down once, so
 * the control that enforces it and the writer that respects it cannot drift.
 */
export function canReassign(
  who: string,
  task: Task | null,
  standing: Standing
): boolean {
  // Off the roster entirely: not your project, whatever a stale assignment
  // on some task might say.
  if (standing === 'none') return false;
  if (task === null) return true;
  if (standing === 'owner' || standing === 'manager') return true;
  return task.assignee === who;
}

/** Why the control is locked, for the title on it. Null when it is not. */
export function reassignBlocked(
  who: string,
  task: Task | null,
  standing: Standing
): string | null {
  if (canReassign(who, task, standing)) return null;
  return `Only ${task?.assignee || 'the assignee'}, a manager or the project owner can reassign this task.`;
}

/** Whoever runs the project: the owner and the managers they appointed. */
export function runsProject(standing: Standing): boolean {
  return standing === 'owner' || standing === 'manager';
}

/**
 * Who may delete a task.
 *
 * Whoever runs the project, plus the narrow case of undoing your own
 * mistake: a task you made, still in To Do, that nobody else has touched.
 * Past any of those three it is shared history — somebody has moved it,
 * commented on it, or started the work — and deleting shared history is a
 * decision for the people accountable for the project.
 *
 * An unrecorded creator never unlocks it. Tasks predating sign-in have
 * nobody to credit, and `'' === ''` would hand them to anyone.
 */
export function canDeleteTask(who: string, task: Task, standing: Standing): boolean {
  if (standing === 'none') return false;
  if (runsProject(standing)) return true;
  if (task.status !== 'todo') return false;
  if (task.createdBy === '' || task.createdBy !== who) return false;
  // Your own save on creation is yours; anyone else's mark makes it shared.
  return task.events.every((entry) => !entry.by || entry.by === who);
}

/** Why deleting is refused, for the title on the control. Null when it is not. */
export function deleteTaskBlocked(
  who: string,
  task: Task,
  standing: Standing
): string | null {
  if (canDeleteTask(who, task, standing)) return null;
  if (task.status !== 'todo') {
    return 'Work has started on this. Only a manager or the project owner can delete it.';
  }
  if (task.createdBy !== who || task.createdBy === '') {
    return 'Only the person who created it, a manager or the project owner can delete this task.';
  }
  return 'Somebody else has worked on this. Only a manager or the project owner can delete it now.';
}
