import { useEffect, useRef, useState } from 'react';
import { SEED_ANCHORS, STAGES } from './constants';
import { SEED_TASKS } from './seedTasks';
import AnchorBoard from './components/AnchorBoard';
import DrivingStrip from './components/DrivingStrip';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import { toPromptContext } from './promptContext';
import { useLocalStorage } from './useLocalStorage';
import type { Anchor, Task } from './types';

export default function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('vibetracker.tasks', SEED_TASKS);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // The element that opened the modal, so focus can go back to it on close (8.C).
  const openerRef = useRef<HTMLElement | null>(null);

  const [anchors, setAnchors] = useLocalStorage<Anchor[]>('vibetracker.anchors', SEED_ANCHORS);

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

        <button
          type="button"
          onClick={(event) => open('new', event.currentTarget)}
          className="rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          New Task
        </button>
      </header>

      <AnchorBoard anchors={anchors} onChange={setAnchorUrl} />

      <DrivingStrip tasks={tasks} />

      <main className="flex items-start gap-4">
        {STAGES.map((stage) => {
          const stageTasks = tasks.filter((task) => task.status === stage.id);
          const headingId = `column-${stage.id}`;

          return (
            <section key={stage.id} aria-labelledby={headingId} className="min-w-0 flex-1">
              <h2 id={headingId} className="mb-3 text-base font-semibold uppercase text-text-primary">
                {stage.label}{' '}
                <span className="font-normal text-text-muted">{stageTasks.length}</span>
              </h2>

              {stageTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-text-muted">
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
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>

      {editing !== null && (
        <TaskModal
          task={editing === 'new' ? null : editing}
          onSave={save}
          onDelete={remove}
          onClose={close}
        />
      )}

      {/* Always mounted: a live region has to exist before its text changes to be
          announced, and keeping it rendered gives the 200 ms fade both ways free. */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-text-primary px-4 py-2 text-sm text-white transition-opacity duration-200 ${
          toast ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  );
}
