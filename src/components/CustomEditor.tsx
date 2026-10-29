import { useRef, useState } from 'react';
import Icon from './Icon';
import { MoreBelow, useMoreBelow } from './ScrollEdge';
import { parseSections, sectionsToMarkdown } from '../sections';
import type { CustomSection } from '../sections';
import { assignColors, TAG_INK } from '../tagColor';

/** A section's badge letter. Duplicates are fine — the colour separates them. */
const initial = (title: string) => title.trim().charAt(0).toUpperCase() || '?';

type Draft = { index: number | null; title: string; definition: string };

/**
 * Naming a section and saying what belongs in it — the same two fields whether
 * the section is new or being renamed, so there is one form rather than two.
 *
 * Deliberately not a <form>: this renders inside the task modal's form, and a
 * nested one is invalid HTML — the browser is free to hand the submit to the
 * outer form, which reloads the page. Enter is wired by hand instead.
 */
function SectionForm({
  draft,
  onDraft,
  onCommit,
  onCancel,
}: {
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onKeyDown={(event) => {
        if (event.key === 'Escape') return onCancel();
        if (event.key !== 'Enter') return;
        // Otherwise this counts as an implicit submit of the outer form and
        // saves the whole task.
        event.preventDefault();
        onCommit();
      }}
      className="rounded-lg bg-surface-chosen p-2"
    >
      <input
        autoFocus
        value={draft.title}
        placeholder="Section name"
        aria-label="Section name"
        onChange={(event) => onDraft({ ...draft, title: event.target.value })}
        className="w-full rounded bg-surface-card px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      <input
        value={draft.definition}
        placeholder="What belongs in it"
        aria-label="What belongs in this section"
        onChange={(event) => onDraft({ ...draft, definition: event.target.value })}
        className="mt-1 w-full rounded bg-surface-card px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      <div className="mt-1.5 flex justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={!draft.title.trim()}
          className="font-medium text-brand-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-40"
        >
          {draft.index === null ? 'Add' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/**
 * Context as sections you name yourself.
 *
 * The same markdown string as the other two views — this one simply treats
 * every `##` heading as a card, which makes it a superset: a REASONS canvas
 * opens here as seven named sections, and anything written here that happens
 * to be called "Requirements" is still a canvas section over there.
 *
 * Each section carries its own definition, written into the markdown as a
 * labelled quote above the content. A model reading "Threat model notes" has
 * no idea what belongs there; the seven REASONS names need no such help,
 * which is why the canvas has no equivalent field.
 */
export default function CustomEditor({
  value,
  onChange,
  open,
  onOpen,
}: {
  value: string;
  onChange: (markdown: string) => void;
  /** Lifted, because the preview beside the editor follows the selection. */
  open: number;
  onOpen: (index: number) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);

  const { preamble, sections } = parseSections(value);
  const selected = Math.min(open, sections.length - 1);
  const current = sections[selected];
  // Same assigner as tags, teammates and sprints: by position, so two
  // sections starting with the same letter never share a badge colour.
  const colours = assignColors(sections.map((section) => section.title));

  const list = useRef<HTMLDivElement>(null);
  // Adding, removing or opening a form changes the list's height without
  // changing the box, so the count is a dependency as much as the ref is.
  const { more, sync } = useMoreBelow(list, [sections.length, draft]);

  function write(next: CustomSection[]) {
    onChange(sectionsToMarkdown(preamble, next));
  }

  function commit() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) return;

    if (draft.index === null) {
      write([...sections, { title, definition: draft.definition.trim(), body: '' }]);
      onOpen(sections.length);
    } else {
      write(
        sections.map((section, i) =>
          i === draft.index ? { ...section, title, definition: draft.definition.trim() } : section
        )
      );
    }
    setDraft(null);
  }

  return (
    // min-h-0 so the two columns scroll inside the editor rather than pushing
    // the page taller.
    <div className="mt-1 grid min-h-0 flex-1 grid-cols-[minmax(0,16rem)_minmax(0,1fr)] gap-4">
      <div className="relative min-h-0">
      <div
        ref={list}
        onScroll={sync}
        className="flex h-full flex-col gap-1.5 overflow-y-auto pb-6"
      >
        {sections.map((section, index) => {
          if (draft?.index === index) {
            return (
              <SectionForm
                key={index}
                draft={draft}
                onDraft={setDraft}
                onCommit={commit}
                onCancel={() => setDraft(null)}
              />
            );
          }

          const filled = section.body.trim().length > 0;
          const active = index === selected;

          return (
            <div
              key={index}
              // One fill per state, rather than a fill plus a border saying
              // the same thing: selected is brand, written is green, and
              // untouched is the same surface every other field uses.
              className={`flex items-start gap-2 rounded-lg p-2 transition-colors ${
                active
                  ? 'bg-surface-chosen'
                  : filled
                    ? 'bg-status-done/10'
                    : 'bg-surface-card'
              }`}
            >
              {/* Matches the canvas's badge so the two views read as the same
                  kind of thing. The letter comes from the name, the colour
                  from position — the name cannot be relied on to differ. */}
              <span
                aria-hidden="true"
                style={{ backgroundColor: colours[section.title], color: TAG_INK }}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-medium"
              >
                {initial(section.title)}
              </span>

              <button
                type="button"
                onClick={() => onOpen(index)}
                aria-pressed={active}
                className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {section.title}
                  </span>
                  {filled && (
                    <Icon
                      name="check"
                      aria-label="written"
                      className="h-3.5 w-3.5 shrink-0 text-status-done"
                    />
                  )}
                </span>
                {/* Full strength on the chosen card: muted only reaches
                    3.3:1 on that fill. Size and weight still separate it
                    from the title above. */}
                <span
                  className={`mt-0.5 block text-[11px] leading-snug ${
                    active ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {section.definition.trim() || 'No definition — say what belongs here.'}
                </span>
              </button>

              <span className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    write(sections.filter((_, i) => i !== index));
                    onOpen(0);
                  }}
                  aria-label={`Remove ${section.title}`}
                  title={`Remove ${section.title}`}
                  className="rounded p-0.5 text-text-muted hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({ index, title: section.title, definition: section.definition })
                  }
                  aria-label={`Rename ${section.title}`}
                  title={`Rename ${section.title}, or change what belongs in it`}
                  className="rounded p-0.5 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          );
        })}

        {draft?.index === null ? (
          <SectionForm
            draft={draft}
            onDraft={setDraft}
            onCommit={commit}
            onCancel={() => setDraft(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setDraft({ index: null, title: '', definition: '' })}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-text-muted p-2 text-sm text-text-muted hover:border-brand-primary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <Icon name="plus" className="h-4 w-4 shrink-0" />
            Add a section
          </button>
        )}
      </div>
        <MoreBelow show={more} fade="from-surface-page" />
      </div>

      <div className="flex min-w-0 flex-col">
        {current ? (
          <>
            <label className="mb-1 block text-xs text-text-muted" htmlFor="custom-body">
              {current.title}
              {current.definition.trim() && (
                // Shown, not edited: the pencil on the card owns this now, so
                // there is one place to change it rather than two.
                <span className="text-text-muted"> · {current.definition.trim()}</span>
              )}
            </label>
            <textarea
              id="custom-body"
              // Uncontrolled, and keyed per section so switching resets it.
              // The value round-trips through parse/serialise on every
              // keystroke, and that serialiser trims — so a trailing space or
              // newline was being thrown away before it could render, which
              // made Space and Enter look like dead keys. The DOM holds the
              // raw text; trimming applies only to what gets stored.
              key={selected}
              defaultValue={current.body}
              placeholder={current.definition.trim() || `What belongs in ${current.title}.`}
              onChange={(event) =>
                write(
                  sections.map((section, i) =>
                    i === selected ? { ...section, body: event.target.value } : section
                  )
                )
              }
              className="w-full flex-1 resize-none rounded-lg bg-surface-card px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-text-muted p-6 text-center text-sm text-text-muted">
            No sections yet. Add one to describe a kind of context this task needs.
          </p>
        )}
      </div>
    </div>
  );
}
