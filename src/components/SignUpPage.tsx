import { useState } from 'react';
import Icon from './Icon';
import Logo from './Logo';
import { normalizeEmail } from '../teamMember';

/**
 * Creating an account — a prototype's version of one.
 *
 * Unlike the sign-in form next door, these fields accept input: the point of
 * the screen is to walk a client through the shape of signing up, and a
 * disabled form cannot be walked through. What it does *not* do is create
 * anything. No account appears, nothing reaches the user registry, and the
 * password is held in local state, never lifted and never stored.
 *
 * The outcome is the confirmation notice, which is honest: a real service
 * would not sign you in before you had confirmed the address either.
 */
const FIELD =
  'w-full rounded-lg border border-line bg-surface-page px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary';

const MIN_PASSWORD = 8;

export default function SignUpPage({
  onSignedUp,
  onCancel,
}: {
  /** Hands back the address, for the notice on the sign-in screen. */
  onSignedUp: (email: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // Never leaves this component: not lifted, not persisted, not logged.
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError('What should we call you?');

    const address = normalizeEmail(email);
    if (address === undefined) return setError('That is not an email address.');

    if (password.length < MIN_PASSWORD) {
      return setError(`A password needs at least ${MIN_PASSWORD} characters.`);
    }
    if (password !== confirm) return setError('The two passwords do not match.');

    // Deliberately dropped rather than stored anywhere.
    setPassword('');
    setConfirm('');
    onSignedUp(address);
  }

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
            <p className="font-mono text-xs leading-4 text-text-muted">Create an account</p>
          </div>
        </div>

        <form onSubmit={submit} noValidate className="rounded-xl border border-line bg-surface-card p-6">
          <div>
            <label className="mb-1 block text-xs text-text-muted" htmlFor="signup-name">
              Name
            </label>
            <input
              id="signup-name"
              autoFocus
              value={name}
              autoComplete="off"
              placeholder="Robin Vale"
              aria-invalid={error !== null}
              aria-describedby={error ? 'signup-error' : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              className={FIELD}
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-text-muted" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              autoComplete="off"
              placeholder="you@example.com"
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              className={`${FIELD} font-mono`}
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-text-muted" htmlFor="signup-password">
              Password{' '}
              <span className="text-text-muted">· at least {MIN_PASSWORD} characters</span>
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              autoComplete="new-password"
              placeholder="••••••••"
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              className={FIELD}
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-text-muted" htmlFor="signup-confirm">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              value={confirm}
              autoComplete="new-password"
              placeholder="••••••••"
              onChange={(event) => {
                setConfirm(event.target.value);
                setError(null);
              }}
              className={FIELD}
            />
          </div>

          {error && (
            <p id="signup-error" role="alert" className="mt-3 text-xs text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Create account
          </button>

          {/* Said before the press, not after it. A client preview should
              never leave anyone thinking an account now exists. */}
          <p className="mt-2 text-center text-xs text-text-muted">
            A prototype — no account is created and nothing is sent.
          </p>
        </form>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <Icon name="back" className="h-4 w-4 shrink-0" />
          Back to sign in
        </button>
      </div>
    </main>
  );
}
