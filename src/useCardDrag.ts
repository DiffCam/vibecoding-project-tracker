import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TaskStatus } from './types';

export type DragSession = {
  taskId: string;
  over: TaskStatus | null;
  width: number;
  origin: string;
  /** Where the overlay starts, so its first paint is already in the right
   *  place. Without it the card flashes at the viewport corner for one frame.
   *  Constant for the session, so React's style diff never overwrites the
   *  transform the animation loop is writing. */
  initialTransform: string;
};

const THRESHOLD = 5; // px of travel before a press counts as a drag, so clicks survive
const MAX_TILT = 14; // degrees
const SETTLE_TIMEOUT = 1200; // ms — never leave the overlay up if the spring misbehaves

/**
 * The integrator runs at a fixed step, never at the real frame time.
 *
 * Semi-implicit Euler scales velocity by (1 - damping·dt) each step, so with
 * damping 48 anything at or below 30fps gives a factor of -0.6: velocity flips
 * sign and grows without bound. Feeding raw frame time in means one slow frame
 * detonates the spring. Substepping also makes the motion identical on a 60Hz
 * and a 144Hz display.
 */
const FIXED_STEP = 1 / 120;
const MAX_CATCHUP = 0.1; // s — after a longer stall, skip ahead rather than grind

type Sim = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  scale: number;
  vscale: number;
  tx: number;
  ty: number;
  offsetX: number;
  offsetY: number;
  lever: number;
  phase: 'dragging' | 'settling';
  taskId: string;
  settleStart: number;
  last: number;
  raf: number;
  reduced: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** One step of a damped spring: returns the next position and velocity. */
function spring(
  pos: number,
  vel: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number
) {
  const accel = stiffness * (target - pos) - damping * vel;
  const nextVel = vel + accel * dt;
  return [pos + nextVel * dt, nextVel] as const;
}

function statusAt(x: number, y: number): TaskStatus | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-status]');
  return (el?.dataset.dropStatus as TaskStatus | undefined) ?? null;
}

/** A drag ends on pointerup, which would otherwise also fire a click and open the task. */
function suppressNextClick() {
  const stop = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', stop, true), 0);
}

/**
 * Pointer-driven card dragging with spring physics, in place of HTML5 drag and
 * drop — which gives no control over how the card moves and renders a browser
 * ghost image instead.
 *
 * The card under the cursor is a portalled overlay chasing the pointer through
 * a spring, so it lags and overshoots slightly rather than being welded to the
 * cursor. Tilt is driven by horizontal velocity and by where you grabbed the
 * card (`lever`), so picking it up by a corner swings it more than by the
 * middle. On release it springs into the destination slot rather than cutting.
 */
