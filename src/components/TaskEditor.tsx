import { useEffect, useRef, useState } from 'react';
import { AI_TOOLS, CONTEXT_TEMPLATE, STAGES } from '../constants';
import { STATUS_DOT, TYPE_ACCENT } from '../constants';
import Avatar from './Avatar';
import CanvasEditor from './CanvasEditor';
import Icon from './Icon';
import Picker from './Picker';
import type { Choice } from './Picker';
import TypeIcon from './TypeIcon';
import HistoryList from './HistoryList';
import TaskEventList from './TaskEventList';
import { contextChange, describeChanges, naming } from '../taskHistory';
import Segmented from './Segmented';
import ConfirmDialog from './ConfirmDialog';
import { contextAt, recordVersion } from '../contextHistory';
import CustomEditor from './CustomEditor';
import PreviewPane from './PreviewPane';
import { parseSections, writeSection } from '../sections';
import { parseCanvas, REASONS } from '../reasons';
import type { ReasonKey } from '../reasons';
import { toPromptContext } from '../promptContext';
import type { Brief } from '../promptContext';
import { relativeTime } from '../relativeTime';
import { colorFor, TAG_INK } from '../tagColor';
import { dictatingSprint, orderSprints, shortDate, sprintEnd, sprintNumbers } from '../sprints';
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
/** The same field, sized to sit on a header row beside a label, not under one. */
const INLINE_FIELD =
  'rounded-lg bg-surface-card px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary';

function blankTask(team: TeamMember[], defaults: NewTaskDefaults): Task {
  return {
    id: crypto.randomUUID(),
    // Handed down rather than derived: only the board knows what is already
    // taken, and a key that collides is worse than one that is wrong.
    key: defaults.key ?? 1,
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
    history: [],
    events: [],
    weight: 1,
    contextTool: null,
    contextUpdatedAt: null,
    milestoneId: defaults.milestoneId ?? null,
    tags: [],
    sprintId: defaults.sprintId ?? null,
  };
}

