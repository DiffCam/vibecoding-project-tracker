import { STAGES } from './constants';
import { SEED_TASKS } from './seedTasks';
import TaskCard from './components/TaskCard';
import { useLocalStorage } from './useLocalStorage';
import type { Task } from './types';

export default function App() {
  const [tasks] = useLocalStorage<Task[]>('vibetracker.tasks', SEED_TASKS);

  // TODO M5 crud-modal: const [editing, setEditing] = useState<Task | null>(null);
  // TODO M11 anchors:   const [anchors, setAnchors] = useLocalStorage<Anchor[]>('vibetracker.anchors', ...);

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
      </header>

      {/* TODO M11 anchors: render the Anchor Board (Presentation / Demo / Report / Documentation) above the board. */}

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
                      <TaskCard task={task} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
