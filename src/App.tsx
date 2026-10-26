import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// Aliased: the bare name would shadow the DOM KeyboardEvent used by the
// window-level listeners below.
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { carryTo, locate, navigate } from './boardNavigation';
import { DEFAULT_TEAM, SEED_ANCHORS, STAGES, STATUS_DOT } from './constants';
import { SEED_TASKS } from './seedTasks';
import AnchorBoard from './components/AnchorBoard';
import ConfirmDialog from './components/ConfirmDialog';
import DebugFab from './components/DebugFab';
import DrivingStrip from './components/DrivingStrip';
import Icon from './components/Icon';
import Logo from './components/Logo';
import MilestoneTabs from './components/MilestoneTabs';
import TaskCard from './components/TaskCard';
import TagsDialog from './components/TagsDialog';
import TaskModal from './components/TaskModal';
import type { NewTaskDefaults } from './components/TaskModal';
import SearchDialog, { FilterTag } from './components/SearchDialog';
import SprintForm from './components/SprintForm';
import SelectionStack, { stackSpread, STACK_LAYERS } from './components/SelectionStack';
import SprintsRow, { ALL_PILL } from './components/SprintsRow';
import ShortcutOverlay from './components/ShortcutOverlay';
import TeamDialog from './components/TeamDialog';
import ThemeToggle from './components/ThemeToggle';
import VibeMeter from './components/VibeMeter';
import { toPromptContext } from './promptContext';
import { buildDemo } from './demoData';
import { assignColors, resolveTagColors, TAG_INK } from './tagColor';
import {
  orderSprints,
  sprintNumbers,
  sprintsForMilestone,
  taskMilestone,
  UNSCHEDULED,
} from './sprints';
import { addFilter, matchesFilters } from './taskFilter';
import type { Filter, FilterField } from './taskFilter';
import { VIBES } from './vibe';
import type { VibeZone } from './vibe';
import { CHIP_SCALE, useCardDrag } from './useCardDrag';
import type { DropTarget } from './useCardDrag';
import { useFlip } from './useFlip';
import { useLocalStorage } from './useLocalStorage';
import {
  ALT_LABEL,
  isTyping,
  MODIFIER_LABEL,
  useBareKeyTap,
  useModifierKey,
} from './useModifierKey';
import type { Anchor, Milestone, Sprint, Task, TaskStatus, TeamMember } from './types';

/** Breathing room between a carried card and the pill it is aimed at. */
const CHIP_GAP = 6;

/**
 * Where the keyboard cursor points when it has left the cards.
 *
 * The first two are drop targets a card or a pile can land on. A milestone tab
 * is not: only a sprint can be dropped there, which is why this is its own
 * type rather than another DropTarget.
 */
type Aim = DropTarget | { kind: 'milestone'; id: string | null };

/** The rows the cursor walks, bottom to top. */
type Row = Aim['kind'] | 'cards';

