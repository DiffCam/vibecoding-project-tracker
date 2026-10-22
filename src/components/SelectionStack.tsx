import TaskCard from './TaskCard';
import { CHIP_SCALE } from '../useCardDrag';
import type { Task } from '../types';

/** How many cards are drawn before the rest become a counter. */
export const STACK_LAYERS = 3;

/** Offset per layer, in unscaled card pixels — the scale shrinks it to ~5px. */
const STEP = 13;

/**
 * How far past the top card the pile reaches, in real pixels.
 *
 * The caller positions the top card, so without this the deeper layers would
 * hang below that point and cover whatever the pile is aimed at.
 */
export function stackSpread(count: number): number {
  return (Math.min(count, STACK_LAYERS) - 1) * STEP * CHIP_SCALE;
}

/**
 * The cards currently held in select mode, drawn as a small pile.
 *
 * Shares the carried chip's scale, so a group reads as the same kind of thing
 * as a single card in the air. Newest sits on top and furthest back-left, with
 * older ones stepping down and right behind it — so the card you just took is
 * the one you see, and the depth says how many came before.
 *
 * `at` is an unscaled box: each layer scales about its own top-left, which
 * keeps the offsets proportional at any scale and lets the caller position the
 * pile the same way the single chip is positioned.
 */
export default function SelectionStack({
  held,
  total,
  at,
  tagColors,
  sprintOf,
}: {
  /** Newest first, already capped at STACK_LAYERS. */
  held: Task[];
  /** The whole selection, which may be larger than `held`. */
  total: number;
  at: { left: number; top: number; width: number };
  tagColors: Record<string, string>;
  sprintOf: (task: Task) => { label: string; name: string; colour: string } | undefined;
}) {
  const hidden = total - held.length;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50 transition-all duration-200 ease-out"
      style={{ left: at.left, top: at.top }}
    >
      {/* Painted back to front so the newest ends up on top without z-index
          on every layer: reversed here, newest last in the DOM. */}
      {[...held].reverse().map((task, index) => {
        const depth = held.length - 1 - index; // 0 for the newest
        return (
          <div
            key={task.id}
            className="absolute left-0 top-0 drop-shadow-md"
            style={{
              width: at.width,
              transform: `translate(${depth * STEP * CHIP_SCALE}px, ${
                depth * STEP * CHIP_SCALE
              }px) scale(${CHIP_SCALE})`,
              transformOrigin: 'top left',
            }}
          >
            <TaskCard
              task={task}
              sprint={sprintOf(task)}
              tagColors={tagColors}
              isOverlay
              onOpen={() => {}}
              onCopy={() => {}}
              onHighlight={() => {}}
              selection={null}
            />
          </div>
        );
      })}

      {/* Sits past the deepest layer so it never covers a card. Placed in
          scaled pixels, because the pile's own transforms do not apply here. */}
      {hidden > 0 && (
        <span
          className="absolute flex h-5 items-center rounded-full bg-text-primary px-1.5 font-mono text-[10px] font-medium leading-none text-surface-card"
          style={{
            left: (held.length - 1) * STEP * CHIP_SCALE + at.width * CHIP_SCALE + 4,
            top: (held.length - 1) * STEP * CHIP_SCALE,
          }}
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}
