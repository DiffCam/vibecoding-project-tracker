import ReactMarkdown from 'react-markdown';

/**
 * Markdown rendered in the app's own type, not a typography plugin's.
 *
 * Every element is mapped by hand, which is a dozen lines and keeps the
 * preview on the same scale and colours as everything around it — a plugin
 * would bring its own opinions about size, measure and spacing, and a second
 * dependency to carry them.
 *
 * react-markdown renders to React elements rather than HTML, so there is no
 * dangerouslySetInnerHTML here and nothing to sanitise: raw HTML in the
 * source comes out as text.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="mb-2 mt-4 text-base font-semibold text-text-primary first:mt-0 break-words">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-1.5 mt-4 text-sm font-semibold uppercase tracking-wide text-text-muted first:mt-0 break-words">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1 mt-3 text-sm font-medium text-text-primary first:mt-0 break-words">
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="my-2 text-sm text-text-primary break-words">{children}</p>,
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-sm text-text-primary">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-sm text-text-primary">{children}</ol>
        ),
        // A quote is how a custom section carries its definition, so it wants
        // to read as an aside rather than as more body text.
        blockquote: ({ children }) => (
          <blockquote className="my-2 break-words border-l-2 border-brand-primary/40 bg-surface-page py-1 pl-3 text-sm text-text-muted">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) =>
          // react-markdown gives a fenced block a language class and an
          // inline span none, which is the only way to tell them apart.
          className ? (
            <code className="font-mono text-xs">{children}</code>
          ) : (
            <code className="rounded bg-surface-page px-1 py-0.5 font-mono text-xs text-text-primary">
              {children}
            </code>
          ),
        // A fence wraps rather than scrolls: the pane is narrow, and a
        // horizontal scrollbar inside a preview is worse than a soft wrap.
        pre: ({ children }) => (
          <pre className="my-2 whitespace-pre-wrap break-words rounded-lg bg-surface-page p-3 text-xs text-text-primary">
            {children}
          </pre>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-primary underline"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-3 border-line" />,
        strong: ({ children }) => (
          <strong className="font-semibold text-text-primary">{children}</strong>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
