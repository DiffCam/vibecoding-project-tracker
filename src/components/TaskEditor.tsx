import { useEffect, useRef, useState } from 'react';
import { AI_TOOLS, CONTEXT_TEMPLATE, STAGES, TYPE_ACCENT } from '../constants';
import CanvasEditor from './CanvasEditor';
import Icon from './Icon';
import CustomEditor from './CustomEditor';
import PreviewPane from './PreviewPane';
import { parseSections, writeSection } from '../sections';
import { parseCanvas, REASONS } from '../reasons';
import type { ReasonKey } from '../reasons';
import { toPromptContext } from '../promptContext';
import type { Brief } from '../promptContext';
import { relativeTime } from '../relativeTime';
import TypeIcon from './TypeIcon';
import { colorFor, TAG_INK } from '../tagColor';
import { dictatingSprint, orderSprints, sprintEnd, sprintNumbers } from '../sprints';
import type {
  ContextMode,
  Milestone,
  Sprint,
  Task,
  TaskStatus,
  TaskType,
  TeamMember,
} from '../types';

// A page rather than a dialog: a task now carries three tiers of context and
// a seven-card canvas, which a centred box cannot hold without scrolling the
// thing you are writing out of view. The board stays mounted behind it in
// state only — the header is shared, so the switch reads as a view change
// rather than a navigation.
//
// What <dialog> was giving us for free and now has to be explicit: Escape to
// leave, and taking focus on open.

const MODES: [ContextMode, string][] = [
  ['simple', 'Simple'],
  ['spdd', 'SPDD'],
  ['custom', 'Custom'],
];

// No border: the fill is what marks a field, and a hairline on top of a tone
// change is saying it twice. The focus ring still does the focus job.
const FIELD =
  'w-full rounded-lg bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary';
const LABEL = 'block text-xs text-text-muted mb-1';

function blankTask(team: TeamMember[], defaults: NewTaskDefaults): Task {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    type: 'feature',
    status: defaults.status ?? 'todo',
    assignee: defaults.assignee ?? team[0]?.name ?? '',
    dueDate: null,
    createdDate: new Date().toISOString().slice(0, 10), // REQUIREMENTS 2.D
    // REQUIREMENTS 5.B asked for a filled-in template; the canvas's seven
    // cards do that job without leaving headings to delete.
    context: '',
    contextMode: 'spdd',
    contextTool: null,
    contextUpdatedAt: null,
    milestoneId: defaults.milestoneId ?? null,
    tags: [],
    sprintId: defaults.sprintId ?? null,
  };
}

export type NewTaskDefaults = {
  status?: TaskStatus;
  assignee?: string;
  milestoneId?: string | null;
  sprintId?: string | null;
};

