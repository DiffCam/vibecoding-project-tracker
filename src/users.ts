import { normalizeEmail } from './teamMember';

/**
 * Accounts, as distinct from rosters.
 *
 * A project's team is who the work is assigned to; this is who can sign in.
 * They overlap but are not the same list — a board can track someone who has
 * no account, and an account holder is no use to a project until invited to
 * it. Keeping them apart is what lets "add a user" mean something other than
 * "type a name".
 *
 * App-wide rather than per project, and the one list the login screen reads.
 * No password lives here: there is no backend, and the login form is a
 * picture of one.
 */
export type User = {
  name: string;
  /** Lower-cased and validated. The identity, since names repeat. */
  email: string;
};

export const USERS_KEY = 'vibetracker.users';

/**
 * The two demo accounts. example.com is reserved by RFC 2606, so neither
 * address can ever reach a real person.
 */
export const SEED_USERS: User[] = [
  { name: 'Cameron Farr', email: 'cameron@example.com' },
  { name: 'Robin Vale', email: 'robin@example.com' },
];

/** The account for an address, if there is one. Email is the identity. */
export function findUser(users: User[], email: string): User | undefined {
  const clean = normalizeEmail(email);
  return clean === undefined ? undefined : users.find((user) => user.email === clean);
}

/**
 * A display name guessed from an address, for an account being created from
 * an invitation alone.
 *
 * `sam.rivera@example.com` becomes "Sam Rivera". A guess, and sometimes a
 * poor one — but an invited account has to be called something, and the
 * address is all there is. They can be renamed on the roster afterwards.
 */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const words = local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
  return words.join(' ') || email;
}