export function useCardDrag(onDrop: (taskId: string, status: TaskStatus) => void) {
  const [session, setSession] = useState<DragSession | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sim = useRef<Sim | null>(null);
  const overRef = useRef<TaskStatus | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const end = useCallback(() => {
    if (sim.current) cancelAnimationFrame(sim.current.raf);
    sim.current = null;
    overRef.current = null;
    setSession(null);
  }, []);

  const step = useCallback(
    (now: number) => {
      const s = sim.current;
      if (!s) return;
      let elapsed = Math.min((now - s.last) / 1000, MAX_CATCHUP);
      s.last = now;

      if (s.phase === 'settling') {
        // Chase the gap the card will occupy; it may still be moving (FLIP).
        const slot = document.querySelector<HTMLElement>(`[data-card-slot="${s.taskId}"]`);
        if (slot) {
          const rect = slot.getBoundingClientRect();
          s.tx = rect.left;
          s.ty = rect.top;
        }
      }

      if (s.reduced) {
        s.x = s.tx;
        s.y = s.ty;
        s.rot = 0;
        s.scale = s.phase === 'dragging' ? 1.02 : 1;
      } else {
        const settling = s.phase === 'settling';
        const stiffness = settling ? 380 : 900;
        const damping = settling ? 30 : 48;

        while (elapsed > 0) {
          const dt = Math.min(FIXED_STEP, elapsed);
          elapsed -= dt;
          [s.x, s.vx] = spring(s.x, s.vx, s.tx, stiffness, damping, dt);
          [s.y, s.vy] = spring(s.y, s.vy, s.ty, stiffness, damping, dt);
          // Underdamped, so the tilt wobbles back to rest instead of snapping.
          const tilt = settling ? 0 : clamp(s.vx * 0.022 * s.lever, -MAX_TILT, MAX_TILT);
          [s.rot, s.vrot] = spring(s.rot, s.vrot, tilt, 260, 11, dt);
          [s.scale, s.vscale] = spring(s.scale, s.vscale, settling ? 1 : 1.045, 500, 22, dt);
        }
      }

      const el = overlayRef.current;
      if (el) {
        el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rot}deg) scale(${s.scale})`;
      }

      if (s.phase === 'settling') {
        const rested =
          Math.abs(s.tx - s.x) < 0.5 &&
          Math.abs(s.ty - s.y) < 0.5 &&
          Math.abs(s.vx) + Math.abs(s.vy) < 20 &&
          Math.abs(s.rot) < 0.3 &&
          Math.abs(s.scale - 1) < 0.003;
        if (s.reduced || rested || now - s.settleStart > SETTLE_TIMEOUT) {
          end();
          return;
        }
      }
      s.raf = requestAnimationFrame(step);
    },
    [end]
  );

  const release = useCallback((commit: boolean) => {
    const s = sim.current;
    if (!s || s.phase === 'settling') return;
    const target = commit ? overRef.current : null;
    if (!commit) {
      overRef.current = null;
      setSession((prev) => (prev ? { ...prev, over: null } : prev));
    }
    s.phase = 'settling';
    s.settleStart = performance.now();
    if (target) onDropRef.current(s.taskId, target);
  }, []);

  const bindCard = useCallback(
    (taskId: string) => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || sim.current) return;
      if ((event.target as HTMLElement).closest('[data-no-drag]')) return;

      const card = event.currentTarget;
      const { pointerId } = event;
      const startX = event.clientX;
      const startY = event.clientY;
      let started = false;

      const moveTo = (cx: number, cy: number) => {
        const s = sim.current;
        if (!s || s.phase !== 'dragging') return;
        s.tx = cx - s.offsetX;
        s.ty = cy - s.offsetY;
        const over = statusAt(cx, cy);
        if (over !== overRef.current) {
          overRef.current = over;
          setSession((prev) => (prev ? { ...prev, over } : prev));
        }
      };

      const begin = (cx: number, cy: number) => {
        started = true;
        const rect = card.getBoundingClientRect();
        const offsetX = startX - rect.left;
        const offsetY = startY - rect.top;
        // Grab near an edge and the card swings more than grabbed in the middle.
        const half = rect.height / 2;
        const raw = clamp((half - offsetY) / half, -1, 1);
        const lever = (raw < 0 ? -1 : 1) * Math.max(0.35, Math.abs(raw));

        sim.current = {
          x: rect.left,
          y: rect.top,
          vx: 0,
          vy: 0,
          rot: 0,
          vrot: 0,
          scale: 1,
          vscale: 0,
          tx: rect.left,
          ty: rect.top,
          offsetX,
          offsetY,
          lever,
          phase: 'dragging',
          taskId,
          settleStart: 0,
          last: performance.now(),
          raf: 0,
          reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        };
        overRef.current = statusAt(startX, startY);
        setSession({
          taskId,
          over: overRef.current,
          width: rect.width,
          origin: `${offsetX}px ${offsetY}px`,
          initialTransform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
        });
        sim.current.raf = requestAnimationFrame(step);
        moveTo(cx, cy);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        if (!started) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < THRESHOLD) return;
          begin(ev.clientX, ev.clientY);
        }
        moveTo(ev.clientX, ev.clientY);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        if (started) {
          suppressNextClick();
          release(true);
        }
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        if (started) release(false);
      };

      const onKey = (ev: KeyboardEvent) => {
        if (ev.key !== 'Escape' || !started) return;
        ev.preventDefault();
        ev.stopPropagation();
        cleanup();
        release(false); // springs back to where it came from
      };

      function cleanup() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey, true);
        detach.current = null;
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
      detach.current = cleanup;
    },
    [release, step]
  );

  useEffect(
    () => () => {
      detach.current?.();
      if (sim.current) cancelAnimationFrame(sim.current.raf);
    },
    []
  );

  return { session, overlayRef, bindCard };
}
