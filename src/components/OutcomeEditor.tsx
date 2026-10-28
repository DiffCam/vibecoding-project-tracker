import Segmented from './Segmented';

/**
 * What came of the work, in place of the brief that went in.
 *
 * Shown instead of the context section once a task is Done. Plain text by
 * default, because most outcomes are a sentence — markdown is there for the
 * ones that are a write-up, and the preview lives in the right pane rather
 * than beside the box, where the context editor already put it.
 */
export default function OutcomeEditor({
  outcome,
  markdown,
  onChange,
}: {
  outcome: string;
  markdown: boolean;
  onChange: (outcome: string, markdown: boolean) => void;
}) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <label className="text-xs text-text-muted" htmlFor="task-outcome">
          Outcome notes
        </label>
        <Segmented
          label="How to read the outcome notes"
          options={[
            ['plain', 'Plain'],
            ['markdown', 'Markdown'],
          ]}
          value={markdown ? 'markdown' : 'plain'}
          onChange={(format) => onChange(outcome, format === 'markdown')}
        />
      </div>

      <textarea
        id="task-outcome"
        value={outcome}
        placeholder={
          'What was built or fixed, and how.\n' +
          'Anything surprising, and what it cost.\n' +
          'What the next person should know.'
        }
        onChange={(event) => onChange(event.target.value, markdown)}
        className={`mt-1 min-h-0 w-full flex-1 resize-none rounded-lg bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary ${
          markdown ? 'font-mono' : ''
        }`}
      />
    </>
  );
}
