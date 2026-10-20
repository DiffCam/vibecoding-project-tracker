import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// Aliased: the bare name would shadow the DOM KeyboardEvent used by the
// window-level listeners below.
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { locate, navigate } from './boardNavigation';
import { DEFAULT_TEAM, SEED_ANCHORS, STAGES } from './constants';
import { SEED_TASKS } from './seedTasks';
import AnchorBoard from './components/AnchorBoard';
import ConfirmDialog from './components/ConfirmDialog';
import DrivingStrip from './components/DrivingStrip';
import Icon from './components/Icon';
import Logo from './components/Logo';
import MilestoneTabs from './components/MilestoneTabs';
import TaskCard from './components/TaskCard';
import TagsDialog from './components/TagsDialog';
import TaskModal from './components/TaskModal';
import type { NewTaskDefaults } from './components/TaskModal';
import SearchDialog, { FilterTag } from './components/SearchDialog';
import ShortcutOverlay from './components/ShortcutOverlay';
import TeamDialog from './components/TeamDialog';
import ThemeToggle from './components/ThemeToggle';
import { toPromptContext } from './promptContext';
import { resolveTagColors } from './tagColor';
import { addFilter, matchesFilters } from './taskFilter';
import type { Filter, FilterField } from './taskFilter';
import { useCardDrag } from './useCardDrag';
import { useFlip } from './useFlip';
import { useLocalStorage } from './useLocalStorage';
import { isTyping, MODIFIER_LABEL, useModifierKey } from './useModifierKey';
import type { Anchor, Milestone, Task, TaskStatus } from './types';

/** Lanes alternate between the two recessed tones. */
const laneTone = (index: number) =>
  index % 2 === 0 ? 'bg-surface-sunken' : 'bg-surface-sunken-alt';

/** A keycap. Raised surface + hairline, so a key reads as a key and not as prose. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-px inline-block rounded border border-line bg-surface-card px-1.5 py-0.5 text-[11px] leading-none text-text-primary">
      {children}
    </kbd>
  );
}

/**
 * Wraps a child in the entrance animation, but only while the app is still
 * entering. After that it renders a plain div — otherwise a card would replay
 * its fade every time it moved columns and React remounted it.
 */
