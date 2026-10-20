import { TEAM } from '../constants';
import Avatar from './Avatar';
import type { Task } from '../types';

// REQUIREMENTS 4.D — who is holding what right now. "Active" is everything that
// is not Done; a finished task is no longer being driven.
export default function DrivingStrip({ tasks }: { tasks: Task[] }) {
  return (
    <section aria-labelledby="driving-heading" className="mb-6">
      <h2 id="driving-heading" className="mb-3 text-base font-semibold uppercase text-text-primary">
        Driving
      </h2>

      <ul className="flex items-start gap-4">
        {TEAM.map((member) => {
          const active = tasks.filter(
            (task) => task.assignee === member && task.status !== 'done'
          );

          return (
            <li
              key={member}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-surface-card p-3"
            >
              <div className="flex items-center gap-2">
                <Avatar name={member} />
                <span className="truncate text-sm font-medium text-text-primary">{member}</span>
                <span className="ml-auto text-xs text-text-muted">{active.length}</span>
              </div>

              {active.length === 0 ? (
                <p className="mt-2 text-xs text-text-muted">Nothing active — enjoy it.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {active.map((task) => (
                    <li key={task.id} className="truncate text-xs text-text-muted">
                      {task.title}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
