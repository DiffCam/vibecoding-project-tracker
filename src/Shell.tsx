import { useEffect, useState } from 'react';
import App from './App';
import ConfirmDialog from './components/ConfirmDialog';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import Sidebar from './components/Sidebar';
import { DEFAULT_TEAM } from './constants';
import { blankProject, key, migrate, OPEN_KEY, PROJECTS_KEY, standing } from './projects';
import type { Assigned } from './components/Dashboard';
import type { Project } from './projects';
import { assignColors } from './tagColor';
import { useLocalStorage } from './useLocalStorage';
import { SEED_USERS, USERS_KEY } from './users';
import type { User } from './users';
import type { Task, TeamMember } from './types';

/**
 * Everything outside a single project: who is signed in, which projects
 * exist, and which one is open.
 *
 * `App` is the project page and knows nothing about any of this beyond the
 * id it is handed. It is mounted with that id as its `key`, because
 * `useLocalStorage` reads its key once — switching projects has to remount,
 * not re-key, or the outgoing project's state would be written over the
 * incoming one's.
 */

/** One project's stored value, read directly. The dashboard spans projects,
 *  so it cannot use a hook per project — there is no fixed number of them. */
function read<T>(projectId: string, name: Parameters<typeof key>[1], fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key(projectId, name));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export default function Shell() {
  const [projects, setProjects] = useLocalStorage<Project[]>(PROJECTS_KEY, [], (stored) =>
    stored.map((project) => ({
      ...project,
      managers: project.managers ?? [],
      invites: project.invites ?? [],
    }))
  );
  const [openId, setOpenId] = useLocalStorage<string | null>(OPEN_KEY, null);
  const [session, setSession] = useLocalStorage<string | null>('vibetracker.session', null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  /** Which of the two signed-out screens is showing. */
  const [signingUp, setSigningUp] = useState(false);
  /** The confirmation notice, cleared on its own so it reads as a toast. */
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  /** A task to open as soon as its project page mounts, from the dashboard. */
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  /** A person's preference, not a project's, so it lives at the top level. */
  const [sidebarOpen, setSidebarOpen] = useLocalStorage<boolean>('vibetracker.sidebar', true);
  /** Who can sign in, app-wide. A project's roster is a different list. */
  const [users] = useLocalStorage<User[]>(USERS_KEY, SEED_USERS);

  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(
    'vibetracker.theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const open = projects.find((project) => project.id === openId) ?? null;

  // The roster of whichever project is open, or the first project's, so the
  // login screen and the sidebar have faces before anything is open. There is
  // no app-wide team: a team belongs to a project.
  const rosterOf = projects[0]?.id;
  const team = read<TeamMember[]>(open?.id ?? rosterOf ?? '', 'team', DEFAULT_TEAM);
  const memberColors = assignColors(
    team.map((member) => member.name),
    read<Record<string, string>>(open?.id ?? rosterOf ?? '', 'memberColors', {})
  );

  /**
   * Resolved against the accounts, not against a project's roster.
   *
   * Being on a board and having a login are different things: resolving
   * here against a team meant you could not sign in before a project
   * existed, and being removed from one project signed you out of all.
   */
  const account = users.find((one) => one.name === session);

  if (!account) {
    return signingUp ? (
      <SignUpPage
        onCancel={() => setSigningUp(false)}
        onSignedUp={(email) => {
          // No account is created: a real service would not sign you in
          // before the address was confirmed either, and inventing one here
          // would make the prototype lie about what it had done.
          setSigningUp(false);
          setNotice(`Email confirmation sent to ${email}.`);
        }}
      />
    ) : (
      <LoginPage
        users={users}
        memberColors={memberColors}
        onSignIn={setSession}
        onSignUp={() => {
          setNotice(null);
          setSigningUp(true);
        }}
        notice={notice}
      />
    );
  }

  // The roster entry for the signed-in account, if the open project has one.
  // Falls back to the bare account so the sidebar always has a face.
  const user: TeamMember = team.find((member) => member.name === account.name) ?? {
    name: account.name,
    email: account.email,
  };

  // Captured, because a closure loses the narrowing the early return gave.
  const me = account.name;

  function addProject(name: string) {
    const project = blankProject(name, me);
    setProjects((prev) => [...prev, project]);
    setOpenId(project.id);
  }

  /**
   * The sidebar's two sections.
   *
   * A project you neither own nor appear on is not listed. That is the point
   * of the split rather than a gap in it: signing in as someone else should
   * show you their view, and a prototype that showed every project to
   * everyone would be demonstrating the wrong thing.
   */
  const owned: Project[] = [];
  const managed: Project[] = [];
  const joined: Project[] = [];
  for (const project of projects) {
    const where = standing(project, read<TeamMember[]>(project.id, 'team', DEFAULT_TEAM), user.name);
    if (where === 'owner') owned.push(project);
    else if (where === 'manager') managed.push(project);
    else if (where === 'participant') joined.push(project);
  }
  const visible = [...owned, ...managed, ...joined];

  /** Every unfinished task assigned to the signed-in user, everywhere. */
  const assigned: Assigned[] = visible.flatMap((project) =>
    read<Task[]>(project.id, 'tasks', [])
      .filter((task) => task.assignee === user.name && task.status !== 'done')
      .map((task) => ({ task, project }))
  );

  return (
    <div className="flex h-screen bg-surface-page font-sans">
      {/* Always on the dashboard. It is the only way between projects from
          there, so collapsing it would leave no route back — the burger that
          restores it lives in a project's header, which the dashboard does
          not have. */}
      {(sidebarOpen || open === null) && (
      <Sidebar
        owned={owned}
        managed={managed}
        joined={joined}
        openId={open?.id ?? null}
        user={user}
        memberColors={memberColors}
        onOpen={setOpenId}
        onDashboard={() => setOpenId(null)}
        onNewProject={addProject}
        onSignOut={() => setConfirmSignOut(true)}
        onCollapse={open === null ? undefined : () => setSidebarOpen(false)}
      />
      )}

      <div className="min-w-0 flex-1 overflow-y-auto">
        {open ? (
          <App
            // Remount per project: every stored value below is read once on
            // mount, so re-keying without remounting would carry one
            // project's board into another.
            key={open.id}
            projectId={open.id}
            projectName={open.name}
            userName={account.name}
            theme={theme}
            onTheme={setTheme}
            openTaskId={jumpTo}
            onOpenedTask={() => setJumpTo(null)}
            sidebarOpen={sidebarOpen}
            onShowSidebar={() => setSidebarOpen(true)}
            managers={open.managers}
            ownerName={open.ownerName}
            users={users}
            invites={open.invites}
            viewer={standing(open, team, account.name)}
            onProject={(change) =>
              setProjects((prev) =>
                prev.map((one) => (one.id === open.id ? { ...one, ...change } : one))
              )
            }
          />
        ) : (
          <Dashboard
            user={user.name}
            assigned={assigned}
            projects={visible}
            onOpenProject={setOpenId}
            onOpenTask={(projectId, taskId) => {
              setJumpTo(taskId);
              setOpenId(projectId);
            }}
            onNewProject={() => addProject('New project')}
          />
        )}
      </div>

      {confirmSignOut && (
        <ConfirmDialog
          title={`Sign out of ${user.name}?`}
          confirmLabel="Sign out"
          message="Your projects and everything on them stay exactly as they are — this only returns to the login screen."
          onConfirm={() => {
            setConfirmSignOut(false);
            setSession(null);
          }}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
    </div>
  );
}

/** Runs before React, so the hooks above read keys that already exist. */
export function bootstrap() {
  migrate();
}
