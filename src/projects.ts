/**
 * Projects, and where each one's data lives.
 *
 * A project is a board. There is no tree: nesting boards under projects gave
 * the outer level nothing to do but expand itself, and every field that
 * would have had to choose a level — team, tags, context — is already named
 * for the project.
 *
 * Storage stays one flat key per concern, now prefixed per project, rather
 * than one nested object per project. `useLocalStorage` reads its key once on
 * mount, so a prefix plus a remount switches projects; a nested object would
 * mean rewriting every one of those hooks.
 */
export type Project = {
  id: string;
  name: string;
  /** ISO. Orders the sidebar, so a new project lands at the bottom. */
  createdAt: string;
  /**
   * Who created it, by name — the same key `Task.assignee` uses.
   *
   * Ownership is the only thing distinguishing the sidebar's two sections:
   * everyone else on the project's team is a participant. There is no
   * backend to enforce it, so this records intent rather than permission.
   */
  ownerName: string;
  /**
   * Names granted manager on this project, by the same key as the owner.
   *
   * A third standing between owning and merely being on it. Nothing is
   * enforced — there is no backend — so this records who the team says runs
   * the project, which is what the sidebar groups by.
   */
  managers: string[];
  /**
   * Addresses invited that belong to no account yet.
   *
   * Not roster entries: nobody has accepted, there is no name to show and
   * no work to assign them. They sit here until an account exists or the
   * invitation is revoked.
   */
  invites: Invite[];
};

export type Invite = { email: string; role: 'manager' | 'participant' };

export const PROJECTS_KEY = 'vibetracker.projects';
export const OPEN_KEY = 'vibetracker.openProject';

/**
 * The keys that belong to one project.
 *
 * Everything else at the top level is the person, not the work: the theme,
 * the session, and whether the Driving strip is expanded.
 */
export const SCOPED = [
  'tasks',
  'milestones',
  'sprints',
  'anchors',
  'team',
  'tags',
  'tagColors',
  'memberColors',
  'sprintColors',
  'projectContext',
  'projectHistory',
  'projectContextMode',
] as const;

/** Where one project's `name` lives. */
export function key(projectId: string, name: (typeof SCOPED)[number]): string {
  return `vibetracker.p.${projectId}.${name}`;
}

export function blankProject(name: string, ownerName: string): Project {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    ownerName,
    managers: [],
    invites: [],
  };
}

/**
 * How a project relates to one person.
 *
 * Ordered, and the order is the definition: owning outranks managing, and
 * managing outranks being on the roster, so nobody appears in two sections.
 * Membership is the project's own roster, so signing in as someone not on it
 * hides the project — which is the behaviour the sections exist to show.
 */
export function standing(
  project: Project,
  team: { name: string }[],
  who: string
): 'owner' | 'manager' | 'participant' | 'none' {
  if (project.ownerName === who) return 'owner';
  if ((project.managers ?? []).includes(who)) return 'manager';
  return team.some((member) => member.name === who) ? 'participant' : 'none';
}

/**
 * Moves a pre-projects install into its first project.
 *
 * Runs once, before React mounts — the hooks read their keys on mount, so a
 * migration that ran inside a component would be too late for the first
 * render. Copies rather than moves: if this goes wrong the originals are
 * still there to look at, and the presence of PROJECTS_KEY is what stops it
 * running twice.
 *
 * An install with no data at all still gets the project, so the sidebar is
 * never empty and the seeds land somewhere.
 */
export function migrate(store: Storage = window.localStorage): Project[] {
  const existing = store.getItem(PROJECTS_KEY);
  if (existing !== null) {
    try {
      const parsed = JSON.parse(existing) as Project[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Unparseable: fall through and rebuild rather than leaving no projects.
    }
  }

  // The owner is whoever heads the roster this board already had — the
  // board predates ownership, so there is nobody else it could belong to.
  let owner = '';
  try {
    const roster = JSON.parse(store.getItem('vibetracker.team') ?? '[]') as { name?: string }[];
    owner = roster[0]?.name ?? '';
  } catch {
    owner = '';
  }

  const first = blankProject('VibeCheckr', owner);
  for (const name of SCOPED) {
    const was = store.getItem(`vibetracker.${name}`);
    if (was !== null) store.setItem(key(first.id, name), was);
  }

  const projects = [first];
  store.setItem(PROJECTS_KEY, JSON.stringify(projects));
  store.setItem(OPEN_KEY, JSON.stringify(first.id));
  return projects;
}

/** Everything a project owns, gone. Called after it leaves the list. */
export function forget(projectId: string, store: Storage = window.localStorage) {
  for (const name of SCOPED) store.removeItem(key(projectId, name));
}
