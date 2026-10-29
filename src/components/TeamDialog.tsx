import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import ColorPicker from './ColorPicker';
import ConfirmDialog from './ConfirmDialog';
import Picker from './Picker';
import type { Choice } from './Picker';
import Icon from './Icon';
import { githubUrl, isAgent, normalizeEmail, normalizeHandle } from '../teamMember';
import { findUser } from '../users';
import type { User } from '../users';
import type { Invite } from '../projects';
import type { ContextVersion } from '../contextHistory';
import type { AgentNote, ContextMode, Task, TeamMember } from '../types';

/**
 * A bot being built, held by App rather than here.
 *
 * Its context is written on a full page, which means leaving this dialog —
 * so the half-filled form cannot live in it. Carries the same three fields
 * an agent's context carries once it exists, so adding it is a copy.
 */
export type BotDraft = {
  name: string;
  role: string;
  context: string;
  mode: ContextMode;
  history: ContextVersion[];
  notes: AgentNote[];
};

export const BLANK_BOT: BotDraft = {
  name: '',
  role: '',
  context: '',
  mode: 'simple',
  history: [],
  notes: [],
};

/**
 * The roster, and the two ways to add to it (REQUIREMENTS 4.A — the assignee
 * dropdown is restricted to this list).
 *
 * Two columns rather than a stack: the list is the thing you came to look at,
 * and the two add-forms differ enough that a toggle between them hid half the
 * answer to "what does an agent need that a person does not".
 *
 * Two removals are refused rather than hidden, because either would leave the
 * board in a state the data model cannot express: emptying the team strands
 * `Task.assignee`, and removing someone mid-task orphans those tasks onto a
 * name no dropdown offers.
 *
 * No context is written here, for either an existing agent or one being
 * added: that means modes, previews and versions, which is a page — the same
 * one the project context uses. This only says whether it has been done.
 */
const FIELD =
  'w-full rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary';
const LABEL = 'mb-1 block text-xs text-text-muted';
const OPTIONAL = <span className="text-text-muted">· optional</span>;

/**
 * The three things a row can be set to, written out once.
 *
 * Each says what it means underneath, because "Manager" on its own does not
 * tell you what a manager may do — and "Make owner" needs to read as the
 * one-way act it is before it is chosen, not only in the warning after.
 */
const ROLE_CHOICE: Record<'participant' | 'manager' | 'owner', Choice> = {
  participant: {
    value: 'participant',
    label: 'Participant',
    row: (
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-text-primary">Participant</span>
        <span className="text-[11px] text-text-muted">Works on the project</span>
      </span>
    ),
    face: <span className="truncate">Participant</span>,
  },
  manager: {
    value: 'manager',
    label: 'Manager',
    row: (
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-text-primary">Manager</span>
        <span className="text-[11px] text-text-muted">Can invite and promote</span>
      </span>
    ),
    face: <span className="truncate">Manager</span>,
  },
  owner: {
    value: 'owner',
    label: 'Make owner',
    row: (
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-danger">Make owner…</span>
        <span className="text-[11px] text-text-muted">Hands the project over</span>
      </span>
    ),
    face: <span className="truncate">Owner</span>,
  },
};