/** Where the pile of selected cards rests, inset from the board's corner. */
const STACK_INSET = 12;

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
  // Tasks saved before `tags`, `milestoneId` or `sprintId` existed come back
  // without them. Filled in once here so every consumer can trust the type,
  // rather than each one coalescing defensively and one of them forgetting.
  const [tasks, setTasks] = useLocalStorage<Task[]>('vibetracker.tasks', SEED_TASKS, (stored) =>
    stored.map((task) => ({
      ...task,
      tags: task.tags ?? [],
      milestoneId: task.milestoneId ?? null,
      sprintId: task.sprintId ?? null,
    }))
  );
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // `target` is where the carried card is hovering. Nothing is written to tasks
  // until it is placed, so the Driving strip and localStorage stay still while
  // a card is in the air, and Escape costs nothing to undo.
  const [grabbed, setGrabbed] = useState<{ id: string; target: DropTarget } | null>(null);
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

  const { session: drag, overlayRef, bindCard } = useCardDrag((id, target) =>
    commitDrop([id], target)
  );
  const draggedTask = drag ? tasks.find((task) => task.id === drag.taskId) : undefined;
  useFlip(boardRef);

  // The element that opened the modal, so focus can go back to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  const [anchors, setAnchors] = useLocalStorage<Anchor[]>('vibetracker.anchors', SEED_ANCHORS);
  // Rosters saved before members had a GitHub handle are plain strings. Third
  // shape change today, so it gets a reviver rather than defensive reads.
  const [team, setTeam] = useLocalStorage<TeamMember[]>('vibetracker.team', DEFAULT_TEAM, (stored) =>
    stored.map((member) =>
      typeof member === 'string' ? { name: member as string } : member
    )
  );
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
  const [chosenMemberColors, setChosenMemberColors] = useLocalStorage<Record<string, string>>(
    'vibetracker.memberColors',
    {}
  );
  const [milestones, setMilestones] = useLocalStorage<Milestone[]>(
    'vibetracker.milestones',
    []
  );
  const [sprints, setSprints] = useLocalStorage<Sprint[]>('vibetracker.sprints', []);
  const [chosenSprintColors, setChosenSprintColors] = useLocalStorage<Record<string, string>>(
    'vibetracker.sprintColors',
    {}
  );
  // Same assigner as tags and teammates: automatic by order, overridable.
  const sprintColors = assignColors(
    orderSprints(sprints).map((sprint) => sprint.id),
    chosenSprintColors
  );
  const sprintNos = sprintNumbers(sprints);
  const [pendingSprintDelete, setPendingSprintDelete] = useState<Sprint | null>(null);
  /** A demo board waiting to be confirmed — it replaces everything. */
  const [pendingDemo, setPendingDemo] = useState<VibeZone | null>(null);

  /**
   * Select mode: Space takes and returns cards instead of picking one up.
   *
   * It needs a mode because Space is already the single-card grab and there is
   * no second key to share. `selected` is oldest-first, so the newest — the one
   * on top of the pile — is the last entry.
   */
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  /**
   * Where the cursor is once it leaves the cards, in either mode; null while it
   * is still down among them, where DOM focus is the position.
   */
  const [aim, setAim] = useState<Aim | null>(null);
  /**
   * A pill lifted out of the row, to be filed under a milestone tab or dropped
   * onto tasks. Wrapped rather than a bare id because "No sprint" is one of
   * them — held, it unassigns whatever it is dropped on — and a bare null
   * could not tell that apart from holding nothing.
   *
   * Normal mode, not select mode: moving one sprint is a single-item action,
   * the same kind of thing as carrying one card. Select mode is for groups.
   */
  const [heldSprint, setHeldSprint] = useState<{ id: string | null } | null>(null);
  const [pendingSprintFile, setPendingSprintFile] = useState<{
    sprintId: string;
    milestoneId: string | null;
  } | null>(null);

  // Which tab is open is a view, not data — it resets to All on reload rather
  // than landing you on a near-empty board with no memory of why. Same for the
  // selected sprint.
  const [activeMilestone, setActiveMilestone] = useState<string | null>(null);
  const [activeSprint, setActiveSprint] = useState<string | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | 'new' | null>(null);

  const memberColors = assignColors(
    team.map((member) => member.name),
    chosenMemberColors
  );

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
    setNewDefaults({
      milestoneId: activeMilestone,
      // UNSCHEDULED is a filter sentinel, not a sprint id. Storing it gave the
      // new task a sprint that does not exist, which matched neither the "No
      // sprint" filter nor any real sprint — so the task you had just created
      // vanished from the board you created it on.
      sprintId: activeSprint === UNSCHEDULED ? null : activeSprint,
      ...defaults,
    });
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

  // The one way a task changes outside the modal — shared by drag-drop and the
  // keyboard carry. A lane sets status, a pill sets sprint; nothing else needs
  // to know which input it came from.
  //
  // shortcut: a task holds one sprint, so dropping on a pill moves it out of
  // any sprint it was already in. Revisit when tasks need to carry over.
  function writeDrop(ids: string[], target: DropTarget) {
    setTasks((prev) =>
      prev.map((task) =>
        !ids.includes(task.id)
          ? task
          : target.kind === 'status'
            ? { ...task, status: target.id }
            : { ...task, sprintId: target.id }
      )
    );
  }

  // Where a card renders right now: its stored column, unless it is being
  // carried, in which case it follows the carry without the data changing.
  function statusOf(task: Task): TaskStatus {
    const carrying = grabbed?.id === task.id ? grabbed.target : null;
    const dragging = drag?.taskId === task.id ? drag.over : null;
    // Aiming at a sprint pill leaves the card in its lane — only the pill
    // responds, so the board does not reshuffle for a change of sprint.
    const over = carrying ?? dragging;
    if (over?.kind === 'status') return over.id;
    return task.status;
  }

  // The board and its keyboard navigation must agree on what is on screen,
  // or the arrows will walk onto a card the filters have hidden.
  const milestoneName = (task: Task) =>
    milestones.find((milestone) => milestone.id === taskMilestone(task, sprints))?.name ?? '';

  // Split in two so the sprint pills can be counted. This stage is everything
  // the search and the milestone tab allow, before a sprint selection narrows
  // it further — which makes a pill's count exactly the number of cards you
  // get by clicking it, rather than a total that disagrees with the board.
  const scopedTasks = tasks.filter(
    (task) =>
      matchesFilters(task, filters, milestoneName(task)) &&
      // Tasks stored before milestones existed read back as undefined.
      (activeMilestone === null || taskMilestone(task, sprints) === activeMilestone)
  );

  const visibleTasks = scopedTasks.filter(
    (task) =>
      activeSprint === null ||
      (activeSprint === UNSCHEDULED
        ? (task.sprintId ?? null) === null
        : (task.sprintId ?? null) === activeSprint)
  );

  const sprintCounts = scopedTasks.reduce<Record<string, number>>((counts, task) => {
    if (task.sprintId !== null) counts[task.sprintId] = (counts[task.sprintId] ?? 0) + 1;
    return counts;
  }, {});

  function focusCard(id: string) {
    boardRef.current?.querySelector<HTMLElement>(`[data-card-id="${id}"]`)?.focus();
  }

  // Moving a grabbed card re-renders it into a different column, which destroys
  // the focused node — put focus back on it so the grab survives the move.
  useEffect(() => {
    if (grabbed) focusCard(grabbed.id);
  }, [grabbed, tasks]);

  /**
   * Where the carried card floats while it is aimed at a sprint pill.
   *
   * A keyboard carry has no pointer to follow, so without this the card would
   * sit in its lane while something lit up in a different part of the screen.
   * Putting the card itself over the pill is what makes it read as being
   * carried there. Measured rather than derived: the pill's position depends on
   * how far the strip has scrolled.
   */
  const [carriedTo, setCarriedTo] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    const target = grabbed?.target;
    if (!grabbed || target?.kind !== 'sprint') {
      setCarriedTo(null);
      return;
    }
    // The slot, not `[data-card-id]` — that lives on the title button inside
    // the card, so measuring it sized the chip to the width of the title.
    const card = boardRef.current?.querySelector<HTMLElement>(`[data-flip-id="${grabbed.id}"]`);
    // An empty attribute value is the "No sprint" pill; `[attr=""]` matches it.
    const pill = document.querySelector<HTMLElement>(`[data-drop-sprint="${target.id ?? ''}"]`);
    if (!card || !pill) {
      setCarriedTo(null);
      return;
    }
    // Arrowing onto a pill that has scrolled out of the strip would otherwise
    // float the card off the side of the screen. Instant, so the measurement
    // below sees the settled position.
    pill.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const from = card.getBoundingClientRect();
    const onto = pill.getBoundingClientRect();
    // The unscaled box, placed so its bottom-centre lands CHIP_GAP above the
    // pill's centre. transform-origin: bottom center pins that point, so the
    // gap holds at any scale — including while the card collapses to nothing.
    setCarriedTo({
      left: onto.left + onto.width / 2 - from.width / 2,
      top: onto.top - CHIP_GAP - from.height,
      width: from.width,
    });
  }, [grabbed]);

  /** What the held pill is called — "No sprint" has no number to quote. */
  const heldLabel =
    heldSprint === null
      ? ''
      : heldSprint.id === null
        ? 'No sprint'
        : `Sprint ${sprintNos[heldSprint.id]}`;

  const [heldAt, setHeldAt] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (heldSprint === null) {
      setHeldAt(null);
      return;
    }
    const target =
      aim === null
        ? highlighted
          ? boardRef.current?.querySelector<HTMLElement>(`[data-flip-id="${highlighted}"]`)
          : null
        : document.querySelector<HTMLElement>(
            aim.kind === 'milestone'
              ? `[data-milestone-drop="${aim.id ?? ''}"]`
              : `[data-pill="${aim.id ?? ''}"]`
          );
    if (!target) {
      setHeldAt(null);
      return;
    }
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const box = target.getBoundingClientRect();
    // Bottom-centre of the chip, so one rule covers a card, a pill and a tab.
    setHeldAt({ left: box.left + box.width / 2, top: box.top - CHIP_GAP });
  }, [heldSprint, aim, highlighted, sprints, activeMilestone]);

  const carriedTask = grabbed ? tasks.find((task) => task.id === grabbed.id) : undefined;
  // Only while it is actually floating: aimed at a lane, the card stays put.
  const liftedId = carriedTo && grabbed ? grabbed.id : null;

  /**
   * A sprint drop that would also change the task's milestone, held back until
   * confirmed.
   *
   * Only the board needs this: a drop is instant and committed with no form on
   * screen to show what it did, whereas the modal's milestone field updates in
   * front of you and nothing is written until Save.
   */
  const [pendingSprintMove, setPendingSprintMove] = useState<{
    ids: string[];
    target: DropTarget;
    /** How many of them change milestone, and where the first one goes. */
    moving: number;
    from: string | null;
    to: string | null;
  } | null>(null);

  /**
   * The one drop path, whether one card is in the air or a whole pile.
   *
   * Returns false when it has asked for confirmation instead of writing, so
   * the caller can hold on to its selection until the answer comes back.
   */
  function commitDrop(ids: string[], target: DropTarget): boolean {
    if (target.kind === 'sprint') {
      const moved = ids
        .map((id) => tasks.find((one) => one.id === id))
        .filter((task): task is Task => task !== undefined)
        // Only a task with a milestone of its own has anything to be
        // overridden. One with none is simply gaining a tab, which costs
        // nothing and comes straight back off when the sprint does.
        .filter((task) => task.milestoneId !== null)
        .map((task) => ({
          from: taskMilestone(task, sprints),
          to: taskMilestone({ ...task, sprintId: target.id }, sprints),
        }))
        .filter((change) => change.from !== change.to);

      if (moved.length > 0) {
        returnFocusTo.current = highlighted;
        setPendingSprintMove({
          ids,
          target,
          moving: moved.length,
          from: moved[0].from,
          to: moved[0].to,
        });
        return false;
      }
    }
    writeDrop(ids, target);
    return true;
  }

  /**
   * The filter toggle a pill performs when clicked, so Enter on it matches.
   * `null` is the "No sprint" pill, which filters on UNSCHEDULED.
   */
  function toggleSprintFilter(pill: string | null) {
    // "All" is the cleared state rather than a filter, so it does not toggle.
    if (pill === ALL_PILL) return setActiveSprint(null);
    const want = pill === null ? UNSCHEDULED : pill;
    setActiveSprint((current) => (current === want ? null : want));
  }

  const milestoneTitle = (id: string | null) =>
    id === null ? 'no milestone' : (milestones.find((one) => one.id === id)?.name ?? 'a milestone');

  // Where a dropped copy is collapsing into its pill, and the card it belongs
  // to — held separately from `grabbed` because the carry is over by then.
  /**
   * The card to put focus back on once a confirm closes.
   *
   * A dialog takes focus off the board, which fires the card's onBlur and
   * clears `highlighted` — and that is what the held sprint's chip is measured
   * from, so it disappears and there is nothing left to aim with. The native
   * dialog's own focus restore cannot help: the write usually re-renders or
   * filters away the very element it would return to, so the card is found
   * again by id afterwards instead.
   */
  const returnFocusTo = useRef<string | null>(null);

  useEffect(() => {
    if (pendingSprintMove !== null || pendingSprintFile !== null) return; // still open
    const id = returnFocusTo.current;
    if (id === null) return;
    returnFocusTo.current = null;
    focusCard(id);
    // Gone from the board — a sprint filter may have just hidden it — so land
    // somewhere real rather than leaving focus on the body.
    if (!(document.activeElement as HTMLElement | null)?.dataset.cardId) focusBoard();
    // `tasks` so this runs after the write has re-rendered the board.
  }, [pendingSprintMove, pendingSprintFile, tasks]);

  const [landing, setLanding] = useState<{
    task: Task;
    at: { left: number; top: number; width: number };
  } | null>(null);

  useEffect(() => {
    if (!landing) return;
    const timer = setTimeout(() => setLanding(null), 260); // just past the 240ms animation
    return () => clearTimeout(timer);
  }, [landing]);

  function placeGrabbed(current: { id: string; target: DropTarget }) {
    // Filing into a sprint moves nothing, so there is no travel to animate —
    // the copy collapses into the pill instead, which is what says "it went in
    // there", while the ghost left behind comes back to full strength.
    const task = tasks.find((one) => one.id === current.id);
    if (current.target.kind === 'sprint' && carriedTo && task) {
      setLanding({ task: { ...task, sprintId: current.target.id }, at: carriedTo });
    }
    commitDrop([current.id], current.target);
    setGrabbed(null);
  }

  /**
   * Tasks that would change milestone if `sprintId` were filed under
   * `milestoneId` — the number the confirmation has to quote, since filing a
   * sprint silently re-tabs everything inside it.
   */
  function tasksMovedByFiling(sprintId: string, milestoneId: string | null) {
    return tasks.filter(
      (task) =>
        task.sprintId === sprintId &&
        taskMilestone(task, sprints) !== (milestoneId ?? task.milestoneId ?? null)
    ).length;
  }

  /**
   * Swaps the whole project for a board that reads as `zone`.
   *
   * Every store at once, so nothing is left pointing at an id that went with
   * the old data — a task filed under a milestone that no longer exists would
   * simply vanish from every tab.
   */
  function loadDemo(zone: VibeZone) {
    const demo = buildDemo(zone);
    setTasks(demo.tasks);
    setMilestones(demo.milestones);
    setSprints(demo.sprints);
    setTeam(demo.team);
    setAllTags(demo.tags);
    // Colours are assigned by order, so old overrides would land on new keys.
    setChosenColors({});
    setChosenSprintColors({});
    setChosenMemberColors({});
    // Clear the view too, or the board opens filtered to something gone.
    setActiveMilestone(null);
    setActiveSprint(null);
    setFilters([]);
    setPendingDemo(null);
    setToast(`Demo loaded — should read "${VIBES[zone].label}".`);
  }

  /** The corner badge for a task, or nothing if it is not in a live sprint. */
  function sprintBadge(task: Task) {
    const id = task.sprintId;
    // A task can outlive its sprint, so a dangling id gets no badge.
    if (id === null || sprintNos[id] === undefined) return undefined;
    return {
      label: `S${sprintNos[id]}`,
      name: `Sprint ${sprintNos[id]}`,
      colour: sprintColors[id],
    };
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
    // carriedTo too, so an interrupted carry collapses from where it is sitting
    // rather than from a stale position.
  }, [grabbed, carriedTo]);

  /**
   * A click ends select mode.
   *
   * Nothing is written, so unlike an interrupted carry there is nothing to
   * place — reaching for the mouse just means the keyboard flow is over, and
   * leaving a live mode behind would make the next Space do the wrong thing.
   * Not on blur, though: a selection is worth keeping across a tab away.
   */
  useEffect(() => {
    if (!selectMode) return;
    const leave = () => {
      setSelectMode(false);
      setAim(null);
      setHeldSprint(null);
      if (selected.length > 0) {
        setSelected([]);
        setToast('Selection discarded.');
      }
    };
    window.addEventListener('pointerdown', leave);
    return () => window.removeEventListener('pointerdown', leave);
  }, [selectMode, selected]);

  // Reaching for the mouse ends the sprint carry too — nothing is written
  // until it is dropped, so there is nothing to place, just to let go of.
  useEffect(() => {
    if (heldSprint === null && aim === null) return;
    const leave = () => {
      setHeldSprint(null);
      setAim(null);
    };
    window.addEventListener('pointerdown', leave);
    return () => window.removeEventListener('pointerdown', leave);
  }, [heldSprint, aim]);

  // Tap Cmd/Ctrl to jump straight to the board — Tab would take eight presses
  // to get past the header, deliverables and driving strip. Mid-carry the same
  // tap places the card, so the one key both picks up the thread and commits.
  function focusBoard() {
    if ((document.activeElement as HTMLElement | null)?.dataset.cardId) return; // already there
    const first = STAGES.flatMap((stage) =>
      visibleTasks.filter((task) => task.status === stage.id)
    )[0];
    if (first) return focusCard(first.id);
    // No card to land on, so the board takes focus itself. Keys are delivered
    // through this element either way, and a filter that empties the board
    // must not also take away the Escape that undoes it.
    boardRef.current?.focus();
  }

  /**
   * Keeps something on the board focused while the cursor is up in the rows.
   *
   * Everything above the cards is tracked in state, but the keys still arrive
   * through whatever has DOM focus down here — so an action that removes the
   * focused card strands the cursor with no way to move or escape. Filtering
   * by a sprint does exactly that, and so did a confirm dialog before this.
   */
  useEffect(() => {
    if (aim === null) return;
    const active = document.activeElement as HTMLElement | null;
    if (boardRef.current?.contains(active)) return;
    focusBoard();
  }, [aim, visibleTasks]);

  useModifierKey({
    onTap: () => {
      if (grabbed) return placeGrabbed(grabbed);
      focusBoard();
    },
    onHoldChange: setShowShortcuts,
  });

  /**
   * Option toggles select mode.
   *
   * A different key from the Cmd/Ctrl tap on purpose: that one jumps to the
   * board and places a carried card, both of which still have to work while
   * picking a group.
   */
  useBareKeyTap('Alt', () => {
    const leaving = selectMode;
    setSelectMode(!leaving);
    setSelected([]);
    setAim(null);
    setHeldSprint(null);
    setGrabbed(null); // a single carry and a group selection cannot both be live
    if (!leaving) focusBoard();
    setToast(
      leaving
        ? 'Select mode off.'
        : 'Select mode · Space picks cards · ↑ to the sprints · Space drops · Esc exits'
    );
  });

  /**
   * Where the pile sits: over the pill it is aimed at, or resting at the
   * board's top-left corner while cards are still being picked.
   *
   * Measured off the newest selection, so the pile is the size of a real card
   * on this board rather than a guess, and re-measured when the aim moves
   * because a pill's position depends on how far the strip has scrolled.
   */
  const [stackAt, setStackAt] = useState<{ left: number; top: number; width: number } | null>(
    null
  );

  useEffect(() => {
    const board = boardRef.current;
    if (!selectMode || selected.length === 0 || !board) {
      setStackAt(null);
      return;
    }
    // Newest first, but the newest may have been filtered off the board since
    // it was picked — so take the most recent one still rendered.
    const card = [...selected]
      .reverse()
      .map((id) => board.querySelector<HTMLElement>(`[data-flip-id="${id}"]`))
      .find((found) => found !== null);
    if (!card) {
      setStackAt(null);
      return;
    }
    const from = card.getBoundingClientRect();

    // The pile is positioned by its top card, so its own depth has to come out
    // of the height or the back layers would hang over whatever it is aimed at.
    const height = from.height * CHIP_SCALE + stackSpread(selected.length);

    // Not yet aimed anywhere: ride along with the cursor, just above the
    // focused card's top-left. Above rather than over it, so the card you are
    // about to take stays readable.
    if (aim === null) {
      const cursor = highlighted
        ? board.querySelector<HTMLElement>(`[data-flip-id="${highlighted}"]`)
        : null;
      const box = (cursor ?? board).getBoundingClientRect();
      setStackAt(
        cursor
          ? { left: box.left, top: box.top - CHIP_GAP - height, width: from.width }
          : // Nothing focused, so fall back to the board's own corner.
            { left: box.left + STACK_INSET, top: box.top + STACK_INSET, width: from.width }
      );
      return;
    }

    const onto =
      aim.kind === 'sprint'
        ? document.querySelector<HTMLElement>(`[data-pill="${aim.id ?? ''}"]`)
        : document.querySelector<HTMLElement>(`[data-lane-drop="${aim.id}"]`);
    if (!onto) {
      setStackAt(null);
      return;
    }
    onto.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const target = onto.getBoundingClientRect();
    setStackAt({
      left: target.left + target.width / 2 - (from.width * CHIP_SCALE) / 2,
      // A pill is thin, so the pile sits above it; a lane's drop box has room,
      // so the pile sits inside it where the label would be.
      top:
        aim.kind === 'sprint'
          ? target.top - CHIP_GAP - height
          : target.top + target.height / 2 - height / 2,
      width: from.width,
    });
  }, [selectMode, selected, aim, highlighted, sprints, activeMilestone]);

  // The pills a carried card can be dropped on, left to right, matching what
  // the sprints row is showing. "All" is a filter rather than a sprint, so it
  // is not a target; null is the "No sprint" pill, which is how a card gets
  // taken back out of a sprint without opening the modal.
  const sprintDropTargets: (string | null)[] = [
    null,
    ...sprintsForMilestone(sprints, activeMilestone).map((sprint) => sprint.id),
  ];

  /** What the toast says once a carried card lands. Read before the write. */
  function placedMessage(id: string, target: DropTarget): string {
    if (target.kind === 'status') {
      const stage = STAGES.find((one) => one.id === target.id);
      return `Placed in ${stage?.label ?? 'the board'}.`;
    }
    const held = tasks.find((task) => task.id === id)?.sprintId ?? null;
    if (target.id === null) {
      return held === null ? 'Still not in a sprint.' : 'Taken out of its sprint.';
    }
    const name = `Sprint ${sprintNumbers(sprints)[target.id]}`;
    // One sprint per task, so landing on a pill from another one is a move.
    return held === null || held === target.id ? `Added to ${name}.` : `Moved to ${name}.`;
  }

  /**
   * Arrow-key navigation and Space-to-grab, delegated from the board.
   * Enter still opens a task; Space is intercepted so it grabs instead.
   */
  function onBoardKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    // Undefined when focus is on Copy Context, or on the board itself because
    // nothing is left to focus. That is only workable with the cursor up in
    // the rows, where the position is state rather than DOM focus.
    const id = (event.target as HTMLElement).dataset.cardId;
    if (id === undefined && aim === null) return;

    const key = event.key;
    const isArrow =
      key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
    // Enter is only ours once the cursor has left the cards. Down among them
    // it belongs to the card's own title button, which opens the task — and
    // because focus stays on that button while the cursor is up in the rows,
    // letting it through from there opened a task you were not even pointing at.
    // Enter is ours whenever the cursor has left the cards *or* something is
    // in hand. The second half was missing: a carried card is tracked in
    // `grabbed`, not `aim`, so mid-carry Enter fell through to the card's own
    // title button and opened the task it was busy moving.
    const mine =
      isArrow ||
      key === ' ' ||
      key === 'Escape' ||
      (key === 'Enter' && (aim !== null || grabbed !== null));
    if (!mine) return;

    const columns = STAGES.map((stage) =>
      visibleTasks.filter((task) => statusOf(task) === stage.id).map((task) => task.id)
    );
    const at = id === undefined ? null : locate(columns, id);
    if (at === null && aim === null) return;
    /** The lane the cursor came from; the first one if it never had a card. */
    const lane = at?.column ?? 0;

    // Select mode. Two zones, same shape as the single-card carry: on the
    // board the arrows move focus and Space takes or returns a card, in the
    // strip the arrows walk the pills and Space drops everything held.
    // The rows the cursor walks once it leaves the cards, bottom to top.
    // Which are open depends on what is in hand: a lane's drop box does
    // nothing for a held sprint, a milestone tab does nothing for a pile of
    // tasks, and select mode has no business with either unless it is holding
    // something.
    const ladder: Row[] = selectMode
      ? ['cards', ...(selected.length > 0 ? (['status', 'sprint'] as Row[]) : [])]
      : ['cards', 'sprint', ...(heldSprint?.id != null ? (['milestone'] as Row[]) : [])];

    // "All" joins the sprints row only while nothing is being carried: it is
    // a filter, not a place anything can be dropped.
    const browsing = !selectMode && heldSprint === null;
    const cells = (row: Row): (string | null)[] =>
      row === 'status'
        ? STAGES.map((stage) => stage.id)
        : row === 'sprint'
          ? browsing
            ? [ALL_PILL, ...sprintDropTargets]
            : [...sprintDropTargets]
          : [null, ...milestones.map((milestone) => milestone.id)];

    /** Where in a row the cursor lands on arriving, by what is in hand. */
    const entry = (row: Row): string | null => {
      if (row === 'status') return STAGES[lane].id;
      if (row === 'milestone') return activeMilestone;
      const want =
        heldSprint?.id ??
        (selected.length > 0
          ? (tasks.find((task) => task.id === selected[selected.length - 1])?.sprintId ?? null)
          : activeSprint === UNSCHEDULED
            ? null
            : // No sprint filter is the "All" pill, which only exists while
              // browsing; carrying something lands on the first real cell.
              (activeSprint ?? (browsing ? ALL_PILL : null)));
      const pills = cells('sprint');
      return pills[Math.max(pills.indexOf(want), 0)];
    };

    /** Moves the cursor. Returns false if the key was not one it uses. */
    const step = (): boolean => {
      // Narrowed here rather than relying on the guard above, so `key` is an
      // ArrowKey for navigate().
      if (!isArrow) return false;
      if (aim !== null) {
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          const row = cells(aim.kind);
          const next = row.indexOf(aim.id) + (key === 'ArrowRight' ? 1 : -1);
          if (next >= 0 && next < row.length) setAim({ kind: aim.kind, id: row[next] } as Aim);
          return true;
        }
        // Neither end wraps, so holding an arrow parks the cursor at a row.
        const to = ladder[ladder.indexOf(aim.kind) + (key === 'ArrowUp' ? 1 : -1)];
        if (to !== undefined) setAim(to === 'cards' ? null : ({ kind: to, id: entry(to) } as Aim));
        return true;
      }
      const moved = id === undefined ? null : navigate(columns, id, key);
      if (moved) {
        focusCard(moved);
        return true;
      }
      // Nothing above to move to, so Up leaves the cards for the first row the
      // ladder offers — the lane boxes with a pile, the sprint pills otherwise.
      if (key === 'ArrowUp') {
        const to = ladder[1];
        if (to !== undefined && to !== 'cards') {
          setAim({ kind: to, id: entry(to) } as Aim);
          return true;
        }
      }
      return false;
    };

    // Select mode: Space takes and returns cards, and the pile is what moves.
    if (selectMode) {
      event.preventDefault();

      if (key === 'Escape') {
        // Two stages: back out of the upper rows first, keeping the selection.
        // A stray Escape should not cost a pile of a dozen cards.
        if (aim !== null) {
          setAim(null);
          return;
        }
        setSelectMode(false);
        setSelected([]);
        setToast(selected.length > 0 ? 'Selection discarded.' : 'Select mode off.');
        return;
      }

      // Enter commits, same as Space. It is only ours with the cursor off the
      // cards, so the toggle arm below only ever sees Space.
      if (key === ' ' || key === 'Enter') {
        if (aim === null) {
          if (id === undefined) return;
          setSelected((prev) =>
            prev.includes(id) ? prev.filter((one) => one !== id) : [...prev, id]
          );
          return;
        }
        // The milestone check is a type guard, not a live case: select mode's
        // ladder has no tabs row, and entering the mode clears the aim.
        if (selected.length === 0 || aim.kind === 'milestone') return;
        const count = `${selected.length} task${selected.length === 1 ? '' : 's'}`;
        const where =
          aim.kind === 'status'
            ? `moved to ${STAGES.find((stage) => stage.id === aim.id)?.label}`
            : aim.id === null
              ? 'taken out of their sprint'
              : `added to Sprint ${sprintNos[aim.id]}`;
        // Only clear once it is actually written — a pending confirmation can
        // still be cancelled, and the pile has to survive that.
        if (commitDrop(selected, aim)) {
          setSelected([]);
          setAim(null);
          setToast(`${count} ${where}.`);
        }
        return;
      }

      step();
      return;
    }

    // Both narrowed: with no card focused `id` is undefined, and `grabbed?.id`
    // is too when nothing is held — so the loose form matched an empty carry.
    if (id !== undefined && grabbed !== null && grabbed.id === id) {
      const target = grabbed.target;

      if (key === 'Escape') {
        event.preventDefault();
        setGrabbed(null); // nothing was written, so there is nothing to undo
        setToast('Move cancelled.');
        return;
      }
      if (key === ' ' || key === 'Enter') {
        event.preventDefault();
        const message = placedMessage(id, target); // reads the pre-move sprint
        placeGrabbed(grabbed); // the only write in the whole carry
        setToast(message);
        return;
      }

      if (!isArrow) return; // everything else mid-carry is already handled

      event.preventDefault(); // every arrow belongs to the carry
      // Up out of the lanes and into the sprints row: the keyboard twin of
      // dragging a card up to the strip.
      const next = carryTo(target, key, {
        lanes: STAGES.map((stage) => stage.id),
        strip: sprintDropTargets,
        lane,
        held: tasks.find((task) => task.id === id)?.sprintId ?? null,
      });
      if (next) setGrabbed({ id, target: next });
      return;
    }

    // The cursor has left the cards, or a sprint is in hand. Moving one sprint
    // is a single-item action, the same kind of thing as carrying one card —
    // which is why it lives out here and not in select mode.
    if (aim !== null || heldSprint !== null) {
      event.preventDefault();

      // Empty hands: Enter activates whatever the cursor is on, which for a
      // pill means its filter. A milestone tab is left alone — switching the
      // board there would move the rows out from under a carried sprint.
      if (key === 'Enter' && heldSprint === null) {
        if (aim?.kind === 'sprint') toggleSprintFilter(aim.id);
        return;
      }

      if (key === 'Escape') {
        // Same two stages as the pile: step back down before letting go.
        if (aim !== null) return setAim(null);
        setHeldSprint(null);
        setToast('Sprint put back.');
        return;
      }

      // Holding something, Enter commits alongside Space.
      if (key === ' ' || key === 'Enter') {
        if (heldSprint === null) {
          // On a pill with empty hands, Space lifts the sprint out of the row.
          // "No sprint" is a filter rather than a sprint, so nothing to take.
          // "All" is not a sprint, so there is nothing on it to pick up.
          if (aim?.kind === 'sprint' && aim.id !== ALL_PILL) {
            setHeldSprint({ id: aim.id });
            setToast(
              aim.id === null
                ? 'Holding No sprint. ↓ to a task to take it out of its sprint, Esc to put it back.'
                : `Holding Sprint ${sprintNos[aim.id]}. ↑ to a milestone, ↓ to a task, Esc to put it back.`
            );
          }
          return;
        }
        if (aim === null) {
          if (id === undefined) return; // no card under the cursor to file
          // Back down among the cards: the focused task joins the sprint, and
          // the sprint stays in hand so a run of cards can be filed one after
          // another. Only the milestone tabs consume it, because a sprint has
          // just the one milestone to be filed under.
          const task = tasks.find((one) => one.id === id);
          if ((task?.sprintId ?? null) === heldSprint.id) {
            setToast(
              heldSprint.id === null ? 'Not in a sprint anyway.' : `Already in ${heldLabel}.`
            );
            return;
          }
          if (commitDrop([id], { kind: 'sprint', id: heldSprint.id })) {
            setToast(
              heldSprint.id === null
                ? 'Taken out of its sprint · still holding No sprint.'
                : `Added to ${heldLabel} · still holding it.`
            );
          }
          return;
        }
        if (aim.kind === 'milestone') {
          // Only a real sprint can be filed; the ladder keeps the eraser away
          // from this row, so this is a guard rather than a live case.
          if (heldSprint.id === null) return;
          returnFocusTo.current = highlighted;
          setPendingSprintFile({ sprintId: heldSprint.id, milestoneId: aim.id });
          return;
        }
        // Back onto its own pill puts it down; nothing else accepts a sprint.
        if (aim.kind === 'sprint' && aim.id === heldSprint.id) setHeldSprint(null);
        return;
      }

      step();
      return;
    }

    if (key === ' ') {
      if (id === undefined) return;
      event.preventDefault(); // otherwise Space opens the task
      setGrabbed({ id, target: { kind: 'status', id: STAGES[lane].id } });
      setToast(`Grabbed. ← → lane, ↑ sprint, Space or ${MODIFIER_LABEL} to place, Esc to cancel.`);
      return;
    }

    if (isArrow) {
      event.preventDefault();
      step();
    }
  }

  /**
   * Deleting a milestone keeps its tasks — they fall back to unassigned. The
   * confirm says so explicitly, because "delete" next to a list of work reads
   * like it takes the work with it.
   */
  /**
   * What a milestone holds, for the delete confirm and its toast — which used
   * to count this separately and could disagree.
   *
   * Tasks are counted on the derived milestone, so a task filed here only
   * through its sprint is included: it leaves this tab too.
   */
  function milestoneHolds(id: string) {
    return {
      tasks: tasks.filter((task) => taskMilestone(task, sprints) === id).length,
      sprints: sprints.filter((sprint) => sprint.milestoneId === id).length,
    };
  }

  function removeMilestone(id: string) {
    const held = milestoneHolds(id);

    setMilestones((prev) => prev.filter((milestone) => milestone.id !== id));
    setTasks((prev) =>
      prev.map((task) =>
        (task.milestoneId ?? null) === id ? { ...task, milestoneId: null } : task
      )
    );
    // Sprints filed here would otherwise keep pointing at a milestone that no
    // longer exists. Unfiling them also lets any task that sat under this tab
    // through its sprint fall back to its own milestone.
    setSprints((prev) =>
      prev.map((sprint) => (sprint.milestoneId === id ? { ...sprint, milestoneId: null } : sprint))
    );
    if (activeMilestone === id) setActiveMilestone(null); // do not strand the view on a dead tab
    setPendingDelete(null);

    const freed = [
      held.tasks && `${held.tasks} task${held.tasks === 1 ? '' : 's'} unassigned`,
      held.sprints && `${held.sprints} sprint${held.sprints === 1 ? '' : 's'} unfiled`,
    ].filter(Boolean);
    setToast(
      freed.length === 0 ? 'Milestone deleted.' : `Milestone deleted · ${freed.join(' · ')}.`
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
                  <span className="font-normal">Checkr</span>
                </h1>
                <p className="font-mono text-xs leading-4 text-text-muted">
                  <i>Track Vibes</i>; <b>Ship Value</b>.
                </p>
              </div>
            </div>
          </div>

          {/* Absolutely centred rather than a third flex child, so it sits in
              the middle of the header regardless of how wide the two sides are,
              and so a second line costs the header no height. Centred on both
              axes now that there are two. pointer-events-none so it can never
              swallow a click — the vibe chip opts back in for its tooltip. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
            <VibeMeter tasks={tasks} />
            <p className="font-mono text-xs text-text-muted">
              hold <Kbd>{MODIFIER_LABEL}</Kbd> for shortcuts
            </p>
          </div>

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
            memberColors={memberColors}
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
              <Kbd>↓</Kbd> move · <Kbd>Space</Kbd> grab, <Kbd>↑</Kbd> to a sprint,{' '}
              <Kbd>Space</Kbd>/<Kbd>{MODIFIER_LABEL}</Kbd> place · <Kbd>Esc</Kbd> cancel ·{' '}
              <Kbd>↵</Kbd> open · <Kbd>{ALT_LABEL}</Kbd> select many · <Kbd>M</Kbd> next milestone
            </p>
          </div>

          <MilestoneTabs
            milestones={milestones}
            activeId={activeMilestone}
            aimedId={aim?.kind === 'milestone' ? aim.id : undefined}
            onSelect={(id) => {
              setActiveMilestone(id);
              // Do not leave the board filtered by a sprint this tab hides.
              // Asks sprintsForMilestone rather than repeating its rule, which
              // is how this drifted out of step with it before. "No sprint" is
              // a fixed pill on every tab, so that selection always survives.
              const stillShown =
                activeSprint === null ||
                activeSprint === UNSCHEDULED ||
                sprintsForMilestone(sprints, id).some((sprint) => sprint.id === activeSprint);
              if (!stillShown) setActiveSprint(null);
            }}
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

          {/* The rounding and clipping move out to a wrapper so the sprints
              row sits inside the board's shape rather than above it. Top-left
              stays square so the active milestone tab can meet it flush. */}
          <div className="overflow-hidden rounded-b-xl rounded-tr-xl">
            {/* Sprints: a full-width band across the top of the board. Shares
                the lighter lane tone so it reads as part of the board, with a
                page-coloured hairline as the only thing dividing it from the
                lane headers below. */}
            <SprintsRow
              sprints={sprints}
              milestones={milestones}
              activeMilestone={activeMilestone}
              activeSprint={activeSprint}
              onToggle={toggleSprintFilter}
              colors={sprintColors}
              counts={sprintCounts}
              dark={theme === 'dark'}
              dropTarget={
                grabbed?.target ??
                drag?.over ??
                (aim?.kind === 'sprint' ? aim : null)
              }
              heldId={heldSprint?.id}
              onAdd={() => setEditingSprint('new')}
              onEdit={setEditingSprint}
              onDelete={setPendingSprintDelete}
            />

            <div
              ref={boardRef}
              // Focusable so it can hold the keyboard when no card can; -1
              // keeps it out of the Tab order, and it never shows a ring —
              // the cursor is drawn on whatever row it is actually on.
              tabIndex={-1}
              onKeyDown={onBoardKeyDown}
              onBlur={(event) => {
                // Tabbing out of the board places the carried card, same as
                // clicking away. relatedTarget is null when the node is merely
                // being re-rendered mid-carry, and that must not count as
                // leaving; the effect above refocuses it.
                const next = event.relatedTarget as Node | null;
                if (grabbed && next && !event.currentTarget.contains(next)) {
                  placeGrabbed(grabbed);
                }
              }}
              // Lanes butt together with no gap and no borders: alternating
              // bands, so a lane never reads as a big version of the cards
              // inside it.
              className="grid grid-cols-4 focus:outline-none"
            >
            {STAGES.map((stage, index) => {
              const stageTasks = visibleTasks.filter((task) => statusOf(task) === stage.id);
              const headingId = `column-${stage.id}`;
              const over = grabbed?.target ?? drag?.over;
              const isTarget = over?.kind === 'status' && over.id === stage.id;

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
                      {/* The key: this dot is the same one the team chips and
                          their task pills use. */}
                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[stage.id]}`}
                      />
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

                  {/* Only in select mode, and for every lane at once, so the
                      cards shift by the same amount in all four rather than
                      one lane jumping when a pile happens to point at it. The
                      pile parks inside this box, so its label steps aside. */}
                  {selectMode && (
                    <div
                      data-lane-drop={stage.id}
                      // border-text-muted, not border-line: `line` is sized for
                      // a card on the card surface and comes out at 1.01:1 on
                      // the odd lanes, which is no border at all. The muted ink
                      // is monochrome and clears 3:1 on every lane in both
                      // themes, so a hairline is enough to read.
                      className={`mb-2.5 flex h-16 items-center justify-center rounded-lg border border-dashed text-sm transition-colors ${
                        aim?.kind === 'status' && aim.id === stage.id
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                          : 'border-text-muted text-text-muted'
                      }`}
                    >
                      {aim?.kind === 'status' && aim.id === stage.id
                        ? ''
                        : selected.length > 0
                          ? `Move ${selected.length} here`
                          : 'Move here'}
                    </div>
                  )}

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
                            sprint={sprintBadge(task)}
                            lifted={
                              drag?.taskId === task.id
                                ? 'moving'
                                : liftedId === task.id || selected.includes(task.id)
                                  ? 'filing'
                                  : landing?.task.id === task.id
                                    ? 'landing'
                                    : undefined
                            }
                            onHighlight={setHighlighted}
                            selection={
                              grabbed?.id === task.id
                                ? 'grabbed'
                                : // Focus stays on the card while the cursor
                                  // is up in the rows above, but the ring
                                  // should not — two dashed markers at once
                                  // is exactly the confusion.
                                  aim === null && highlighted === task.id
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
          </div>
        </section>
        </Enter>
      </main>

      {editing !== null && (
        <TaskModal
          task={editing === 'new' ? null : editing}
          team={team}
          milestones={milestones}
          sprints={sprints}
          allTags={allTags}
          tagColors={tagColors}
          defaults={newDefaults}
          onSave={save}
          onDelete={remove}
          onClose={close}
        />
      )}

      <DebugFab onPick={setPendingDemo} />

      {pendingDemo && (
        <ConfirmDialog
          title="Replace everything with demo data?"
          confirmLabel="Replace"
          message={`The board, milestones, sprints, team and tags are all thrown away and rebuilt to read as "${VIBES[pendingDemo].label}". This cannot be undone.`}
          onConfirm={() => loadDemo(pendingDemo)}
          onCancel={() => setPendingDemo(null)}
        />
      )}

      {pendingSprintMove && (
        <ConfirmDialog
          title="Change this task's milestone?"
          confirmLabel="Change"
          message={(() => {
            const { target, from, to, moving } = pendingSprintMove;
            // One card can name where it came from; a pile cannot, since they
            // may be coming from different milestones.
            const subject = moving === 1 ? 'this task' : `${moving} of these tasks`;
            const where =
              moving === 1 ? ` from ${milestoneTitle(from)} to ${milestoneTitle(to)}` : '';
            if (target.kind === 'sprint' && target.id === null) {
              return `Taking ${subject} out of its sprint moves it${where || ` to ${milestoneTitle(to)}`}, back to the milestone set on the task itself.`;
            }
            return `Sprint ${sprintNos[target.id as string]} is filed under ${milestoneTitle(
              to
            )}, so ${subject} ${moving === 1 ? 'moves' : 'move'}${where || ` to ${milestoneTitle(to)}`}. The milestone saved on each task is kept, and comes back if you take it out of the sprint.`;
          })()}
          onConfirm={() => {
            writeDrop(pendingSprintMove.ids, pendingSprintMove.target);
            setPendingSprintMove(null);
            setSelected([]); // no-ops for a single carried card
            setAim(null);
          }}
          onCancel={() => setPendingSprintMove(null)}
        />
      )}

      {pendingSprintDelete && (
        <ConfirmDialog
          title={`Delete Sprint ${orderSprints(sprints).findIndex((sprint) => sprint.id === pendingSprintDelete.id) + 1}?`}
          message={(() => {
            const held = tasks.filter(
              (task) => task.sprintId === pendingSprintDelete.id
            ).length;
            return held === 0
              ? 'It has no tasks, so nothing else changes. The sprints after it will renumber.'
              : `Its ${held} task${held === 1 ? '' : 's'} will stay on the board and become unscheduled. The sprints after it will renumber.`;
          })()}
          onConfirm={() => {
            const id = pendingSprintDelete.id;
            setSprints((prev) => prev.filter((sprint) => sprint.id !== id));
            // Tasks survive; they just stop being scheduled.
            setTasks((prev) =>
              prev.map((task) => (task.sprintId === id ? { ...task, sprintId: null } : task))
            );
            if (activeSprint === id) setActiveSprint(null);
            setPendingSprintDelete(null);
            setToast('Sprint deleted.');
          }}
          onCancel={() => setPendingSprintDelete(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name}”?`}
          message={(() => {
            const held = milestoneHolds(pendingDelete.id);
            if (held.tasks === 0 && held.sprints === 0) {
              return 'It holds nothing, so nothing else changes.';
            }
            const parts = [
              held.tasks > 0 &&
                `its ${held.tasks} task${held.tasks === 1 ? '' : 's'} will stay on the board and become unassigned from any milestone`,
              held.sprints > 0 &&
                `its ${held.sprints} sprint${held.sprints === 1 ? '' : 's'} will stay, filed under no milestone`,
            ].filter(Boolean);
            return `Nothing is deleted with it — ${parts.join(', and ')}.`;
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

      {editingSprint !== null && (
        <SprintForm
          sprint={editingSprint === 'new' ? null : editingSprint}
          milestones={milestones}
          defaultMilestoneId={activeMilestone}
          onSave={(sprint) => {
            setSprints((prev) =>
              prev.some((existing) => existing.id === sprint.id)
                ? prev.map((existing) => (existing.id === sprint.id ? sprint : existing))
                : [...prev, sprint]
            );
            setEditingSprint(null);
          }}
          colour={
            editingSprint === 'new' ? undefined : sprintColors[editingSprint.id]
          }
          onPickColor={(id, picked) =>
            setChosenSprintColors((prev) => {
              const next = { ...prev };
              if (picked === null) delete next[id];
              else next[id] = picked;
              return next;
            })
          }
          onClose={() => setEditingSprint(null)}
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
          colors={memberColors}
          onPickColor={(name, colour) =>
            setChosenMemberColors((prev) => {
              const next = { ...prev };
              if (colour === null) delete next[name];
              else next[name] = colour;
              return next;
            })
          }
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
              task={{ ...draggedTask, status: statusOf(draggedTask) }}
              sprint={sprintBadge(
                drag.over?.kind === 'sprint'
                  ? { ...draggedTask, sprintId: drag.over.id }
                  : draggedTask
              )}
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

      {/* The carried card once it is aimed at a sprint pill. A pointer drag has
          its own overlay under the cursor; a keyboard carry has nothing to
          follow, so the card parks above the pill and slides between pills as
          the arrows walk the strip — the card is the thing being moved, and
          the pill's border only confirms which one. */}
      {carriedTo &&
        carriedTask &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 transition-all duration-200 ease-out"
            style={{
              left: carriedTo.left,
              top: carriedTo.top,
              width: carriedTo.width,
              transform: `scale(${CHIP_SCALE})`,
              transformOrigin: 'bottom center',
            }}
          >
            <TaskCard
              task={carriedTask}
              // Previews the result: the badge shows the pill being aimed at.
              sprint={sprintBadge(
                grabbed?.target.kind === 'sprint'
                  ? { ...carriedTask, sprintId: grabbed.target.id }
                  : carriedTask
              )}
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

      {/* A sprint in hand. Its own pill carries an edit button and a divider
          that mean nothing in flight, so this is a plain copy of the label at
          full size — a pill is small enough not to need shrinking. */}
      {heldSprint !== null &&
        heldAt &&
        createPortal(
          <span
            aria-hidden="true"
            style={{
              left: heldAt.left,
              top: heldAt.top,
              backgroundColor:
                heldSprint.id === null ? 'rgb(var(--text-primary))' : sprintColors[heldSprint.id],
              color: heldSprint.id === null ? 'rgb(var(--surface-card))' : TAG_INK,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-none fixed z-50 flex h-6 items-center rounded-full px-2.5 text-xs shadow-lg transition-all duration-200 ease-out"
          >
            {heldLabel}
          </span>,
          document.body
        )}

      {pendingSprintFile && (
        <ConfirmDialog
          title={
            pendingSprintFile.milestoneId === null
              ? 'Unfile this sprint?'
              : 'File this sprint here?'
          }
          confirmLabel={pendingSprintFile.milestoneId === null ? 'Unfile' : 'File'}
          message={(() => {
            const { sprintId, milestoneId } = pendingSprintFile;
            const moved = tasksMovedByFiling(sprintId, milestoneId);
            const name = `Sprint ${sprintNos[sprintId]}`;
            const tasksPart =
              moved === 0
                ? 'No task changes milestone.'
                : milestoneId === null
                  ? `Its ${moved} task${moved === 1 ? '' : 's'} fall back to the milestone saved on each one.`
                  : `Its ${moved} task${moved === 1 ? '' : 's'} move to ${milestoneTitle(
                      milestoneId
                    )} with it — the milestone saved on each task is kept, and comes back if the sprint is unfiled.`;
            return milestoneId === null
              ? `${name} stops being filed under a milestone, so it will only show under All. ${tasksPart}`
              : `${name} moves to ${milestoneTitle(milestoneId)}. ${tasksPart}`;
          })()}
          onConfirm={() => {
            const { sprintId, milestoneId } = pendingSprintFile;
            setSprints((prev) =>
              prev.map((sprint) => (sprint.id === sprintId ? { ...sprint, milestoneId } : sprint))
            );
            setPendingSprintFile(null);
            setHeldSprint(null);
            setAim(null);
            setToast(
              milestoneId === null
                ? `Sprint ${sprintNos[sprintId]} unfiled.`
                : `Sprint ${sprintNos[sprintId]} filed under ${milestoneTitle(milestoneId)}.`
            );
          }}
          onCancel={() => setPendingSprintFile(null)}
        />
      )}

      {/* The cards held in select mode. Rests at the board's corner while you
          pick, then slides over whichever pill the arrows aim at. */}
      {stackAt &&
        createPortal(
          <SelectionStack
            held={[...selected]
              .reverse()
              .slice(0, STACK_LAYERS)
              .map((id) => tasks.find((task) => task.id === id))
              .filter((task): task is Task => task !== undefined)}
            total={selected.length}
            at={stackAt}
            tagColors={tagColors}
            sprintOf={(task) =>
              sprintBadge(
                aim === null ? task : { ...task, sprintId: aim.id }
              )
            }
          />,
          document.body
        )}

      {/* The dropped copy, collapsing into the pill it landed on. Same box and
          origin as the carried chip above, so it starts exactly where that one
          stopped and shrinks to nothing at the pill. */}
      {landing &&
        createPortal(
          <div
            aria-hidden="true"
            className="anim-drop-into-pill pointer-events-none fixed z-50"
            style={
              {
                left: landing.at.left,
                top: landing.at.top,
                width: landing.at.width,
                transformOrigin: 'bottom center',
                // The animation overrides this while it runs. It is here for
                // reduced motion, where the keyframes are off and the copy
                // would otherwise flash at full size before unmounting.
                transform: `scale(${CHIP_SCALE})`,
                '--chip-scale': CHIP_SCALE,
              } as React.CSSProperties
            }
          >
            <TaskCard
              task={landing.task}
              sprint={sprintBadge(landing.task)}
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
