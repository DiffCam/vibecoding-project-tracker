import type { TaskType } from '../types';

// Two hand-rolled icons in Lucide's visual language (24 viewBox, 2px round
// stroke, currentColor) — a sparkle for feature, a ladybug for bug. Decorative:
// the readable label is the sr-only text the card and modal render alongside.
export default function TypeIcon({
  type,
  className,
}: {
  type: TaskType;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === 'feature' ? (
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      ) : (
        <>
          <circle cx="12" cy="13" r="6" />
          <path d="M12 7v12" />
          <path d="M8.5 5l1.8 2.6M15.5 5l-1.8 2.6" />
        </>
      )}
    </svg>
  );
}