function Enter({
  on,
  delay,
  children,
}: {
  on: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={on ? 'anim-rise' : undefined}
      style={on ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export default function App() {
  // Tasks saved before `tags` and `milestoneId` existed come back without
  // them. Filled in once here so every consumer can trust the type, rather
  // than each one coalescing defensively and one of them forgetting.
  const [tasks, setTasks] = useLocalStorage<Task[]>('vibetracker.tasks', SEED_TASKS, (stored) =>
    stored.map((task) => ({
      ...task,
      tags: task.tags ?? [],
      milestoneId: task.milestoneId ?? null,
    }))
  );
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // `target` is where the carried card is hovering. Nothing is written to tasks
  // until it is placed, so the Driving strip and localStorage stay still while
  // a card is in the air, and Escape costs nothing to undo.
  const [grabbed, setGrabbed] = useState<{ id: string; target: TaskStatus } | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [showTeam, setShowTeam] = useState(false);
  const [newDefaults, setNewDefaults] = useState<NewTaskDefaults>({});
  // Entrance plays once on load and is then switched off for good.
  const [entering, setEntering] = useState(true);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Milestone | null>(null);
  const [showTags, setShowTags] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const newTaskRef = useRef<HTMLButtonElement>(null);

  const { session: drag, overlayRef, bindCard } = useCardDrag(moveTask);
  const draggedTask = drag ? tasks.find((task) => task.id === drag.taskId) : undefined;
  useFlip(boardRef);

  // The element that opened the modal, so focus can go back to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  const [anchors, setAnchors] = useLocalStorage<Anchor[]>('vibetracker.anchors', SEED_ANCHORS);
  const [team, setTeam] = useLocalStorage<string[]>('vibetracker.team', DEFAULT_TEAM);
  const [allTags, setAllTags] = useLocalStorage<string[]>('vibetracker.tags', [
    'VIP',
    'System:Clipboard',
  ]);
  // Only the keys someone has explicitly picked a colour for; everything else
  // is handed one automatically.
  const [chosenColors, setChosenColors] = useLocalStorage<Record<string, string>>(
    'vibetracker.tagColors',
    {}
  );
  const tagColors = resolveTagColors(allTags, chosenColors);
  const [milestones, setMilestones] = useLocalStorage<Milestone[]>(
    'vibetracker.milestones',
    []
  );
  // Which tab is open is a view, not data — it resets to All on reload rather
  // than landing you on a near-empty board with no memory of why.
  const [activeMilestone, setActiveMilestone] = useState<string | null>(null);

  // First visit follows the OS; after that the stored choice wins.
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(
    'vibetracker.theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 900);
    return () => clearTimeout(timer);
  }, []);

  /**
   * A bare N opens the new-task modal.
   *
   * NOT ⌘N: the browser claims that for New Window and never delivers the
   * keydown to the page, so it cannot be intercepted. Same for ⌘T and ⌘W.
   * `open` is a stale closure here by design — it only touches refs and
   * setState, both of which are stable.
   */
  useEffect(() => {
    const actions: Record<string, () => void> = {
      n: () => open('new', newTaskRef.current), // focus returns to the button on close
      t: () => setShowTeam(true),
      d: () => setTheme('dark'),
      l: () => setTheme('light'),
      m: () => {
        // All, then each milestone, then back to All.
        const ring: (string | null)[] = [null, ...milestones.map((one) => one.id)];
        const at = ring.indexOf(activeMilestone);
        setActiveMilestone(ring[(at + 1) % ring.length]);
      },
    };

    const onKey = (event: KeyboardEvent) => {
      const action = actions[event.key.toLowerCase()];
      if (!action) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (document.querySelector('dialog[open]') !== null) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // `m` reads the milestone list and the open tab, so this one cannot be
    // a mount-only listener the way the others could.
  }, [milestones, activeMilestone]);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  function open(
    target: Task | 'new',
    opener: HTMLElement | null,
    defaults: NewTaskDefaults = {}
  ) {
    openerRef.current = opener;
    // Create inside whichever milestone is open, unless told otherwise.
    setNewDefaults({ milestoneId: activeMilestone, ...defaults });
    setEditing(target);
  }

  function close() {
    setEditing(null);
    openerRef.current?.focus();
  }

  function save(task: Task) {
    // A hand-off is an assignee change on a task that already existed (4.E).
    const previous = tasks.find((existing) => existing.id === task.id);
    if (previous && previous.assignee !== task.assignee) {
      setToast(`Task handed off to ${task.assignee}.`);
    }

    setTasks((prev) =>
      prev.some((existing) => existing.id === task.id)
        ? prev.map((existing) => (existing.id === task.id ? task : existing))
        : [...prev, task]
    );
    close();
  }

  // REQUIREMENTS 5.G. The clipboard API needs a secure context and can be
  // refused, so the failure path has to say so — a silent no-op on stage would
  // look like the demo worked.
  async function copyContext(task: Task) {
    try {
      await navigator.clipboard.writeText(toPromptContext(task));
      setToast('Context copied. Ready to paste.');
    } catch {
      setToast('Copy blocked by the browser. Open the task to copy by hand.');
    }
  }

  // The one way a task changes column outside the modal — shared by drag-drop
  // and the keyboard grab.
  function moveTask(id: string, status: TaskStatus) {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, status } : task))
    );
  }

  // Where a card renders right now: its stored column, unless it is being
  // carried, in which case it follows the carry without the data changing.
  function statusOf(task: Task): TaskStatus {
    if (grabbed?.id === task.id) return grabbed.target;
    if (drag?.taskId === task.id && drag.over) return drag.over;
    return task.status;
  }

  // The board and its keyboard navigation must agree on what is on screen,
  // or the arrows will walk onto a card the filters have hidden.
  const milestoneName = (task: Task) =>
    milestones.find((milestone) => milestone.id === (task.milestoneId ?? null))?.name ?? '';

  const visibleTasks = tasks.filter(
    (task) =>
      matchesFilters(task, filters, milestoneName(task)) &&
      // Tasks stored before milestones existed read back as undefined.
      (activeMilestone === null || (task.milestoneId ?? null) === activeMilestone)
  );

  function focusCard(id: string) {
    boardRef.current?.querySelector<HTMLElement>(`[data-card-id="${id}"]`)?.focus();
  }

  // Moving a grabbed card re-renders it into a different column, which destroys
  // the focused node — put focus back on it so the grab survives the move.
  useEffect(() => {
    if (grabbed) focusCard(grabbed.id);
  }, [grabbed, tasks]);

  function placeGrabbed(current: { id: string; target: TaskStatus }) {
    moveTask(current.id, current.target);
    setGrabbed(null);
  }

  // Anything that interrupts a carry drops the card where it is sitting rather
  // than leaving it stuck in the air. Only Escape reverts — an interruption is
  // not a decision to undo.
  useEffect(() => {
    if (!grabbed) return;
    const place = () => placeGrabbed(grabbed);
    window.addEventListener('pointerdown', place);
    window.addEventListener('blur', place);
    return () => {
      window.removeEventListener('pointerdown', place);
      window.removeEventListener('blur', place);
    };
  }, [grabbed]);

  // Tap Cmd/Ctrl to jump straight to the board — Tab would take eight presses
  // to get past the header, deliverables and driving strip. Mid-carry the same
  // tap places the card, so the one key both picks up the thread and commits.
  useModifierKey({
    onTap: () => {
      if (grabbed) return placeGrabbed(grabbed);
      if ((document.activeElement as HTMLElement | null)?.dataset.cardId) return; // already there
      const first = STAGES.flatMap((stage) =>
        visibleTasks.filter((task) => task.status === stage.id)
      )[0];
      if (first) focusCard(first.id);
    },
    onHoldChange: setShowShortcuts,
  });

  /**
   * Arrow-key navigation and Space-to-grab, delegated from the board.
   * Enter still opens a task; Space is intercepted so it grabs instead.
   */
  function onBoardKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    const id = (event.target as HTMLElement).dataset.cardId;
    if (id === undefined) return; // focus is on Copy Context, or nothing

    const key = event.key;
    const isArrow =
      key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
    if (!isArrow && key !== ' ' && key !== 'Escape') return;

    const columns = STAGES.map((stage) =>
      visibleTasks.filter((task) => statusOf(task) === stage.id).map((task) => task.id)
    );
    const at = locate(columns, id);
    if (at === null) return;

    if (grabbed?.id === id) {
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        event.preventDefault();
        const next = at.column + (key === 'ArrowRight' ? 1 : -1);
        if (next >= 0 && next < STAGES.length) setGrabbed({ id, target: STAGES[next].id });
        return;
      }
      if (key === ' ') {
        event.preventDefault();
        placeGrabbed(grabbed); // the only write in the whole carry
        setToast(`Placed in ${STAGES[at.column].label}.`);
        return;
      }
      if (key === 'Escape') {
        event.preventDefault();
        setGrabbed(null); // nothing was written, so there is nothing to undo
        setToast('Move cancelled.');
      }
      return;
    }

    if (key === ' ') {
      event.preventDefault(); // otherwise Space opens the task
      setGrabbed({ id, target: STAGES[at.column].id });
      setToast(`Grabbed. ← → to move, Space or ${MODIFIER_LABEL} to place, Esc to cancel.`);
      return;
    }

    if (isArrow) {
      event.preventDefault();
      const next = navigate(columns, id, key);
      if (next) focusCard(next);
    }
  }

  /**
   * Deleting a milestone keeps its tasks — they fall back to unassigned. The
   * confirm says so explicitly, because "delete" next to a list of work reads
   * like it takes the work with it.
   */
  function removeMilestone(id: string) {
    const held = tasks.filter((task) => (task.milestoneId ?? null) === id).length;

    setMilestones((prev) => prev.filter((milestone) => milestone.id !== id));
    setTasks((prev) =>
      prev.map((task) =>
        (task.milestoneId ?? null) === id ? { ...task, milestoneId: null } : task
      )
    );
    if (activeMilestone === id) setActiveMilestone(null); // do not strand the view on a dead tab
    setPendingDelete(null);
    setToast(
      held === 0
        ? 'Milestone deleted.'
        : `Milestone deleted · ${held} task${held === 1 ? '' : 's'} unassigned.`
    );
  }

  /** A deleted tag comes off every task too, so nothing keeps a dead label. */
  function removeTag(tag: string) {
    setAllTags((prev) => prev.filter((existing) => existing !== tag));
    setTasks((prev) =>
      prev.map((task) =>
        task.tags.includes(tag)
          ? { ...task, tags: task.tags.filter((existing) => existing !== tag) }
          : task
      )
    );
  }

  function setAnchorUrl(id: Anchor['id'], url: string | null) {
    setAnchors((prev) =>
      prev.map((anchor) => (anchor.id === id ? { ...anchor, url } : anchor))
    );
    setToast(url === null ? 'Link cleared.' : 'Link saved.');
  }

  function remove(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    close();
  }

  return (
    <div className="min-h-screen bg-surface-page font-sans">
      {/* Background only, no hairline: chrome is a step darker than the content
          area in both themes — pure black in dark, #C2C2C8 in light. */}
      <header className="sticky top-0 z-20 bg-surface-chrome">
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-3">
          {/* A lockup rather than an icon next to text: the badge is sized to
              the full height of the title + tagline block, so their top and
              bottom edges line up. z-10 keeps it above the text, which is what
              lets the text slide out from behind it. */}
          <div className="flex items-center gap-3">
            {/* Badge and mark both invert with the theme on their own: the badge
                is the ink colour, the mark is the chrome colour. Dark badge with
                a light mark in light mode, and the reverse in dark. */}
            <span className="anim-pop relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-text-primary text-surface-chrome">
              <Logo className="h-8 w-8" />
            </span>
            <span aria-hidden="true" className="h-9 w-px shrink-0 bg-line" />
            {/* Clipped, so the slide starts fully hidden behind the badge. */}
            <div className="overflow-hidden py-0.5">
              <div className="anim-slide">
                <h1 className="text-2xl leading-8 text-text-primary">
                  <span className="font-semibold">Vibe</span>
                  <span className="font-normal">Check</span>
                </h1>
                <p className="font-mono text-xs leading-4 text-text-muted">
                  <i>Track Vibes</i>; <b>Ship Value</b>.
                </p>
              </div>
            </div>
          </div>

          {/* Absolutely centred rather than a third flex child, so it sits in
              the middle of the header regardless of how wide the two sides are.
              pointer-events-none so it can never swallow a click. */}
          <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-mono text-xs text-text-muted">
            hold <Kbd>{MODIFIER_LABEL}</Kbd> for shortcuts
          </p>

          <div className="flex items-center gap-3">
            <ThemeToggle
              dark={theme === 'dark'}
              onChange={(dark) => setTheme(dark ? 'dark' : 'light')}
            />
            <button
              type="button"
              onClick={() => setShowTeam(true)}
              title="Team (T)"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Icon name="users" className="h-4 w-4 shrink-0" />
              Team
            </button>
            {/* The hint stacks under the button and still clears the header:
                32px button + 4px gap + 10px text = 46px, inside the 48px the
                logo badge already sets. Plain text, not a <Kbd> — a bordered
                cap is 18px and would push the header taller. */}
            <div className="flex flex-col items-center gap-1">
              <button
                ref={newTaskRef}
                type="button"
                onClick={(event) => open('new', event.currentTarget)}
                title="New task (N)"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-5 py-1.5 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <Icon name="plus" className="h-4 w-4 shrink-0" />
                New Task
              </button>
              <span aria-hidden="true" className="font-mono text-[10px] leading-none text-text-muted">
                press N
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-4">
        <Enter on={entering} delay={0}>
          <AnchorBoard anchors={anchors} onChange={setAnchorUrl} />
        </Enter>

        <Enter on={entering} delay={60}>
          <DrivingStrip
            tasks={tasks}
            team={team}
            onOpenTask={open}
            onNewTask={(assignee, opener) => open('new', opener, { assignee })}
          />
        </Enter>

        <Enter on={entering} delay={120}>
        <section aria-labelledby="board-heading">
          {/* Heading, search and hint share a row rather than stacking. */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
            <h2
              id="board-heading"
              className="text-base font-semibold uppercase text-text-primary"
            >
              Board
            </h2>

            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-card px-3 py-1 text-xs text-text-muted hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              Filter tasks
            </button>

            <button
              type="button"
              onClick={() => setShowTags(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-card px-3 py-1 text-xs text-text-muted hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Icon name="tag" className="h-3.5 w-3.5 shrink-0" />
              Tags
            </button>

            {filters.map((filter, index) => (
              <FilterTag
                key={`${filter.field}-${filter.value}`}
                filter={filter}
                onRemove={() => setFilters((prev) => prev.filter((_, i) => i !== index))}
              />
            ))}

            {filters.length > 0 && (
              <span className="font-mono text-xs text-text-muted">
                {visibleTasks.length}/{tasks.length} shown
              </span>
            )}
            </div>
            <p className="font-mono text-xs leading-loose text-text-muted">
              <Kbd>{MODIFIER_LABEL}</Kbd> board · <Kbd>←</Kbd>
              <Kbd>→</Kbd>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> move · <Kbd>Space</Kbd> grab,{' '}
              <Kbd>Space</Kbd>/<Kbd>{MODIFIER_LABEL}</Kbd> place · <Kbd>Esc</Kbd> cancel ·{' '}
              <Kbd>↵</Kbd> open · <Kbd>M</Kbd> next milestone
            </p>
          </div>

          <MilestoneTabs
            milestones={milestones}
            activeId={activeMilestone}
            onSelect={setActiveMilestone}
            onAdd={(name) => {
              const milestone = { id: crypto.randomUUID(), name };
              setMilestones((prev) => [...prev, milestone]);
              setActiveMilestone(milestone.id); // land on what you just made
            }}
            onDelete={(id) =>
              setPendingDelete(milestones.find((milestone) => milestone.id === id) ?? null)
            }
            onRename={(id, name) =>
              setMilestones((prev) =>
                prev.map((milestone) =>
                  milestone.id === id ? { ...milestone, name } : milestone
                )
              )
            }
          />

          <div
            ref={boardRef}
            onKeyDown={onBoardKeyDown}
            onBlur={(event) => {
              // Tabbing out of the board places the carried card, same as
              // clicking away. relatedTarget is null when the node is merely
              // being re-rendered mid-carry, and that must not count as
              // leaving; the effect above refocuses it.
              const next = event.relatedTarget as Node | null;
              if (grabbed && next && !event.currentTarget.contains(next)) placeGrabbed(grabbed);
            }}
            // Lanes butt together with no gap and no borders: alternating
            // bands, so a lane never reads as a big version of the cards
            // inside it. Rounding lives on the board, not each lane.
            className="grid grid-cols-4 overflow-hidden rounded-b-xl"
          >
            {STAGES.map((stage, index) => {
              const stageTasks = visibleTasks.filter((task) => statusOf(task) === stage.id);
              const headingId = `column-${stage.id}`;
              const isTarget = drag?.over === stage.id || grabbed?.target === stage.id;

              return (
                <section
                  key={stage.id}
                  aria-labelledby={headingId}
                  data-drop-status={stage.id}
                  className={`relative flex min-h-96 min-w-0 flex-col p-3 transition-colors ${
                    isTarget ? 'bg-brand-primary/10' : laneTone(index)
                  }`}
                >
                  {/* A wedge of the previous lane bleeding across the seam:
                      work flows left to right. Apex sits level with the lane
                      title, 48px tall so its base lands exactly where the
                      first card starts. Static tone — it does not follow the
                      drag highlight, so the seam stays readable mid-drag. */}
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
                      className={`pointer-events-none absolute left-0 top-0 h-12 w-3.5 ${laneTone(
                        index - 1
                      )}`}
                    />
                  )}
                  {/* Lanes with a wedge indent their header past it: the apex
                      reaches 14px and the lane's own padding is only 12px, so
                      the title would otherwise start underneath it. */}
                  <div
                    className={`mb-3 flex items-center justify-between gap-2 ${
                      index > 0 ? 'pl-2.5' : ''
                    }`}
                  >
                    <h3
                      id={headingId}
                      className="flex items-center gap-2 text-base font-semibold uppercase text-text-primary"
                    >
                      {stage.label}
                      <span className="rounded-full bg-surface-page px-2 py-0.5 font-mono text-xs font-normal text-text-muted">
                        {stageTasks.length}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={(event) => open('new', event.currentTarget, { status: stage.id })}
                      aria-label={`Add task to ${stage.label}`}
                      className="shrink-0 rounded-full p-1 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                  </div>

                  {stageTasks.length === 0 ? (
                    // The onboarding line only makes sense when the whole board
                    // is empty; a lane that is merely empty is just empty.
                    <p className="rounded-lg border border-dashed border-line p-3 text-sm text-text-muted">
                      {tasks.length === 0
                        ? `You've got no tasks; click "+"/"New Task" to get started!`
                        : 'Nothing here.'}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {stageTasks.map((task, row) => (
                        <li
                          key={task.id}
                          data-flip-id={task.id}
                          data-card-slot={drag?.taskId === task.id ? task.id : undefined}
                          className={
                            drag?.taskId === task.id
                              ? 'rounded-lg bg-brand-primary/5 outline-2 outline-dashed outline-brand-primary/40'
                              : undefined
                          }
                        >
                          {/* Inside the <li>, not on it: useFlip cancels any
                              animation running on a [data-flip-id] element. */}
                          <Enter on={entering} delay={160 + Math.min(row, 6) * 25 + index * 30}>
                          <TaskCard
                            task={task}
                            onOpen={(opener) => open(task, opener)}
                            onCopy={() => copyContext(task)}
                            onPointerDown={bindCard(task.id)}
                            tagColors={tagColors}
                            isDragging={drag?.taskId === task.id}
                            onHighlight={setHighlighted}
                            selection={
                              grabbed?.id === task.id
                                ? 'grabbed'
                                : highlighted === task.id
                                  ? 'highlighted'
                                  : null
                            }
                          />
                          </Enter>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </section>
        </Enter>
      </main>

      {editing !== null && (
        <TaskModal
          task={editing === 'new' ? null : editing}
          team={team}
          milestones={milestones}
          allTags={allTags}
          tagColors={tagColors}
          defaults={newDefaults}
          onSave={save}
          onDelete={remove}
          onClose={close}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name}”?`}
          message={(() => {
            const held = tasks.filter(
              (task) => (task.milestoneId ?? null) === pendingDelete.id
            ).length;
            return held === 0
              ? 'It has no tasks, so nothing else changes.'
              : `Its ${held} task${held === 1 ? '' : 's'} will stay on the board and become unassigned from any milestone.`;
          })()}
          onConfirm={() => removeMilestone(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showTags && (
        <TagsDialog
          tags={allTags}
          usage={tasks.reduce<Record<string, number>>((counts, task) => {
            for (const tag of task.tags) counts[tag] = (counts[tag] ?? 0) + 1;
            return counts;
          }, {})}
          colors={tagColors}
          onAdd={(tag) => setAllTags((prev) => [...prev, tag])}
          onRemove={removeTag}
          onPickColor={(key, colour) =>
            setChosenColors((prev) => {
              const next = { ...prev };
              if (colour === null) delete next[key];
              else next[key] = colour;
              return next;
            })
          }
          onClose={() => setShowTags(false)}
        />
      )}

      {showShortcuts && <ShortcutOverlay />}

      {showSearch && (
        <SearchDialog
          filters={filters}
          onAdd={(field: FilterField, value: string) =>
            setFilters((prev) => addFilter(prev, field, value))
          }
          onRemove={(index) => setFilters((prev) => prev.filter((_, i) => i !== index))}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showTeam && (
        <TeamDialog
          team={team}
          tasks={tasks}
          onChange={setTeam}
          onClose={() => setShowTeam(false)}
        />
      )}

      {/* The card under the cursor. Portalled to body so no column's overflow
          can clip it, and positioned entirely by the spring loop — React never
          re-renders it mid-drag. */}
      {drag &&
        draggedTask &&
        createPortal(
          <div
            ref={overlayRef}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-50 will-change-transform"
            style={{
              width: drag.width,
              transformOrigin: drag.origin,
              transform: drag.initialTransform,
            }}
          >
            <TaskCard
              task={{ ...draggedTask, status: drag.over ?? draggedTask.status }}
              tagColors={tagColors}
              isOverlay
              onOpen={() => {}}
              onCopy={() => {}}
              onHighlight={() => {}}
              selection={null}
            />
          </div>,
          document.body
        )}

      {/* Always mounted: a live region has to exist before its text changes to be
          announced, and keeping it rendered gives the 200 ms fade both ways free. */}
      <div
        role="status"
        aria-live="polite"
        // An inverted surface: both colours flip with the theme, so the toast
        // stays legible. text-white here would be white-on-near-white in dark.
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-text-primary px-4 py-2 text-sm text-surface-card transition-opacity duration-200 ${
          toast ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  );
}