export type NewTaskDefaults = {
  /** The next unused task key. Required in practice; App always sends it. */
  key?: number;
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
  memberColors,
  sprintColors,
  defaults,
  onSave,
  onType,
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
  /** The same resolved colours the board uses, so a pill or an avatar here
      is the one you already recognise from out there. */
  memberColors: Record<string, string>;
  sprintColors: Record<string, string>;
  /** Pre-selections when creating: the lane or the teammate you came from. */
  defaults: NewTaskDefaults;
  onSave: (task: Task) => void;
  /** The title and its accent live in the shared header, which is outside
      this component but has to follow the Type select rather than the task. */
  onType: (type: TaskType) => void;
  onDelete: (id: string) => void;
  /** The outer two tiers, so the preview shows what Copy would put down. */
  brief: Omit<Brief, 'agent'> & { agentFor: (assignee: string) => Brief['agent'] };
  onClose: () => void;
}) {
  const [form, setForm] = useState<Task>(() => task ?? blankTask(team, defaults));
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => onType(form.type), [form.type, onType]);

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
  const sprintSummary = (sprint: Sprint) =>
    `Sprint ${numbers[sprint.id]} · ${milestoneOf(sprint.milestoneId)} · ${shortDate(sprint.startDate)} → ${shortDate(sprintEnd(sprint))}`;

  /** The board's own pill, so a sprint looks the same wherever it is named. */
  const sprintPill = (sprint: Sprint) => (
    <span
      style={{ backgroundColor: sprintColors[sprint.id], color: TAG_INK }}
      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
    >
      Sprint {numbers[sprint.id]}
    </span>
  );

  const sprintPicks: Choice[] = [
    { value: '', label: 'Unscheduled', row: <span className="text-text-muted">Unscheduled</span> },
    ...sprintChoices.map((sprint) => ({
      value: sprint.id,
      label: sprintSummary(sprint),
      // Stacked, because three facts inlined in a 190px list read as one
      // long string. The range stays on one line: a start date without its
      // end is not a thing anyone reads.
      row: (
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          {sprintPill(sprint)}
          <span className="max-w-full truncate text-xs text-text-muted">
            {milestoneOf(sprint.milestoneId)}
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            {shortDate(sprint.startDate)} → {shortDate(sprintEnd(sprint))}
          </span>
        </span>
      ),
      // The closed field is about 190px, which the pill and a milestone name
      // already fill; the dates would make every sprint read "Launch · 2…".
      face: (
        <>
          {sprintPill(sprint)}
          <span className="truncate text-xs text-text-muted">
            {milestoneOf(sprint.milestoneId)}
          </span>
        </>
      ),
    })),
  ];

  const milestonePicks: Choice[] = [
    { value: '', label: 'None', row: <span className="truncate text-text-muted">None</span> },
    ...milestones.map((milestone) => ({
      value: milestone.id,
      label: milestone.name,
      row: <span className="truncate">{milestone.name}</span>,
    })),
  ];

  const typePicks: Choice[] = (['feature', 'bug'] as TaskType[]).map((type) => ({
    value: type,
    label: TYPE_ACCENT[type].label,
    row: (
      <>
        {/* The same filled square the card and the page header use, so one
            task wears one mark everywhere. */}
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${TYPE_ACCENT[type].fill}`}
        >
          <TypeIcon type={type} className="h-3.5 w-3.5 text-white" />
        </span>
        {TYPE_ACCENT[type].label}
      </>
    ),
  }));

  const statusPicks: Choice[] = STAGES.map((stage) => ({
    value: stage.id,
    label: stage.label,
    row: (
      <>
        {/* The lane's own dot. Status sits between two fields that carry a
            mark and would otherwise be the one bare row in the column. */}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[stage.id]}`} />
        {stage.label}
      </>
    ),
  }));

  const person = (name: string, accent: string | undefined, agent: boolean, note?: string) => (
    <>
      {/* The robot glyph instead of initials, which is how an agent is told
          from a person everywhere else. */}
      <Avatar small name={name} accent={accent} agent={agent} />
      <span className="truncate">{name}</span>
      {note && <span className="shrink-0 text-xs text-text-muted">{note}</span>}
    </>
  );

  const assigneePicks: Choice[] = [
    // An assignee no longer on the team (hand-edited storage, or data from an
    // older roster) would otherwise vanish from the control and be silently
    // rewritten on save. Show the truth instead.
    ...(team.some((member) => member.name === form.assignee)
      ? []
      : [
          {
            value: form.assignee,
            label: `${form.assignee} — not on the team`,
            row: person(form.assignee, undefined, false, 'not on the team'),
          },
        ]),
    ...team.map((member) => ({
      value: member.name,
      label: member.name,
      row: person(member.name, memberColors[member.name], member.agent !== undefined),
    })),
  ];

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

  /** What the Weight box shows, which is not always a number you can store. */
  const [weightText, setWeightText] = useState(() => String(form.weight));

  const [canvasKey, setCanvasKey] = useState<ReasonKey>('requirements');
  const [rightPane, setRightPane] = useState<'preview' | 'context' | 'task'>('preview');
  /**
   * Bumped whenever the context is replaced from outside the editor.
   *
   * The canvas and custom textareas are uncontrolled on purpose — the store
   * trims, which was swallowing Space and Enter — so they hold their own
   * text and will not pick up a change they did not cause. Restoring a
   * version left them showing the old text while the preview showed the new,
   * and the next keystroke merged the stale text back in. Keying on this
   * remounts them, which is the only thing that resets a defaultValue.
   */
  const [restoredAt, setRestoredAt] = useState(0);
  /**
   * Which saved version the editor is working from. Saving on top of an older
   * one drops everything after it, so this is what the warning is about.
   */
  const [basedOn, setBasedOn] = useState(form.history.length - 1);
  /** A save held back until the overwrite warning is answered. */
  const [pendingSave, setPendingSave] = useState<Task | null>(null);
  /**
   * The task as last written, so the footer can tell "there is something to
   * save" from "you are done". Any field counts, not just the context.
   */
  /**
   * The task as last written. One object serves both jobs: deciding whether
   * there is anything to save, and being the baseline the change log is
   * measured against. Using the `task` prop for the second would re-report
   * the first save's changes on the second, now that saving keeps you here.
   */
  const [saved, setSaved] = useState<Task>(form);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
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

  /**
   * The task as it would be saved.
   *
   * A version is recorded only when the context changed — switching editor
   * view is not a version of the content, and recording it would fill the
   * list with entries holding an empty patch.
   */
  function commit(): Task {
    const at = new Date().toISOString();
    const changed = form.context !== contextAt(form.history, form.history.length - 1);

    const history = changed
      ? recordVersion(form.history, basedOn, { at, mode: form.contextMode, context: form.context })
      : form.history;

    const changes = describeChanges(saved, form, naming(milestones, sprints));
    // The context's own line is version numbers; its body is the other tab.
    if (changed) changes.push(contextChange(basedOn + 1, history.length));

    if (changes.length === 0) return form;

    return {
      ...form,
      contextUpdatedAt: changed ? at : form.contextUpdatedAt, // 5.D
      history,
      events: [...form.events, { at, changes }],
    };
  }

  /**
   * Writes the task and stays put.
   *
   * Saving used to return to the board, which made building up any history a
   * matter of reopening the task each time. The form becomes the new
   * baseline, and the newly written version becomes the one being worked
   * from — otherwise the next save would branch off the old one.
   */
  function persist(next: Task) {
    onSave(next);
    setForm(next);
    setSaved(next);
    setBasedOn(next.history.length - 1);
    setSavedAt(new Date().toISOString());
  }

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
      // flex-1 inside a h-screen column, not a height of its own: the preview
      // panes scroll their contents and need a bound to scroll within, and
      // subtracting a hard-coded header height was a guess that came out a
      // few pixels wrong.
      // Full width, and no padding: the preview column has to reach the right
      // edge of the window, which a centred max-width container cannot do.
      // The page margin lives on the left column and the footer instead.
      className="flex min-h-0 w-full flex-1 flex-col focus:outline-none"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const next = commit();
          // Positional, not a length comparison: replacing one version with
          // one leaves the length unchanged, so saving from v2 of 3 destroyed
          // v3 silently. Anything but the newest version discards something.
          const discards = next !== form && basedOn < form.history.length - 1;
          if (discards) setPendingSave(next);
          else persist(next);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Editing on the left, what a model will actually receive on the
            right. Both panes read the same strings the Copy buttons put on
            the clipboard, so the preview cannot drift from the thing it is
            previewing. */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* A column, so the context below can take whatever the fields above
            leave. It still scrolls, but only once the context has hit the
            floor it refuses to shrink past. */}
        <div className="editor-gutter flex min-h-0 flex-col overflow-y-auto py-8">
        {/* The title, its accent and the way back all live in the shared
            header now — see App. This pane starts straight in on the fields. */}
        <div className="shrink-0 space-y-3">
          {/* Title shares its line with the two fields that place the
              task in the plan: a title is wide, those two are narrow. */}
          <div className="grid grid-cols-[minmax(0,2fr)_5rem_minmax(0,1fr)_minmax(0,1fr)] gap-3">
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
              <label className={LABEL} htmlFor="task-weight">
                Weight
              </label>
              {/* The box holds what you typed; the task only takes a value
                  once it is a positive integer, and blur snaps the box back
                  to what was stored. Clamping on every keystroke instead
                  refills an emptied field with 1, so replacing 1 with 25
                  leaves you typing "125". */}
              <input
                id="task-weight"
                type="number"
                min={1}
                step={1}
                className={FIELD}
                value={weightText}
                onChange={(event) => {
                  setWeightText(event.target.value);
                  const typed = Math.floor(Number(event.target.value));
                  if (Number.isFinite(typed) && typed >= 1) setForm({ ...form, weight: typed });
                }}
                onBlur={() => setWeightText(String(form.weight))}
              />
            </div>
            {/* Sprint before Milestone, because that is the order the two
                decide each other in: picking a filed sprint sets the
                milestone and locks the field to its right. */}
            <div>
              <label className={LABEL} htmlFor="task-sprint">
                Sprint
              </label>
              {/* Milestone shown on every row, because choosing a sprint here
                  is what sets the task's milestone. */}
              <Picker
                id="task-sprint"
                value={form.sprintId ?? ''}
                choices={sprintPicks}
                rowHeight={72}
                onChange={(id) => setForm({ ...form, sprintId: id || null })}
                // The dates the closed field has no room for, on hover.
                title={sprintPicks.find((pick) => pick.value === (form.sprintId ?? ''))?.label}
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
              <Picker
                id="task-milestone"
                // The derived milestone while a sprint decides it, the task's
                // own otherwise. Writes only ever touch the task's own.
                value={(lockedBy ? lockedBy.milestoneId : form.milestoneId) ?? ''}
                choices={milestonePicks}
                disabled={lockedBy !== undefined}
                title={lockNote}
                onChange={(id) => setForm({ ...form, milestoneId: id || null })}
              />
            </div>
          </div>

          {/* The description and the four one-line answers about the task,
              side by side. A fixed column rather than a fraction: these hold
              "In Progress" and a date picker, which have a width they need
              and no use for more. */}
          <div className="grid grid-cols-[minmax(0,1fr)_14rem] gap-3">
            <div className="flex flex-col">
              <label className={LABEL} htmlFor="task-description">
                Description
              </label>
              {/* flex-1, so it runs from the top of Type to the bottom of Due
                  date. Resize handle removed: a drag handle on a field that
                  already scrolls is a control with nothing to offer. */}
              <textarea
                id="task-description"
                className={`${FIELD} min-h-[5rem] flex-1 resize-none`}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div>
                <label className={LABEL} htmlFor="task-type">
                  Type
                </label>
                <Picker
                  id="task-type"
                  value={form.type}
                  choices={typePicks}
                  onChange={(type) => setForm({ ...form, type: type as TaskType })}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="task-status">
                  Status
                </label>
                <Picker
                  id="task-status"
                  value={form.status}
                  choices={statusPicks}
                  onChange={(status) => setForm({ ...form, status: status as TaskStatus })}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="task-assignee">
                  Assignee
                </label>
                <Picker
                  id="task-assignee"
                  value={form.assignee}
                  choices={assigneePicks}
                  onChange={(assignee) => setForm({ ...form, assignee })}
                />
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


        </div>

        {/* Everything the fields above leave, down to a floor. Past that floor
            the left pane scrolls instead — a canvas squeezed into three
            visible lines is worse than a scrollbar. */}
        <div className="mt-3 flex min-h-[20rem] flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <label
              className="text-xs text-text-muted"
              htmlFor={
                form.contextMode === 'spdd'
                  ? 'canvas-section'
                  : form.contextMode === 'custom'
                    ? 'custom-body'
                    : 'task-context'
              }
            >
              Task context (Markdown)
            </label>
            <div className="flex items-center gap-3">
              {updatedHint && (
                <span className="text-xs text-text-muted">Last updated {updatedHint}</span>
              )}
              {/* The tool is a fact about the context, not about the task, so
                  it belongs on the context's own header rather than up among
                  the scheduling fields. */}
              <span className="flex items-center gap-1.5">
                <label className="shrink-0 text-xs text-text-muted" htmlFor="task-tool">
                  AI tool
                </label>
                <select
                  id="task-tool"
                  className={INLINE_FIELD}
                  value={namedTool ? 'Other' : (form.contextTool ?? '')}
                  onChange={(event) => {
                    const picked = event.target.value;
                    setNamedTool(picked === 'Other');
                    setForm({
                      ...form,
                      contextTool: picked === 'Other' ? null : picked || null,
                    });
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
                    className={`${INLINE_FIELD} w-28`}
                  />
                )}
              </span>
              {/* Both edit the same string, so switching can never lose work —
                  which is why this is a view toggle and not a mode. */}
              <Segmented
                label="How to edit the context"
                options={MODES}
                value={form.contextMode}
                onChange={(mode) => setForm({ ...form, contextMode: mode })}
              />
            </div>
          </div>

          {form.contextMode === 'spdd' ? (
            <CanvasEditor
              key={restoredAt}
              value={form.context}
              onChange={(context) => setForm({ ...form, context })}
              open={canvasKey}
              onOpen={setCanvasKey}
            />
          ) : form.contextMode === 'custom' ? (
            <CustomEditor
              key={restoredAt}
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
              className={`${FIELD} mt-1 min-h-0 flex-1 resize-none font-mono`}
              placeholder={CONTEXT_TEMPLATE}
              value={form.context}
              onChange={(event) => setForm({ ...form, context: event.target.value })}
            />
          )}
        </div>
        </div>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            {/* A thin rail over both panes: what is on the right is either a
                preview of the context or the record of it. */}
            {/* The toggle is centred on the pane, not balanced against the
                counter beside it — the counter only exists on one of the
                three tabs, so sharing the row would shift the toggle as you
                moved between them. */}
            <div className="relative flex items-center justify-center bg-surface-preview px-4 py-2">
              <Segmented
                label="What the right pane shows"
                options={[
                  ['preview', 'Context preview'],
                  ['context', 'Context history'],
                  ['task', 'Task history'],
                ]}
                value={rightPane}
                onChange={setRightPane}
              />
              {rightPane === 'context' && form.history.length > 0 && (
                <span className="absolute right-4 font-mono text-[11px] text-text-muted">
                  v{basedOn + 1} of {form.history.length}
                </span>
              )}
            </div>

            {rightPane === 'task' ? (
              <div className="min-h-0 overflow-y-auto bg-surface-preview-alt">
                <TaskEventList events={form.events} />
              </div>
            ) : rightPane === 'context' ? (
              <div className="min-h-0 overflow-y-auto bg-surface-preview-alt">
                <HistoryList
                  history={form.history}
                  basedOn={basedOn}
                  onPick={(index) => {
                    // Loads the version into the editor without writing
                    // anything — including the view it was written in.
                    setBasedOn(index);
                    setRestoredAt((n) => n + 1);
                    setForm({
                      ...form,
                      context: contextAt(form.history, index),
                      contextMode: form.history[index].mode,
                    });
                  }}
                />
              </div>
            ) : (
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
            )}
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

          <div className="flex items-center gap-3">
            {savedAt && !dirty && (
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Icon name="check" className="h-4 w-4 shrink-0 text-status-done" />
                Saved
              </span>
            )}
            {/* Two buttons, never both: there is either something to write or
                nothing left to do. Cancel only while there is something to
                abandon. */}
            {dirty ? (
              <>
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-text-muted hover:opacity-70"
                  onClick={() => onClose()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </form>
      {pendingSave && (
        <ConfirmDialog
          title="Overwrite the newer versions?"
          confirmLabel="Overwrite"
          message={`You are working from v${basedOn + 1}, and v${
            basedOn + 2
          } onwards came after it. Saving replaces ${
            form.history.length - basedOn - 1
          } later version${form.history.length - basedOn - 1 === 1 ? '' : 's'} with this one.`}
          onConfirm={() => {
            const next = pendingSave;
            setPendingSave(null);
            persist(next);
          }}
          onCancel={() => setPendingSave(null)}
        />
      )}
    </section>
  );
}
