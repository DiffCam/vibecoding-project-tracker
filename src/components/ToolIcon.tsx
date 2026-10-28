/**
 * The AI tools' marks, from `public/`.
 *
 * Drawn as a mask over `currentColor` rather than an `<img>`: the files are
 * monochrome `fill="currentColor"`, which an `<img>` cannot inherit — it
 * renders in its own document and would come out black on both themes. A
 * mask throws away the file's colour and keeps only its shape, so the glyph
 * is whatever the surrounding text is and the theme toggle needs no second
 * set of files.
 *
 * The alternative was a build plugin to inline them as components, or
 * copying four kilobytes of path data into a TS file. This needs neither,
 * and the files stay where they were dropped.
 *
 * Mask properties go in `style` rather than an arbitrary utility: the value
 * is a `url()` containing slashes and dots, which Tailwind drops silently.
 */
const FILES: Record<string, string> = {
  Claude: 'claude',
  ChatGPT: 'openai',
  Cursor: 'cursor',
  Lovable: 'lovable',
  Replit: 'replit',
};

/** Whether a tool has a mark, so callers can reserve space only when it does. */
export function hasToolIcon(tool: string | null): boolean {
  return tool !== null && tool in FILES;
}

export default function ToolIcon({
  tool,
  className = 'h-4 w-4',
}: {
  tool: string | null;
  className?: string;
}) {
  const file = tool === null ? undefined : FILES[tool];
  if (file === undefined) return null;

  const url = `url(/${file}.svg)`;
  return (
    <span
      aria-hidden="true"
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
      className={`inline-block shrink-0 bg-current ${className}`}
    />
  );
}
