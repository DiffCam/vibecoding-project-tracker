import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { locate, navigate } from './boardNavigation';
import { DEFAULT_TEAM, SEED_ANCHORS, STAGES } from './constants';
import { SEED_TASKS } from './seedTasks';
import AnchorBoard from './components/AnchorBoard';
import DrivingStrip from './components/DrivingStrip';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import TeamDialog from './components/TeamDialog';
import ThemeToggle from './components/ThemeToggle';
import { toPromptContext } from './promptContext';
import { useLocalStorage } from './useLocalStorage';
import { MODIFIER_LABEL, useModifierTap } from './useModifierTap';
import type { Anchor, Task, TaskStatus } from './types';

export default function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('vibetracker.tasks', SEED_TASKS);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<TaskStatus | null>(null);
  // `target` is where the carried card is hovering. Nothing is written to tasks
  // until it is placed, so the Driving strip and localStorage stay still while
  // a card is in the air, and Escape costs nothing to undo.
  const [grabbed, setGrabbed] = useState<{ id: string; target: TaskStatus } | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [showTeam, setShowTeam] = useState(false);
  const boardRef = useRef<HTMLElement>(null);

  // The element that opened the modal, so focus can go back to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  const [anchors, setAnchors] = useLocalStorage<Anchor[]>('vibetracker.anchors', SEED_ANCHORS);
  const [team, setTeam] = useLocalStorage<string[]>('vibetracker.team', DEFAULT_TEAM);

  // First visit follows the OS; after that the stored choice wins.
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(
    'vibetracker.theme',
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  function open(target: Task | 'new', opener: HTMLElement) {
    openerRef.current = opener;
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
    return grabbed?.id === task.id ? grabbed.target : task.status;
  }

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
  useModifierTap(() => {
    if (grabbed) return placeGrabbed(grabbed);
    if ((document.activeElement as HTMLElement | null)?.dataset.cardId) return; // already there
    const first = STAGES.flatMap((stage) => tasks.filter((task) => task.status === stage.id))[0];
    if (first) focusCard(first.id);
  });

  /**
   * Arrow-key navigation and Space-to-grab, delegated from the board.
   * Enter still opens a task; Space is intercepted so it grabs instead.
   */
  function onBoardKeyDown(event: KeyboardEvent<HTMLElement>) {
    const id = (event.target as HTMLElement).dataset.cardId;
    if (id === undefined) return; // focus is on Copy Context, or nothing

    const key = event.key;
    const isArrow =
      key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
    if (!isArrow && key !== ' ' && key !== 'Escape') return;

    const columns = STAGES.map((stage) =>
      tasks.filter((task) => statusOf(task) === stage.id).map((task) => task.id)
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

  function setAnchorUrl(id: Anchor['id'], url: string) {
    setAnchors((prev) =>
      prev.map((anchor) => (anchor.id === id ? { ...anchor, url: url || null } : anchor))
    );
  }

  function remove(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    close();
  }

  return (
    <div className="min-h-screen bg-surface-page p-6 font-sans">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl text-text-primary">
            <span className="font-semibold">Vibe</span>
            <span className="font-normal">Check</span>
          </h1>
          <p className="text-sm text-text-muted">DiffCam · Developer Development</p>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle
            dark={theme === 'dark'}
            onChange={(dark) => setTheme(dark ? 'dark' : 'light')}
          />
          <button
            type="button"
            onClick={() => setShowTeam(true)}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-text-primary hover:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Team
          </button>
          <button
            type="button"
            onClick={(event) => open('new', event.currentTarget)}
            className="rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            New Task
          </button>
        </div>
      </header>

      <AnchorBoard anchors={anchors} onChange={setAnchorUrl} />

      <DrivingStrip tasks={tasks} team={team} />

      <p className="mb-2 text-xs text-text-muted">
        Tap <kbd className="font-mono">{MODIFIER_LABEL}</kbd> to jump to the board · ← → ↑ ↓ to
        move around · Space to grab and carry between columns, Space or{' '}
        <kbd className="font-mono">{MODIFIER_LABEL}</kbd> to place, Esc to cancel · Enter to open
      </p>

      <main
        ref={boardRef}
        onKeyDown={onBoardKeyDown}
        onBlur={(event) => {
          // Tabbing out of the board places the carried card, same as clicking
          // away. relatedTarget is null when the node is merely being
          // re-rendered mid-carry, and that must not count as leaving; the
          // effect above refocuses it.
          const next = event.relatedTarget as Node | null;
          if (grabbed && next && !event.currentTarget.contains(next)) placeGrabbed(grabbed);
        }}
        className="flex items-start gap-4"
      >
        {STAGES.map((stage) => {
          const stageTasks = tasks.filter((task) => statusOf(task) === stage.id);
          const headingId = `column-${stage.id}`;

          return (
            <section key={stage.id} aria-labelledby={headingId} className="min-w-0 flex-1">
              <h2 id={headingId} className="mb-3 text-base font-semibold uppercase text-text-primary">
                {stage.label}{' '}
                <span className="font-normal text-text-muted">{stageTasks.length}</span>
              </h2>

              <div
                onDragOver={(event) => {
                  event.preventDefault(); // without this the drop never fires
                  event.dataTransfer.dropEffect = 'move';
                  setDragOverStage(stage.id);
                }}
                onDragLeave={(event) => {
                  // Fires for every child too, so only clear when the pointer
                  // has actually left the column.
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setDragOverStage(null);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData('text/plain');
                  if (id) moveTask(id, stage.id);
                  setDragOverStage(null);
                }}
                className={`min-h-24 rounded-lg p-1 ${
                  dragOverStage === stage.id ? 'ring-2 ring-brand-primary' : ''
                }`}
              >
                {stageTasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line p-4 text-sm text-text-muted">
                    You've got no tasks; click "+"/"New Task" to get started!
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {stageTasks.map((task) => (
                      <li key={task.id}>
                        <TaskCard
                          task={task}
                          onOpen={(opener) => open(task, opener)}
                          onCopy={() => copyContext(task)}
                          onDragEnd={() => setDragOverStage(null)}
                          onHighlight={setHighlighted}
                          selection={
                            grabbed?.id === task.id
                              ? 'grabbed'
                              : highlighted === task.id
                                ? 'highlighted'
                                : null
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {editing !== null && (
        <TaskModal
          task={editing === 'new' ? null : editing}
          team={team}
          onSave={save}
          onDelete={remove}
          onClose={close}
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
