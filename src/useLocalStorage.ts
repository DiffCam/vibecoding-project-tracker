import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * A tiny localStorage hook — survives reloads, no library needed.
 *
 * The initial value is only used when the key is absent, so seed data appears
 * on first load and never overwrites real work on later loads.
 *
 * Usage:
 *   const [tasks, setTasks] = useLocalStorage<Task[]>('vibetracker.tasks', []);
 *
 * Pass `revive` when the stored shape may predate the current type.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  /**
   * Runs once on the value read back from storage. Fields added to a type
   * after data was already saved are missing from that data, so the type is a
   * lie until something fills them in — this is that something.
   */
  revive?: (stored: T) => T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;
      const parsed = JSON.parse(raw) as T;
      return revive ? revive(parsed) : parsed;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode error — silently ignore for hackathon */
    }
  }, [key, value]);

  return [value, setValue];
}
