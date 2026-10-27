import { useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import Logo from './Logo';
import type { User } from '../users';

/**
 * The sign-in screen — a prototype's version of one.
 *
 * There is no backend and no account, so the email and password fields are a
 * picture of a login form and nothing else. They are deliberately inert
 * rather than quietly letting anything through: a form that accepts any
 * password looks like it checked one, and in a client preview that is the
 * wrong thing to imply. Nothing typed here is stored, sent or kept.
 *
 * Signing in really happens below, from a labelled demo list. Two accounts,
 * because the thing being demonstrated is a board several people share.
 */
const FIELD =
  'w-full rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed';

export default function LoginPage({
  users,
  memberColors,
  onSignIn,
}: {
  /** Accounts, not a project's roster — a board can track someone who has
      no login, and they must not appear here. */
  users: User[];
  memberColors: Record<string, string>;
  onSignIn: (name: string) => void;
}) {
  // Held locally and never lifted, persisted or logged. The disabled inputs
  // cannot change them; the state exists so the fields are controlled rather
  // than quietly collecting anything.
  const [email] = useState('');
  const [password] = useState('');


  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="anim-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-text-primary text-surface-chrome">
            <Logo className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-2xl leading-8 text-text-primary">
              <span className="font-semibold">Vibe</span>
              <span className="font-normal">Checkr</span>
            </h1>
            <p className="font-mono text-xs leading-4 text-text-muted">
              <i>Track Vibes</i>; <b>Ship Value</b>.
            </p>
          </div>
        </div>

        <form
          // Nothing to submit to. Prevented so a stray Enter cannot reload
          // the page and look like a failed sign-in.
          onSubmit={(event) => event.preventDefault()}
          className="rounded-xl border border-line bg-surface-card p-6"
        >
          <div>
            <label className="mb-1 block text-xs text-text-muted" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              disabled
              readOnly
              placeholder="you@example.com"
              className={FIELD}
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-text-muted" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              disabled
              readOnly
              placeholder="••••••••"
              className={FIELD}
            />
          </div>

          <button
            type="submit"
            disabled
            className="mt-4 w-full rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sign in
          </button>

          <p className="mt-2 text-center text-xs text-text-muted">
            Not wired up in this prototype — there is no server to ask.
          </p>
        </form>

        <div className="mt-6 rounded-xl border border-dashed border-text-muted p-4">
          <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">
            <Icon name="eye" className="h-3.5 w-3.5 shrink-0" />
            Demo
          </p>
          <p className="mb-3 text-sm text-text-primary">Log in as:</p>

          <ul className="space-y-2">
            {users.map((member) => (
              <li key={member.name}>
                <button
                  type="button"
                  onClick={() => onSignIn(member.name)}
                  className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <Avatar name={member.name} accent={memberColors[member.name]} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">
                      {member.name}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-text-muted">
                      {member.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
