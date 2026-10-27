// Lucide glyphs, hand-rolled to stay dependency-free. Shared because several
// of these are needed in more than one place; the one-off SVGs elsewhere
// (chevrons, copy, search) are still inline where they are used.
const PATHS = {
  plus: ['M12 5v14', 'M5 12h14'],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  sun: [
    'M12 2v2',
    'M12 20v2',
    'M4.93 4.93l1.41 1.41',
    'M17.66 17.66l1.41 1.41',
    'M2 12h2',
    'M20 12h2',
    'M6.34 17.66l-1.41 1.41',
    'M19.07 4.93l-1.41 1.41',
  ],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  check: ['M20 6L9 17l-5-5'],
  back: ['M19 12H5', 'M12 19l-7-7 7-7'],
  // A page with a folded corner and three lines of writing.
  brief: [
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
    'M14 3v5h5',
    'M9 13h6',
    'M9 17h6',
  ],
  // A head with an antenna: two eyes, a mouth, and ears down the sides.
  robot: [
    'M12 2v3',
    'M9 8h6a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z',
    'M3 13v2',
    'M21 13v2',
    'M10 13h.01',
    'M14 13h.01',
    'M10 17h4',
  ],
  copy: ['M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2'],
  pencil: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z'],
  // The same eye with a slash through it: at 10px the slash is what reads,
  // where the usual broken-lid version is four thin curves and turns to mush.
  'eye-off': ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z', 'M3 3l18 18'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  tag: ['M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z', 'M7 7h.01'],
  link: ['M9 17H7A5 5 0 0 1 7 7h2', 'M15 7h2a5 5 0 1 1 0 10h-2', 'M8 12h8'],
  // The same glyph with its connecting bar snapped — "broken" reads instantly
  // and keeps the two states the same shape family.
  'link-broken': [
    'M9 17H7A5 5 0 0 1 7 7h2',
    'M15 7h2a5 5 0 1 1 0 10h-2',
    'M8 12h1.75',
    'M14.25 12H16',
  ],
} as const;

// Drawn as a circle rather than a path, so it is kept apart from the strokes.
const CIRCLES: Partial<Record<keyof typeof PATHS, { cx: number; cy: number; r: number }>> = {
  users: { cx: 9, cy: 7, r: 4 },
  sun: { cx: 12, cy: 12, r: 4 },
  eye: { cx: 12, cy: 12, r: 3 },
  'eye-off': { cx: 12, cy: 12, r: 3 },
};

const RECTS: Partial<Record<keyof typeof PATHS, { x: number; y: number; w: number; h: number }>> = {
  copy: { x: 8, y: 8, w: 14, h: 14 },
};

export default function Icon({
  name,
  className,
}: {
  name: keyof typeof PATHS;
  className?: string;
}) {
  const circle = CIRCLES[name];
  const rect = RECTS[name];

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
      {circle && <circle cx={circle.cx} cy={circle.cy} r={circle.r} />}
      {rect && <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={2} />}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