export default function TaskEditor({
  task,
  team,
  milestones,
  sprints,
  allTags,
  tagColors,
  defaults,
  onSave,
  onDelete,
  brief,
  onClose,
}: {
  task: Task | null; // null = create mode
  team: TeamMember[];
  milestones: Milestone[];
  sprints: Sprint[];
  allTags: string[];
  tagColors: Record<string, string>;
  /** Pre-selections when creating: the lane or the teammate you came from. */
  defaults: NewTaskDefaults;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  /** The outer two tiers, so the preview shows what Copy would put down. */
  brief: Omit<Brief, 'agent'> & { agentFor: (assignee: string) => Brief['agent'] };
  onClose: () => void;
}) {
  const [form, setForm] = useState<Task>(() => task ?? blankTask(team, defaults));
  const pageRef = useRef<HTMLElement>(null);

  // What the context started as, so saving only re-stamps it when it actually
  // changed (5.D). A new task starts empty now that the canvas's cards do the
  // job the prefilled template used to.
  const originalContext = task ? task.context : '';
  const updatedHint = form.contextUpdatedAt && relativeTime(form.contextUpdatedAt);

  const numbers = sprintNumbers(sprints);
  const milestoneOf = (id: string | null) =>
    id === null ? 'no milestone' : (milestones.find((one) => one.id === id)?.name ?? 'a milestone');

  // Every sprint, not just this milestone's: picking one is how a task changes
  // milestone, so filtering by the milestone would make that unreachable.
  const sprintChoices = orderSprints(sprints);

  // A sprint filed under a milestone decides this task's, so the field shows
  // that and stops being editable — two editable fields answering the same
  // question is the confusing case. `form.milestoneId` is left alone
  // underneath, so it returns the moment the sprint does not decide any more.
  const lockedBy = dictatingSprint(form, sprints);
  const lockNote = lockedBy
    ? `Set by Sprint ${numbers[lockedBy.id]}, which is filed under this milestone. Change Sprint to Unscheduled to pick a milestone yourself; the one saved on this task comes back.`
    : undefined;

  // Which section the right-hand preview is following. Held here rather than
  // in each editor because the pane beside them needs to know it too.
  // "Other" is a mode, not a value: picking it stores whatever gets typed, so
  // the flag has to be remembered separately from the empty field it starts as.
  const [namedTool, setNamedTool] = useState(
    // `as readonly string[]` because AI_TOOLS is a const tuple and the
    // stored value is now any string.
    () => form.contextTool !== null && !(AI_TOOLS as readonly string[]).includes(form.contextTool)
  );

  const [canvasKey, setCanvasKey] = useState<ReasonKey>('requirements');
  const [customIndex, setCustomIndex] = useState(0);

  // Built from the form, not the saved task, so the preview tracks typing.
  const agent = brief.agentFor(form.assignee);
  // An untitled, empty task composes to a bare "# ", which renders as a stray
  // hash rather than a preview — show the pane's own empty line instead.
  const anything =
    form.title.trim() || form.description.trim() || form.context.trim() || brief.project?.trim();
  const composed = anything || agent ? toPromptContext(form, { project: brief.project, agent }) : '';

  /**
   * The narrowest thing on screen, as its own pasteable block: the section
   * being edited, or in Simple the task's whole context — which is the same
   * idea, since Simple is one unnamed section.
   */
  const section = (() => {
    if (form.contextMode === 'simple') return form.context;
    if (form.contextMode === 'spdd') {
      const entry = REASONS.find((one) => one.key === canvasKey);
      const body = parseCanvas(form.context).sections[canvasKey]?.trim();
      return entry && body ? `## ${entry.title}\n\n${body}` : '';
    }
    if (form.contextMode === 'custom') {
      const { sections } = parseSections(form.context);
      const picked = sections[Math.min(customIndex, sections.length - 1)];
      return picked ? writeSection(picked) : '';
    }
    return '';
  })();

  // Focus lands on the page so Escape works before anything else is touched.
  useEffect(() => {
    pageRef.current?.focus();
  }, []);

  return (
    <section
      ref={pageRef}
      tabIndex={-1}
      aria-labelledby="task-editor-title"
      onKeyDown={(event) => {
        // The one thing a dialog gave us that a page does not. Not while a
        // nested dialog is up, and not while a section name is being typed —
        // the canvas forms handle their own Escape.
        if (event.key !== 'Escape') return;
        if (document.querySelector('dialog[open]')) return;
        event.stopPropagation();
        onClose();
      }}
      // A fixed height, not flex-1: the preview panes scroll their own
      // contents, which needs a bound to scroll within. 5.5rem is the shared
      // header plus this section's padding.
      // Full width, and no padding: the preview column has to reach the right
      // edge of the window, which a centred max-width container cannot do.
      // The page margin lives on the left column and the footer instead.
      className="flex min-h-0 w-full flex-1 flex-col focus:outline-none"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(
            form.context === originalContext
              ? form
              : { ...form, contextUpdatedAt: new Date().toISOString() } // 5.D
          );
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Editing on the left, what a model will actually receive on the
            right. Both panes read the same strings the Copy buttons put on
            the clipboard, so the preview cannot drift from the thing it is
            previewing. */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="editor-gutter min-h-0 overflow-y-auto py-8">
        {/* Same accent as the card, live-updating with the Type select (3.A). */}
        <h2
          id="task-editor-title"
          className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary"
        >
          {/* Escape does this too, but a page needs a visible way out. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to the board"
            title="Back to the board (Esc)"
            className="-ml-3 shrink-0 rounded-full p-2 text-text-muted hover:bg-surface-card hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <Icon name="back" className="h-6 w-6" />
          </button>
          {/* The same filled square the card uses. These hues are picked for a
              white glyph on them, so they cannot double as text colours. */}
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${TYPE_ACCENT[form.type].fill}`}
          >
            <TypeIcon type={form.type} className="h-4 w-4 text-white" />
          </span>
          {task ? 'Edit Task' : 'New Task'}
          <span className="text-sm font-normal text-text-muted">
            · {TYPE_ACCENT[form.type].label}
          </span>
        </h2>

        <div className="space-y-3">
          {/* Title shares its line with the two fields that place the
              task in the plan: a title is wide, those two are narrow. */}
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <div>
              <label className={LABEL} htmlFor="task-title">
                Title
              </label>
              <input
                id="task-title"
                className={FIELD}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className={`${LABEL} flex items-center gap-1`} htmlFor="task-milestone">
                Milestone
                {lockNote && (
                  <span
                    role="img"
                    aria-label={lockNote}
                    title={lockNote}
                    className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-line font-mono text-[9px] leading-none"
                  >
                    ?
                  </span>
                )}
              </label>
              <select
                id="task-milestone"
                className={`${FIELD} disabled:cursor-not-allowed disabled:opacity-60`}
                // The derived milestone while a sprint decides it, the task's
                // own otherwise. Writes only ever touch the task's own.
                value={(lockedBy ? lockedBy.milestoneId : form.milestoneId) ?? ''}
                disabled={lockedBy !== undefined}
                onChange={(event) =>
                  setForm({ ...form, milestoneId: event.target.value || null })
                }
              >
                <option value="">None</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="task-sprint">
                Sprint
              </label>
              <select
                id="task-sprint"
                className={FIELD}
                value={form.sprintId ?? ''}
                onChange={(event) =>
                  setForm({ ...form, sprintId: event.target.value || null })
                }
              >
                <option value="">Unscheduled</option>
                {/* Milestone shown on each option, because choosing one here
                    is what sets the task's milestone. */}
                {sprintChoices.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    Sprint {numbers[sprint.id]} · {milestoneOf(sprint.milestoneId)} ·{' '}
                    {sprint.startDate} → {sprintEnd(sprint)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              // Fixed: a drag handle on a field that already scrolls is a
              // control with nothing to offer.
              className={`${FIELD} resize-none`}
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>

        {allTags.length > 0 && (
          <div className="mt-3">
            <p className={LABEL}>
              Tags <span className="text-text-muted">· click to select or deselect</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const on = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setForm({
                        ...form,
                        tags: on
                          ? form.tags.filter((existing) => existing !== tag)
                          : [...form.tags, tag],
                      })
                    }
                    // Selected tags wear their own colour, so the picker and
                    // the card agree on what each tag looks like.
                    style={on ? { backgroundColor: colorFor(tag, tagColors), color: TAG_INK } : undefined}
                    className={`rounded-full px-2.5 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                      on
                        ? ''
                        : // Was bg-surface-page, which is exactly the colour of
                          // the column behind it — so an unselected tag had no
                          // chip at all and read as loose text.
                          'bg-surface-card text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}


          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL} htmlFor="task-type">
                Type
              </label>
              <select
                id="task-type"
                className={FIELD}
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as TaskType })
                }
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="task-status">
                Status
              </label>
              <select
                id="task-status"
                className={FIELD}
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as TaskStatus })
                }
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="task-due">
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                className={FIELD}
                value={form.dueDate ?? ''}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value || null })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="task-assignee">
                Assignee
              </label>
              <select
                id="task-assignee"
                className={FIELD}
                value={form.assignee}
                onChange={(event) => setForm({ ...form, assignee: event.target.value })}
              >
                {/* An assignee no longer on the team (hand-edited storage, or
                    data from an older roster) would otherwise render as blank
                    and be silently rewritten on save. Show the truth instead. */}
                {!team.some((member) => member.name === form.assignee) && (
                  <option value={form.assignee}>{form.assignee} (not on the team)</option>
                )}
                {team.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
            <label className={LABEL} htmlFor="task-tool">
              AI Tool
            </label>
            <select
              id="task-tool"
              className={FIELD}
              value={namedTool ? 'Other' : (form.contextTool ?? '')}
              onChange={(event) => {
                const picked = event.target.value;
                setNamedTool(picked === 'Other');
                setForm({ ...form, contextTool: picked === 'Other' ? null : picked || null });
              }}
            >
              <option value="">Not recorded</option>
              {AI_TOOLS.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
            {namedTool && (
              <input
                autoFocus
                value={form.contextTool ?? ''}
                placeholder="Which one?"
                aria-label="Name the tool"
                onChange={(event) =>
                  setForm({ ...form, contextTool: event.target.value || null })
                }
                className={`${FIELD} mt-2`}
              />
            )}
            </div>
          </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <label
              className={LABEL}
              htmlFor={
                form.contextMode === 'spdd'
                  ? 'canvas-section'
                  : form.contextMode === 'custom'
                    ? 'custom-body'
                    : 'task-context'
              }
            >
              Context (Markdown)
            </label>
            <div className="mb-1 flex items-center gap-3">
              {updatedHint && (
                <span className="text-xs text-text-muted">Last updated {updatedHint}</span>
              )}
              {/* Both edit the same string, so switching can never lose work —
                  which is why this is a view toggle and not a mode. */}
              {/* A track with a thumb that slides, rather than three
                  separate pills: it has to read as one choice of three, and
                  the movement is what says the options are exclusive. */}
              <div
                role="radiogroup"
                aria-label="How to edit the context"
                className="relative grid grid-cols-3 rounded-full border border-line bg-surface-page p-0.5 text-xs"
              >
                <span
                  aria-hidden="true"
                  // One third wide, slid to the chosen index. Inset by the
                  // track's own padding so it never overhangs the border.
                  style={{
                    transform: `translateX(${MODES.findIndex(([mode]) => mode === form.contextMode) * 100}%)`,
                  }}
                  className="absolute inset-y-0.5 left-0.5 w-[calc((100%-0.25rem)/3)] rounded-full bg-text-primary transition-transform duration-200 ease-out"
                />
                {MODES.map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={form.contextMode === mode}
                    onClick={() => setForm({ ...form, contextMode: mode })}
                    className={`relative z-10 rounded-full px-3 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                      form.contextMode === mode
                        ? 'text-surface-card'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.contextMode === 'spdd' ? (
            <CanvasEditor
              value={form.context}
              onChange={(context) => setForm({ ...form, context })}
              open={canvasKey}
              onOpen={setCanvasKey}
            />
          ) : form.contextMode === 'custom' ? (
            <CustomEditor
              value={form.context}
              onChange={(context) => setForm({ ...form, context })}
              open={customIndex}
              onOpen={setCustomIndex}
            />
          ) : (
            // Monospace because it is Markdown being written for a model to
            // read. Tailwind's default mono stack — no extra webfont.
            <textarea
              id="task-context"
              className={`${FIELD} resize-none font-mono`}
              rows={16}
              placeholder={CONTEXT_TEMPLATE}
              value={form.context}
              onChange={(event) => setForm({ ...form, context: event.target.value })}
            />
          )}
        </div>
        </div>
        </div>

          {/* Same two panes in every mode: the part being written, and what
              a model actually receives once the outer tiers are layered on. */}
          <div className="grid min-h-0 grid-rows-2">
            <PreviewPane
              title={form.contextMode === 'simple' ? 'Task context' : 'This section'}
              markdown={section}
              copyLabel={form.contextMode === 'simple' ? 'Copy task context' : 'Copy section'}
              empty={
                form.contextMode === 'simple'
                  ? 'Nothing written yet.'
                  : 'Nothing written in this section yet.'
              }
              tone="preview"
            />
            <PreviewPane
              title="Full context — what gets pasted"
              markdown={composed}
              copyLabel="Copy full context"
              empty="Nothing to preview yet."
              tone="preview-alt"
            />
          </div>

        </div>
        <div className="editor-gutter flex shrink-0 items-center justify-between border-t border-line py-3">
          {task ? (
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-brand-accent hover:opacity-70"
              onClick={() => {
                if (window.confirm('Delete this task? This cannot be undone.')) {
                  onDelete(task.id);
                }
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:opacity-70"
              onClick={() => onClose()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
