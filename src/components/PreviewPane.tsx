import { useState } from 'react';
import Icon from './Icon';
import Markdown from './Markdown';

/**
 * Rendered markdown with a button that copies the source behind it.
 *
 * The button copies exactly the string this pane was given, so what is on the
 * clipboard is always what is on screen — the preview cannot drift from the
 * thing it is previewing.
 */
export default function PreviewPane({
  title,
  markdown,
  copyLabel,
  empty,
  tone,
}: {
  title: string;
  markdown: string;
  copyLabel: string;
  /** Shown instead of the body when there is nothing to preview. */
  empty: string;
  /** Which of the two preview surfaces this pane sits on. */
  tone: 'preview' | 'preview-alt';
}) {
  const [copied, setCopied] = useState(false);
  const body = markdown.trim();

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Secure-context or permission failure. Saying nothing would look like
      // it worked, which on stage is worse than the failure.
      setCopied(false);
      window.prompt('Copy blocked by the browser — copy it from here:', markdown);
    }
  }

  return (
    // No border, no radius, no card: it is a region of the page rather than
    // an object on it, which is also what buys back the inset space.
    <section
      className={`flex min-h-0 flex-col ${
        tone === 'preview' ? 'bg-surface-preview' : 'bg-surface-preview-alt'
      }`}
    >
      <p className="shrink-0 px-4 pb-1 pt-3 font-mono text-[11px] uppercase tracking-wide text-text-muted">
        {title}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {body ? (
          <Markdown>{body}</Markdown>
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">{empty}</p>
        )}
      </div>

      <div className="flex shrink-0 justify-end px-4 py-2">
        <button
          type="button"
          onClick={copy}
          disabled={!body}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-card px-3 py-1 text-xs text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line"
        >
          <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5 shrink-0" />
          {copied ? 'Copied' : copyLabel}
        </button>
      </div>
    </section>
  );
}
