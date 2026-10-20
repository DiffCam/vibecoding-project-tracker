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
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initialValue;
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
