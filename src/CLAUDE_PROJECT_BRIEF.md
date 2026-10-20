# Project: Vibecoding Project Tracker

## 1. Context & Constraints
- **Goal:** Build a single-page Kanban board tailored for tracking AI-assisted coding (vibecoding) tasks and prompts.
- **Tech Stack:** React (via Vite), Tailwind CSS, standard React hooks (`useState`, `useEffect`).
- **Persistence:** `localStorage` ONLY. No backend, no database, no authentication.
- **Styling:** Tailwind utility classes only. No external `.css` files. Dark/Light mode not required, sensible defaults preferred.
- **Target Platform:** Desktop web browser (mobile responsiveness is out of scope).

## 2. Core Data Models (Strict Types)
Use these exact interfaces for state management:

```typescript
type TaskType = 'feature' | 'bug';
type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
type AITool = 'Claude' | 'ChatGPT' | 'Cursor' | 'Lovable' | 'Replit' | 'Other' | null;

interface Task {
  id: string; // UUID or timestamp
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  assignee: string; // Restricted to hardcoded team array
  dueDate: string | null; // ISO 'YYYY-MM-DD'
  createdDate: string; // ISO 'YYYY-MM-DD'
  context: string; // Markdown supported string
  contextTool: AITool;
  contextUpdatedAt: string | null; // ISO timestamp
}

interface Anchor {
  id: 'presentation' | 'demo' | 'report' | 'documentation';
  label: string;
  url: string | null;
}