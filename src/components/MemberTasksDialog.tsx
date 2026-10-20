import { useEffect, useRef } from 'react';
import { DUE_PILL, STAGES } from '../constants';
import { dueBadge } from '../dueState';
import Avatar from './Avatar';
import type { Task } from '../types';

// The overflow view behind a chip's "+N more". A dialog rather than an inline
// expand so the Driving strip keeps a fixed height and never shoves the board
// down the page — and there is room here for the status and due date a chip
// has no space to show.
export default function MemberTasksDialog({
  member,
  tasks,
  onOpenTask,
  onClose,
}: {
  member: string;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="member-tasks-title"
      onClose={onClose}
      className="m-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2
        id="member-tasks-title"
        className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary"
      >
        <Avatar name={member} />
        {member} is driving {tasks.length}
      </h2>

      <ul className="space-y-2">
        {tasks.map((task) => {
          const due = dueBadge(task);
          const stage = STAGES.find((option) => option.id === task.status);

          return (
            <li key={task.id} className="rounded-lg border border-line hover:border-brand-primary">
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="w-full px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <span className="block text-sm text-text-primary">{task.title}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                  {stage?.label}
                  {due.state === 'none' ? (
                    <span>· {due.label}</span>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${DUE_PILL[due.state]}`}
                    >
                      {due.label}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="rounded-lg px-4 py-2 text-sm text-text-muted hover:opacity-70"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