export default function TeamDialog({
  team,
  tasks,
  colors,
  onPickColor,
  onChange,
  managers,
  ownerName,
  users,
  invites,
  viewer,
  onProject,
  onEditAgent,
  bot,
  onBot,
  onClose,
}: {
  team: TeamMember[];
  tasks: Task[];
  colors: Record<string, string>;
  /** `colour: null` hands the member back to automatic assignment. */
  onPickColor: (name: string, colour: string | null) => void;
  onChange: (team: TeamMember[]) => void;
  /** Who runs the project, beyond the one person who owns it. */
  managers: string[];
  ownerName: string;
  /** Every account, so an invitation can tell a known address from a new one. */
  users: User[];
  /** Addresses invited that have no account yet. */
  invites: Invite[];
  /** What the signed-in person may change here. */
  viewer: 'owner' | 'manager' | 'participant' | 'none';
  onProject: (change: { managers?: string[]; invites?: Invite[]; ownerName?: string }) => void;
  /** Leaves for a context page: an existing agent by name, or the draft. */
  onEditAgent: (name: string | 'new') => void;
  /** The in-progress bot, lifted so it survives the trip to that page. */
  bot: BotDraft;
  onBot: (draft: BotDraft) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Which member has their swatches open, if any.
  const [picking, setPicking] = useState<string | null>(null);

  const [human, setHuman] = useState({ name: '', github: '', email: '', role: '' });
  const [humanError, setHumanError] = useState<string | null>(null);
  const [botError, setBotError] = useState<string | null>(null);

  const [invite, setInvite] = useState<{ email: string; role: 'manager' | 'participant' }>({
    email: '',
    role: 'participant',
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  /** An address that parsed but belongs to no account, held for a second
   *  press: the first one asks, the second creates. */
  const [unknown, setUnknown] = useState<string | null>(null);
  /** Who the project is about to be handed to, pending the warning. */
  const [handover, setHandover] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const inviteEmail = normalizeEmail(invite.email);
  const match = inviteEmail === undefined ? undefined : findUser(users, inviteEmail);
  const canInvite = inviteEmail !== undefined;

  const botFilled = bot.context.trim().length > 0;
  // What each Add button waits for. The optional fields are still validated
  // on submit — a malformed handle is a message, not a disabled button,
  // because the button would not say which of the four fields was wrong.
  const canAddHuman = human.name.trim().length > 0;
  const canAddBot = bot.name.trim().length > 0 && bot.role.trim().length > 0;

  /** The name checks both roster forms share. Returns the message, or null. */
  function nameProblem(raw: string, noun: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return `Give ${noun} a name first.`;
    if (team.some((member) => member.name.toLowerCase() === trimmed.toLowerCase())) {
      return `${trimmed} is already on the team.`;
    }
    return null;
  }

  function addHuman(event: React.FormEvent) {
    event.preventDefault();
    const problem = nameProblem(human.name, 'them');
    if (problem) return setHumanError(problem);

    // Both are rendered as links, so junk is refused rather than stored —
    // but only when something was actually typed, since both are optional.
    const github = human.github.trim() ? normalizeHandle(human.github) : undefined;
    if (human.github.trim() && !github) return setHumanError('That is not a GitHub handle.');
    const email = human.email.trim() ? normalizeEmail(human.email) : undefined;
    if (human.email.trim() && !email) return setHumanError('That is not an email address.');

    onChange([
      ...team,
      {
        name: human.name.trim(),
        ...(github ? { github } : {}),
        ...(email ? { email } : {}),
        ...(human.role.trim() ? { role: human.role.trim() } : {}),
      },
    ]);
    setHuman({ name: '', github: '', email: '', role: '' });
    setHumanError(null);
  }

  function addBot(event: React.FormEvent) {
    event.preventDefault();
    const problem = nameProblem(bot.name, 'it');
    if (problem) return setBotError(problem);
    if (!bot.role.trim()) return setBotError('Give the agent a role — one line is enough.');

    onChange([
      ...team,
      {
        name: bot.name.trim(),
        // The draft already carries the context and the versions written on
        // its page, so becoming a member is a copy rather than a reset.
        agent: {
          role: bot.role.trim(),
          context: bot.context,
          mode: bot.mode,
          history: bot.history,
          notes: bot.notes,
        },
      },
    ]);
    onBot(BLANK_BOT);
    setBotError(null);
  }

  /**
   * Adds an account to the roster, or records an invitation if there is no
   * account behind the address.
   *
   * An invitation is not a roster entry: nobody has accepted, so there is no
   * name to show and no work to assign them. Two presses for an unknown
   * address — the first asks, the second records it.
   */
  function sendInvite(event: React.FormEvent) {
    event.preventDefault();
    if (inviteEmail === undefined) return setInviteError('That is not an email address.');

    if (invites.some((one) => one.email === inviteEmail)) {
      return setInviteError('That address is already invited.');
    }

    const account = findUser(users, inviteEmail);
    if (!account) {
      if (unknown !== inviteEmail) {
        setUnknown(inviteEmail);
        setInviteError(null);
        return;
      }
      onProject({ invites: [...invites, { email: inviteEmail, role: invite.role }] });
    } else {
      if (team.some((member) => member.name === account.name)) {
        return setInviteError(`${account.name} is already on this project.`);
      }
      onChange([...team, { name: account.name, email: inviteEmail }]);
      if (invite.role === 'manager') onProject({ managers: [...managers, account.name] });
    }

    setInvite({ email: '', role: 'participant' });
    setUnknown(null);
    setInviteError(null);
  }

  /**
   * What `who` may set `member` to.
   *
   * The owner can do anything, including handing the project over. A manager
   * can promote a participant but not demote a peer — taking rights away is
   * the owner's to do. Everyone else watches.
   */
  function roleOptions(memberName: string): ('participant' | 'manager' | 'owner')[] {
    if (memberName === ownerName) return [];
    if (viewer === 'owner') return ['participant', 'manager', 'owner'];
    if (viewer === 'manager') return managers.includes(memberName) ? [] : ['participant', 'manager'];
    return [];
  }

  function setRole(memberName: string, role: 'participant' | 'manager' | 'owner') {
    if (role === 'owner') return setHandover(memberName);
    onProject({
      managers:
        role === 'manager'
          ? [...new Set([...managers, memberName])]
          : managers.filter((name) => name !== memberName),
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="team-dialog-title"
      onClose={onClose}
      // A flex column, not a box with overflow-hidden: three add-forms plus
      // a roster is taller than the viewport, and hidden overflow clipped
      // the footer rather than letting anything reach it. Now the middle
      // scrolls and the heading and buttons stay put.
      className="m-auto flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-surface-card p-6 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <h2
        id="team-dialog-title"
        className="mb-1 shrink-0 text-base font-semibold text-text-primary"
      >
        Team
      </h2>
      <p className="mb-4 shrink-0 text-xs text-text-muted">Click an avatar to recolour it.</p>

      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* The roster. Scrolls with the forms rather than separately: two
            nested scrollbars in one dialog is a worse problem than a long
            column, and the dialog's own region bounds them both. */}
        <div className="min-w-0">
          <ul className="space-y-2 pr-1">
            {team.map((member, index) => {
              const assigned = tasks.filter((task) => task.assignee === member.name).length;
              const blocker =
                team.length <= 1
                  ? 'The team needs at least one member.'
                  : assigned > 0
                    ? `Reassign their ${assigned} task${assigned === 1 ? '' : 's'} first.`
                    : null;

              return (
                <li key={member.name} className="rounded-lg border border-line px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPicking((open) => (open === member.name ? null : member.name))
                      }
                      aria-expanded={picking === member.name}
                      title={`Change ${member.name}'s colour`}
                      className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <Avatar
                        name={member.name}
                        accent={colors[member.name]}
                        agent={isAgent(member)}
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">{member.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {isAgent(member) ? member.agent?.role : (member.role ?? '—')}
                      </p>
                    </div>

                    {/* The owner is shown, never set: they are set by
                        handing the project over, which is a different act
                        with a warning on it. Agents hold no role at all —
                        a bot is assigned work, not responsibility. */}
                    {member.name === ownerName ? (
                      <span
                        title="Created this project"
                        className="w-[8.5rem] shrink-0 rounded-lg border border-text-primary bg-surface-page px-3 py-2 text-sm font-medium text-text-primary"
                      >
                        Owner
                      </span>
                    ) : isAgent(member) ? null : roleOptions(member.name).length === 0 ? (
                      <span className="w-[8.5rem] shrink-0 rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-muted">
                        {managers.includes(member.name) ? 'Manager' : 'Participant'}
                      </span>
                    ) : (
                      // The same control the task editor uses, not a native
                      // select: an 10px dropdown among 24px avatars read as
                      // an afterthought, and this is the row's real decision.
                      <span className="w-[8.5rem] shrink-0">
                        <Picker
                          id={`role-${index}`}
                          tone="page"
                          value={managers.includes(member.name) ? 'manager' : 'participant'}
                          rowHeight={52}
                          onChange={(role) =>
                            setRole(member.name, role as 'participant' | 'manager' | 'owner')
                          }
                          choices={roleOptions(member.name).map((role) => ROLE_CHOICE[role])}
                        />
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={blocker !== null}
                      title={blocker ?? undefined}
                      aria-label={`Remove ${member.name}${blocker ? ` — ${blocker}` : ''}`}
                      onClick={() =>
                        onChange(team.filter((other) => other.name !== member.name))
                      }
                      className="shrink-0 rounded px-2 py-1 text-xs text-danger hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50 disabled:hover:opacity-50"
                    >
                      Remove
                    </button>
                  </div>

                  {/* The ways to reach them, and for an agent the way into
                      its context. Second line so the first stays scannable. */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 text-xs">
                    {isAgent(member) ? (
                      <button
                        type="button"
                        onClick={() => onEditAgent(member.name)}
                        className="inline-flex items-center gap-1 text-brand-ink hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        <Icon name="brief" className="h-3.5 w-3.5 shrink-0" />
                        {member.agent?.context.trim() ? 'Edit context' : 'Write context'}
                      </button>
                    ) : (
                      <>
                        {member.github && (
                          <a
                            href={githubUrl(member.github)}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-mono text-text-muted underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                          >
                            @{member.github}
                          </a>
                        )}
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="truncate font-mono text-text-muted underline hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                          >
                            {member.email}
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  {picking === member.name && (
                    <div className="mt-2">
                      <ColorPicker
                        label={member.name}
                        current={colors[member.name]}
                        onPick={(colour) => {
                          onPickColor(member.name, colour);
                          setPicking(null);
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Invitations, not members: no name, no colour, no tasks — there
              is nobody there yet. Only the address and the way to take it
              back. */}
          {invites.length > 0 && (
            <>
              <p className="mb-1 mt-4 px-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
                Invites
              </p>
              <ul className="space-y-2">
                {invites.map((one) => (
                  <li
                    key={one.email}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2"
                  >
                    <Icon name="brief" className="h-4 w-4 shrink-0 text-text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs text-text-primary">
                        {one.email}
                      </span>
                      <span className="block text-[11px] text-text-muted">
                        Invited as {one.role} · no account yet
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onProject({ invites: invites.filter((other) => other.email !== one.email) })
                      }
                      className="shrink-0 rounded px-2 py-1 text-xs text-danger hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Both forms at once, stacked. Siblings, not nested — a form inside
            a form is invalid and hands the submit to the outer one. */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* First, because inviting someone who already has an account is
              the common case. The other two forms create roster entries that
              nobody can sign in as. */}
          <form onSubmit={sendInvite} noValidate className="rounded-lg border border-line p-3">
            <p className="mb-2 text-xs font-medium text-text-primary">Add user</p>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <div>
                <label className={LABEL} htmlFor="invite-email">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={invite.email}
                  autoComplete="off"
                  placeholder="them@example.com"
                  aria-invalid={inviteError !== null}
                  aria-describedby={inviteError ? 'invite-error' : undefined}
                  onChange={(event) => {
                    setInvite({ ...invite, email: event.target.value });
                    setInviteError(null);
                    setUnknown(null);
                  }}
                  className={`${FIELD} font-mono`}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="invite-role">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={invite.role}
                  onChange={(event) =>
                    setInvite({ ...invite, role: event.target.value as 'manager' | 'participant' })
                  }
                  className={FIELD}
                >
                  <option value="participant">Participant</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            {/* Said before the press that matters, not after it: the second
                press is the one that creates an account. */}
            {unknown !== null && unknown === inviteEmail && (
              <p className="mt-2 rounded-lg bg-surface-page px-3 py-2 text-xs text-text-primary">
                <span className="font-mono">{unknown}</span> is not a user yet. Invite them to
                create an account?
              </p>
            )}
            {match && (
              <p className="mt-2 text-xs text-text-muted">
                Invites <span className="text-text-primary">{match.name}</span>.
              </p>
            )}
            {inviteError && (
              <p id="invite-error" role="alert" className="mt-2 text-xs text-danger">
                {inviteError}
              </p>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!canInvite}
                title={canInvite ? undefined : 'An email address is required.'}
                className="rounded-full bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {unknown !== null && unknown === inviteEmail ? 'Invite anyway' : 'Invite'}
              </button>
            </div>
          </form>

          <form
            onSubmit={addHuman}
            noValidate
            className="rounded-lg border border-line p-3"
          >
            <p className="mb-2 text-xs font-medium text-text-primary">Add non-user</p>
            <p className="mb-2 text-[11px] text-text-muted">
              Someone the board tracks who has no account and cannot sign in.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="human-name">
                  Name
                </label>
                <input
                  id="human-name"
                  value={human.name}
                  autoFocus
                  autoComplete="off"
                  placeholder="Robin Vale"
                  aria-invalid={humanError !== null}
                  aria-describedby={humanError ? 'human-error' : undefined}
                  onChange={(event) => {
                    setHuman({ ...human, name: event.target.value });
                    setHumanError(null);
                  }}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="human-github">
                  Handle {OPTIONAL}
                </label>
                <input
                  id="human-github"
                  value={human.github}
                  autoComplete="off"
                  placeholder="octocat"
                  onChange={(event) => {
                    setHuman({ ...human, github: event.target.value });
                    setHumanError(null);
                  }}
                  className={`${FIELD} font-mono`}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="human-email">
                  Email {OPTIONAL}
                </label>
                <input
                  id="human-email"
                  type="email"
                  value={human.email}
                  autoComplete="off"
                  placeholder="robin@example.com"
                  onChange={(event) => {
                    setHuman({ ...human, email: event.target.value });
                    setHumanError(null);
                  }}
                  className={`${FIELD} font-mono`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="human-role">
                  Role {OPTIONAL}
                </label>
                <input
                  id="human-role"
                  value={human.role}
                  autoComplete="off"
                  placeholder="Frontend developer"
                  onChange={(event) => setHuman({ ...human, role: event.target.value })}
                  className={FIELD}
                />
              </div>
            </div>

            {humanError && (
              <p id="human-error" role="alert" className="mt-2 text-xs text-danger">
                {humanError}
              </p>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!canAddHuman}
                title={canAddHuman ? undefined : "A name is the only thing required."}
                className="rounded-full bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
              >
                Add non-user
              </button>
            </div>
          </form>

          <form onSubmit={addBot} noValidate className="rounded-lg border border-line p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-primary">
              <Icon name="robot" className="h-3.5 w-3.5 shrink-0" />
              Add bot
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="bot-name">
                  Alias
                </label>
                <input
                  id="bot-name"
                  value={bot.name}
                  autoComplete="off"
                  placeholder="Scout"
                  aria-invalid={botError !== null}
                  aria-describedby={botError ? 'bot-error' : undefined}
                  onChange={(event) => {
                    onBot({ ...bot, name: event.target.value });
                    setBotError(null);
                  }}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="bot-role">
                  Role
                </label>
                <input
                  id="bot-role"
                  value={bot.role}
                  autoComplete="off"
                  placeholder="Frontend developer"
                  onChange={(event) => {
                    onBot({ ...bot, role: event.target.value });
                    setBotError(null);
                  }}
                  className={FIELD}
                />
              </div>
              {/* A button rather than a box: this is the same document the
                  project context is, so it gets the same editor rather than
                  a worse one squeezed in here. The flag is what tells you
                  whether going there is still outstanding. */}
              <div className="sm:col-span-2">
                <p className={LABEL}>Role context {OPTIONAL}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditAgent('new')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <Icon name="brief" className="h-4 w-4 shrink-0" />
                    {botFilled ? 'Edit role context' : 'Write role context'}
                  </button>
                  {botFilled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-status-done">
                      <Icon name="check" className="h-3.5 w-3.5 shrink-0" />
                      Populated
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">Empty</span>
                  )}
                </div>
              </div>
            </div>

            {botError && (
              <p id="bot-error" role="alert" className="mt-2 text-xs text-danger">
                {botError}
              </p>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!canAddBot}
                title={canAddBot ? undefined : "An alias and a role are required."}
                className="rounded-full bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
              >
                Add bot
              </button>
            </div>
          </form>
        </div>
      </div>

      {handover !== null && (
        <ConfirmDialog
          title={`Make ${handover} the owner?`}
          confirmLabel="Hand over"
          message={`This will revoke your ownership permissions and hand them over to ${handover}. You stay on the project as a manager, and only ${handover} can give it back.`}
          onConfirm={() => {
            // Manager, not participant: losing the project entirely because
            // you handed it on is a surprise nobody asked for.
            onProject({
              ownerName: handover,
              managers: [...new Set([...managers.filter((n) => n !== handover), ownerName])],
            });
            setHandover(null);
          }}
          onCancel={() => setHandover(null)}
        />
      )}

      <div className="mt-6 flex shrink-0 justify-end">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
