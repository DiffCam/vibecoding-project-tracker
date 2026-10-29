import { useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import Logo from './Logo';
import { isAgent } from '../teamMember';
import type { Project } from '../projects';
import type { TeamMember } from '../types';

/**
 * Projects, and who is looking at them.
 *
 * A flat list, not a tree: a project is a board, so there is nothing to
 * expand. The one thing above it is the dashboard, which is what you get
 * when no project is open.
 *
 * Collapsible, and the mark goes with it: open, the lockup sits at the top
 * here; closed, it reappears in the board's header beside a burger. One home
 * at a time rather than two marks on screen.
 */
export default function Sidebar({
  owned,
  managed,
  joined,
  openId,
  user,
  memberColors,
  onOpen,
  onDashboard,
  onNewProject,
  onSignOut,
  onCollapse,
}: {
  /** The three standings, already sorted into sections by the Shell. */
  owned: Project[];
  managed: Project[];
  joined: Project[];
  openId: string | null;
  user: TeamMember;
  memberColors: Record<string, string>;
  onOpen: (id: string) => void;
  onDashboard: () => void;
  onNewProject: (name: string) => void;
  onSignOut: () => void;
  /** Absent on the dashboard, where this is the only way to navigate. */
  onCollapse?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onNewProject(trimmed);
    setName('');
    setAdding(false);
  }

  const ITEM =
    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

  /** One row. Identical in all three sections — only the tooltip differs,
   *  because who owns it is worth knowing when it is not you. */
  const row = (project: Project, mine: boolean) => (
    <li key={project.id}>
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        aria-current={project.id === openId}
        title={mine ? project.name : `${project.name} — owned by ${project.ownerName || 'nobody'}`}
        className={`${ITEM} ${
          project.id === openId
            ? 'bg-surface-chosen font-medium text-text-primary'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Icon name="brief" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">{project.name}</span>
      </button>
    </li>
  );

  const HEADING = 'mb-1 mt-4 px-2 font-mono text-[11px] uppercase tracking-wide text-text-muted';

  return (
    <nav
      aria-label="Projects"
      className="anim-sidebar flex w-56 shrink-0 flex-col border-r border-line bg-surface-chrome"
    >
      {/* The mark lives here while the sidebar is open, and in the board's
          header while it is not — one home at a time, so collapsing does not
          leave two of them. */}
      <div className="flex shrink-0 items-center gap-1 pl-3 pr-1 py-3">
        <button
          type="button"
          onClick={onDashboard}
          title="Dashboard"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-text-primary text-surface-chrome">
            <Logo className="h-5 w-5" />
          </span>
          <span className="truncate text-base leading-tight text-text-primary">
            <span className="font-semibold">Vibe</span>
            <span className="font-normal">Checkr</span>
          </span>
        </button>
        {/* Labelled, not just a glyph: an unlabelled icon on a panel edge
            reads as "collapse", "pin" or "close" depending on who is
            looking. The arrow says which way it goes. */}
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title="Hide the sidebar"
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-surface-card hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <Icon name="back" className="h-5 w-5 shrink-0" />
            Hide
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <button
          type="button"
          onClick={onDashboard}
          aria-current={openId === null}
          className={`${ITEM} ${
            openId === null
              ? 'bg-surface-chosen text-text-primary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Icon name="list" className="h-4 w-4 shrink-0" />
          Dashboard
        </button>

        {/* Owner first and always, because it is where New project lives
            and you can always make one. Participant appears only when there
            is something in it — "Projects - Participant (0)" tells nobody
            anything. */}
        <section>
          <p className={HEADING}>Projects - Owner</p>
          <ul className="space-y-0.5">{owned.map((project) => row(project, true))}</ul>

        {adding ? (
          <div className="mt-1 px-2">
            <input
              autoFocus
              value={name}
              placeholder="Project name"
              aria-label="New project name"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                // Not a <form>: this sits inside a nav, and Enter here should
                // create a project rather than submit anything above it.
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
                if (event.key === 'Escape') {
                  setName('');
                  setAdding(false);
                }
              }}
              onBlur={add}
              className="w-full rounded-lg bg-surface-card px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${ITEM} mt-1 text-text-muted hover:text-text-primary`}
          >
            <Icon name="plus" className="h-4 w-4 shrink-0" />
            New project
          </button>
        )}
        </section>

        {/* Between the two it sits between in meaning: more than being on
            the project, less than owning it. */}
        {managed.length > 0 && (
          <section>
            <p className={HEADING}>Projects - Manager</p>
            <ul className="space-y-0.5">{managed.map((project) => row(project, false))}</ul>
          </section>
        )}

        {joined.length > 0 && (
          <section>
            <p className={HEADING}>Projects - Participant</p>
            <ul className="space-y-0.5">{joined.map((project) => row(project, false))}</ul>
          </section>
        )}
      </div>

      {/* Who you are, at the bottom where an account lives in every other
          tool. Sign out moved here off the board header, which no longer has
          to carry it on every screen. */}
      <div className="shrink-0 border-t border-line p-2">
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar name={user.name} accent={memberColors[user.name]} agent={isAgent(user)} />
          <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{user.name}</span>
          <button
            type="button"
            onClick={onSignOut}
            title={`Sign out of ${user.name}`}
            aria-label={`Sign out of ${user.name}`}
            className="shrink-0 rounded-full border border-danger px-2 py-0.5 text-[11px] font-medium text-danger hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
