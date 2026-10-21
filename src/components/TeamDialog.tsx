import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import ColorPicker from './ColorPicker';
import { githubUrl, normalizeHandle } from '../teamMember';
import type { Task, TeamMember } from '../types';

/**
 * Add and remove teammates (REQUIREMENTS 4.A — the assignee dropdown is
 * restricted to this list).
 *
 * Two removals are refused rather than hidden, because either would leave the
 * board in a state the data model cannot express: emptying the team strands
 * `Task.assignee`, and removing someone mid-task orphans those tasks onto a
 * name no dropdown offers.
 */
export default function TeamDialog({
  team,
  tasks,
  colors,
  onPickColor,
  onChange,
  onClose,
}: {
  team: TeamMember[];
  tasks: Task[];
  colors: Record<string, string>;
  /** `colour: null` hands the member back to automatic assignment. */
  onPickColor: (name: string, colour: string | null) => void;
  onChange: (team: TeamMember[]) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [github, setGithub] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Which member has their swatches open, if any.
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function addMember(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) return setError('Give them a name first.');
    if (team.some((member) => member.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError(`${trimmed} is already on the team.`);
    }

    const handle = normalizeHandle(github);
    onChange([...team, handle ? { name: trimmed, github: handle } : { name: trimmed }]);
    setName('');
    setGithub('');
    setError(null);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="team-dialog-title"
      onClose={onClose}
      className="m-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2 id="team-dialog-title" className="mb-1 text-base font-semibold text-text-primary">
        Team
      </h2>
      <p className="mb-4 text-xs text-text-muted">Click an avatar to recolour it.</p>

      <ul className="space-y-2">
        {team.map((member) => {
          const assigned = tasks.filter((task) => task.assignee === member.name).length;
          const blocker =
            team.length <= 1
              ? 'The team needs at least one member.'
              : assigned > 0
                ? `Reassign their ${assigned} task${assigned === 1 ? '' : 's'} first.`
                : null;

          return (
            <li
              key={member.name}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
            >
              <button
                type="button"
                onClick={() =>
                  setPicking((open) => (open === member.name ? null : member.name))
                }
                aria-expanded={picking === member.name}
                title={`Change ${member.name}'s colour`}
                className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <Avatar name={member.name} accent={colors[member.name]} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{member.name}</p>
                {member.github && (
                  <a
                    href={githubUrl(member.github)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-mono text-xs text-text-muted underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    @{member.github}
                  </a>
                )}
              </div>
              <span className="text-xs text-text-muted">
                {assigned} task{assigned === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                disabled={blocker !== null}
                title={blocker ?? undefined}
                aria-label={`Remove ${member.name}${blocker ? ` — ${blocker}` : ''}`}
                onClick={() => onChange(team.filter((other) => other.name !== member.name))}
                className="rounded px-2 py-1 text-xs text-brand-accent hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50 disabled:hover:opacity-50"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>

      {picking !== null && (
        <div className="mt-3">
          <ColorPicker
            label={picking}
            current={colors[picking]}
            onPick={(colour) => {
              onPickColor(picking, colour);
              setPicking(null);
            }}
          />
        </div>
      )}

      <form onSubmit={addMember} noValidate className="mt-4">
        <label className="mb-1 block text-xs text-text-muted" htmlFor="team-name">
          Add a teammate
        </label>
        <div className="flex gap-2">
          <input
            id="team-name"
            value={name}
            autoFocus
            autoComplete="off"
            aria-invalid={error !== null}
            aria-describedby={error ? 'team-error' : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            className="w-full rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <input
            value={github}
            aria-label="GitHub handle, optional"
            placeholder="github handle"
            autoComplete="off"
            onChange={(event) => setGithub(event.target.value)}
            className="w-36 shrink-0 rounded-lg border border-line bg-surface-page px-3 py-2 font-mono text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Add
          </button>
        </div>
        {error && (
          <p id="team-error" role="alert" className="mt-2 text-xs text-brand-accent">
            {error}
          </p>
        )}
      </form>

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
