import { useEffect, useRef } from 'react';
import { DUE_PILL, STAGES, STATUS_DOT } from '../constants';
import { dueBadge } from '../dueState';
import Avatar from './Avatar';
import Icon from './Icon';
import type { Task, TeamMember } from '../types';

// The overflow view behind a chip's "+N more". A dialog rather than an inline
// expand so the Driving strip keeps a fixed height and never shoves the board
// down the page — and there is room here for the status and due date a chip
// has no space to show.
export default function MemberTasksDialog({
  member,
  tasks,
  accent,
  agent,
  onOpenTask,
  onEditContext,
  onClose,
}: {
  member: string;
  tasks: Task[];
  accent?: string;
  /** The member's agent half, present only for bots. */
  agent?: TeamMember['agent'];
  onOpenTask: (task: Task) => void;
  /** Leaves for this agent's context page. Only called for a bot. */
  onEditContext: () => void;
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
      className="m-auto flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2
        id="member-tasks-title"
        className={`flex items-center gap-2 text-base font-semibold text-text-primary ${
          agent ? '' : 'mb-4'
        }`}
      >
        <Avatar name={member} accent={accent} agent={agent !== undefined} />
        {member} · {tasks.filter((task) => task.status !== 'done').length} active
      </h2>

      {/* A bot's standing brief, which goes into every prompt it is handed —
          so this is the one view where seeing it next to the work is useful.
          People have a role too, but theirs is not sent anywhere. */}
      {agent && (
        <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-page px-3 py-2">
          <p className="min-w-0 text-sm text-text-primary">
            {agent.role}
            {agent.context.trim() === '' && (
              <span className="text-text-muted"> · no context written</span>
            )}
          </p>
          <button
            type="button"
            onClick={onEditContext}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <Icon name="brief" className="h-3.5 w-3.5 shrink-0" />
            {agent.context.trim() ? 'View / edit context' : 'Write context'}
            {agent.history.length > 0 && (
              // The count, not the text: how much history there is to go
              // back through is the thing you cannot tell from out here.
              <span className="font-mono text-[11px] text-text-muted">
                · v{agent.history.length}
              </span>
            )}
          </button>
        </div>
      )}

      <ul className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1">
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
                  {/* Same key as the lane titles and the chip pills. */}
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`}
                  />
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
