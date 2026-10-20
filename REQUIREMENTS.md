# Project Requirements


## `FR`: Functional Requirements

### `1`: Kanban board and interface

- `1.A`: The system must display a Kanban board with exactly four columns: "To Do", "In Progress", "Review", and "Done".
- `1.B`: The system must pre-populate the board with 3-4 mock tasks on the very first load so the board is not empty.
- `1.C`: The system must allow users to move tasks between the four columns (via a status dropdown, and optionally via drag-and-drop as a "secret sauce" feature).
- `1.D`: The system must automatically load and persist all board and task data to the browser's localStorage.
    - `1.D.i`: N.B. Data can be persisted in a backend post-MVP
- `1.E`: The system must ensure that at least one of the pre-populated mock tasks contains a fully filled-in prompt context for immediate demo purposes.

### `2`: Task Creation, Editing & Deletion (CRUD)

- `2.A`: The system must provide a "+" button that opens a modal interface for task creation.
- `2.B`: The system must allow users to open an existing task in "edit mode" by clicking its card on the board, pre-filling the modal with the task's current data.
- `2.C`: The system must provide a "Delete" button within the task modal to permanently remove a task.
- `2.D`: The system must automatically generate a unique id (UUID or timestamp) and a createdDate (ISO format) when a new task is created.
- `2.E`: The system must allow users to input and edit the following exact fields in the modal: Title (text), Description (text), Type (dropdown/toggle), Status (dropdown), Assignee (dropdown), Due Date (date picker), Context (markdown text), and AI Tool (dropdown).
- `2.F`: The system must allow users to move tasks between the four Kanban columns by changing the value in the "Status" dropdown within the modal.

### `3`: Visuals & Time-based indicators

- `3.A`: The system must visually distinguish between "feature" and "bug" task types using distinct color accents applied across the board and modal.
- `3.B`: The system must display a small icon in the corner of each task card indicating whether it is a feature or a bug.
- `3.C`: The system must apply a time-based color tinting system to task cards based on their dueDate:
  - `3.C.i`  : Calm: More than 2 days remaining.
  - `3.C.ii` : Warning: Less than 24 hours remaining.
  - `3.C.iii`: Alarm: Past the due date.
  - `3.C.iv` : Task status is "Done" (overrides other tints).

### `4`: Team & Task Ownership

- `4.A`: The system must restrict the "Assignee" dropdown to only allow selection from a predefined list of specific team members (e.g., "Cameron Farr"), with no login or authentication required.
- `4.B`: The system must allow users to "hand-off" a task by changing the assignee in the dropdown.
- `4.C`: The system must display the assigned user's initials or avatar directly on the task card on the board.
- `4.D`: (Optional but requested) The system may display a visual strip at the top of the board showing which specific tasks each team member is currently "driving" (assigned to in active columns).
- `4.E`: The system must display a temporary "toast" or pop-up notification confirming the action when a task is handed off to a new assignee.

### `5`: Vibecoding Context & AI Prompt Tracking

- `5.A`: The system must support Markdown formatting within the "Context" text area inside the modal.
- `5.B`: The system must automatically pre-fill the Context field of newly created tasks with a placeholder template containing specific headings (e.g., Background, Constraints, Tried so far, Pick up).
- `5.C`: The system must restrict the "AI Tool" dropdown to the following options: Claude, ChatGPT, Cursor, Lovable, Replit, Other.
- `5.D`: The system must automatically update and save a contextUpdatedAt timestamp (ISO format) in the background whenever the Context field is modified and saved.
- `5.E`: The system must calculate and display a relative time hint (e.g., "last updated 2h ago") near the Context field based on the contextUpdatedAt timestamp.
- `5.F`: The system must feature a prominently labeled "Copy Context" (or "Copy as Prompt Context") button directly on every task card.
- `5.G`: Clicking the "Copy Context" button must format and copy the task's title, description, and markdown prompt context to the user's clipboard in a single action, ready to be pasted into an AI chat.

### `6`: Deliverable Tracking (Anchor Board)

- `6.A`: The system must display an "Anchor Board" pinned permanently at the top of the interface.
- `6.B`: The Anchor Board must contain exactly four specific deliverable slots: Presentation, Demo, Report, and Documentation.
- `6.C`: The system must provide a URL input field for each of the four deliverable slots to allow users to attach links.
- `6.D`: The system must dynamically update a status indicator (e.g., changing from an empty dot to a filled dot) on a deliverable slot when a URL is successfully inputted and saved.

### `7`: Differentiator ("Secret Sauce")

- `7.A`: The system must implement at least one distinct, functional unique value interaction (UVI) not listed in standard requirements to differentiate the application (e.g., enabling drag-and-drop to bypass the status dropdown, adding collapsible accordion content, or implementing UI sound effects for actions).

### `8`: Accessibility

- `8.A`: The system must allow users to navigate through all interactive elements (task cards, Kanban columns, buttons, dropdowns, input fields) sequentially using keyboard-only input (e.g., Tab and Shift+Tab).
- `8.B`: The system must allow users to trigger focused primary actions—such as opening a task modal, saving a task, or triggering the "Copy Context" button—using the Enter or Space keys.
- `8.C`: The system must automatically shift keyboard focus to the first input field of the modal when it is opened, and return focus to the originating task card when the modal is closed.
- `8.D`: The system must allow users to dismiss/close the active modal interface by pressing the Escape key.
- `8.E`: The system must provide visually hidden, programmatic text (e.g., ARIA labels) for icon-only buttons (like the "+" button for adding tasks or the delete trash can) so screen readers can interpret their function.


## `NFR`: Non-Functional Requirements

### `1`: Deployment and Prototype Access

- `1.A`: The system must be deployed as a live single-page web application via Vercel (or a similar hosting platform).
- `1.B`: The deployed prototype must be accessible via a direct URL without requiring any user registration, account creation, or login (authentication is explicitly out of scope).
  - N.B: (Functional note) For functional teams requirements, a user profiles list or similar may be required to work around this constraint.

### `2`: Usability & User Experience (UX)

- `2.A`: The application's user interface must be optimized exclusively for desktop viewing (mobile responsiveness is explicitly excluded from the scope).
- `2.B`: The system must utilize sensible default color accents (with optional user-defined customisation as a bonus) to ensure a clean, professional visual hierarchy.
- `2.C`: The interface and terminology must be tailored to a technical target audience (Software Engineers, Architects, UX members, Database Creators), utilizing standard development terms (e.g., Kanban, Bug, Feature, Prompt Context).

### `3`: Accessibility (Design)

- `3.A`: The application's UI design must feature high-contrast text and accessible color palettes to accommodate users with visual impairments (complementing the code-based accessibility FRs).
- `3.B`: The design must clearly indicate interactive elements and task states using both color and secondary indicators (e.g., the small corner icons for features vs. bugs) so information is not conveyed by color alone.

### `4`: Security & Privacy

- `4.A`: The system must not implement cybersecurity protocols, login screens, or cloud-based data storage at this stage.
- `4.B`: Any user data (e.g., names inputted into the assignee list, prompt histories) must remain strictly local to the user's specific browser instance to ensure basic privacy by default.

### `5`: Scope Exclusions

- `5.A`: The system must not include real-time collaboration features.
- `5.B`: The system must not include real GitHub API integrations or webhooks.
- `5.C`: The system must not support multiple teams or multiple projects simultaneously (it is a single-project, single-team tool).


## `DR`: Data Requirements

### `1`: Task Entity Data Model

- `1.A`: The system must store each task as an object containing an id field, formatted as a unique string (UUID or timestamp).
- `1.B`: The system must store basic text information for each task using title (string) and description (string) fields.
- `1.C`: The system must restrict the task type field strictly to the string values: 'feature' or 'bug'.
- `1.D`: The system must restrict the task status field strictly to the string values: 'todo', 'in-progress', 'review', or 'done'.
- `1.E`: The system must store the task assignee as a string representing one of the designated team member names.
- `1.F`: The system must store temporal data using createdDate (required ISO date string 'YYYY-MM-DD') and dueDate (ISO date string 'YYYY-MM-DD', or null if unassigned).

### `2`: Vibecoding Context Data Model

- `2.A`: The system must store prompt tracking information within the task object using a context field (string formatted for Markdown).
- `2.B`: The system must track the AI application used via a contextTool field, restricted to the string values: 'Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other', or null.
- `2.C`: The system must record updates to the context via a contextUpdatedAt field, stored as an ISO timestamp string, or null if never updated.

### `3`: Deliverable Tracking (Anchor) Data Model

- `3.A`: The system must represent the Deliverable Anchor Board using an array of Anchor objects.
- `3.B`: Each Anchor object must contain an# Project Requirements


## `FR`: Functional Requirements

### `1`: Kanban board and interface

- `1.A`: The system must display a Kanban board with exactly four columns: "To Do", "In Progress", "Review", and "Done".
- `1.B`: The system must pre-populate the board with 3-4 mock tasks on the very first load so the board is not empty.
- `1.C`: The system must allow users to move tasks between the four columns (via a status dropdown, and optionally via drag-and-drop as a "secret sauce" feature).
- `1.D`: The system must automatically load and persist all board and task data to the browser's localStorage.
  - `1.D.i`: N.B. Data can be persisted in a backend post-MVP
- `1.E`: The system must ensure that at least one of the pre-populated mock tasks contains a fully filled-in prompt context for immediate demo purposes.

### `2`: Task Creation, Editing & Deletion (CRUD)

- `2.A`: The system must provide a "+" button that opens a modal interface for task creation.
- `2.B`: The system must allow users to open an existing task in "edit mode" by clicking its card on the board, pre-filling the modal with the task's current data.
- `2.C`: The system must provide a "Delete" button within the task modal to permanently remove a task.
- `2.D`: The system must automatically generate a unique id (UUID or timestamp) and a createdDate (ISO format) when a new task is created.
- `2.E`: The system must allow users to input and edit the following exact fields in the modal: Title (text), Description (text), Type (dropdown/toggle), Status (dropdown), Assignee (dropdown), Due Date (date picker), Context (markdown text), and AI Tool (dropdown).
- `2.F`: The system must allow users to move tasks between the four Kanban columns by changing the value in the "Status" dropdown within the modal.

### `3`: Visuals & Time-based indicators

- `3.A`: The system must visually distinguish between "feature" and "bug" task types using distinct color accents applied across the board and modal.
- `3.B`: The system must display a small icon in the corner of each task card indicating whether it is a feature or a bug.
- `3.C`: The system must apply a time-based color tinting system to task cards based on their dueDate:
  - `3.C.i`  : Calm: More than 2 days remaining.
  - `3.C.ii` : Warning: Less than 24 hours remaining.
  - `3.C.iii`: Alarm: Past the due date.
  - `3.C.iv` : Task status is "Done" (overrides other tints).

### `4`: Team & Task Ownership

- `4.A`: The system must restrict the "Assignee" dropdown to only allow selection from a predefined list of specific team members (e.g., "Cameron Farr"), with no login or authentication required.
- `4.B`: The system must allow users to "hand-off" a task by changing the assignee in the dropdown.
- `4.C`: The system must display the assigned user's initials or avatar directly on the task card on the board.
- `4.D`: (Optional but requested) The system may display a visual strip at the top of the board showing which specific tasks each team member is currently "driving" (assigned to in active columns).
- `4.E`: The system must display a temporary "toast" or pop-up notification confirming the action when a task is handed off to a new assignee.

### `5`: Vibecoding Context & AI Prompt Tracking

- `5.A`: The system must support Markdown formatting within the "Context" text area inside the modal.
- `5.B`: The system must automatically pre-fill the Context field of newly created tasks with a placeholder template containing specific headings (e.g., Background, Constraints, Tried so far, Pick up).
- `5.C`: The system must restrict the "AI Tool" dropdown to the following options: Claude, ChatGPT, Cursor, Lovable, Replit, Other.
- `5.D`: The system must automatically update and save a contextUpdatedAt timestamp (ISO format) in the background whenever the Context field is modified and saved.
- `5.E`: The system must calculate and display a relative time hint (e.g., "last updated 2h ago") near the Context field based on the contextUpdatedAt timestamp.
- `5.F`: The system must feature a prominently labeled "Copy Context" (or "Copy as Prompt Context") button directly on every task card.
- `5.G`: Clicking the "Copy Context" button must format and copy the task's title, description, and markdown prompt context to the user's clipboard in a single action, ready to be pasted into an AI chat.

### `6`: Deliverable Tracking (Anchor Board)

- `6.A`: The system must display an "Anchor Board" pinned permanently at the top of the interface.
- `6.B`: The Anchor Board must contain exactly four specific deliverable slots: Presentation, Demo, Report, and Documentation.
- `6.C`: The system must provide a URL input field for each of the four deliverable slots to allow users to attach links.
- `6.D`: The system must dynamically update a status indicator (e.g., changing from an empty dot to a filled dot) on a deliverable slot when a URL is successfully inputted and saved.

### `7`: Differentiator ("Secret Sauce")

- `7.A`: The system must implement at least one distinct, functional unique value interaction (UVI) not listed in standard requirements to differentiate the application (e.g., enabling drag-and-drop to bypass the status dropdown, adding collapsible accordion content, or implementing UI sound effects for actions).

### `8`: Accessibility

- `8.A`: The system must allow users to navigate through all interactive elements (task cards, Kanban columns, buttons, dropdowns, input fields) sequentially using keyboard-only input (e.g., Tab and Shift+Tab).
- `8.B`: The system must allow users to trigger focused primary actions—such as opening a task modal, saving a task, or triggering the "Copy Context" button—using the Enter or Space keys.
- `8.C`: The system must automatically shift keyboard focus to the first input field of the modal when it is opened, and return focus to the originating task card when the modal is closed.
- `8.D`: The system must allow users to dismiss/close the active modal interface by pressing the Escape key.
- `8.E`: The system must provide visually hidden, programmatic text (e.g., ARIA labels) for icon-only buttons (like the "+" button for adding tasks or the delete trash can) so screen readers can interpret their function.


## `NFR`: Non-Functional Requirements

### `1`: Deployment and Prototype Access

- `1.A`: The system must be deployed as a live single-page web application via Vercel (or a similar hosting platform).
- `1.B`: The deployed prototype must be accessible via a direct URL without requiring any user registration, account creation, or login (authentication is explicitly out of scope).
  - N.B: (Functional note) For functional teams requirements, a user profiles list or similar may be required to work around this constraint.

### `2`: Usability & User Experience (UX)

- `2.A`: The application's user interface must be optimized exclusively for desktop viewing (mobile responsiveness is explicitly excluded from the scope).
- `2.B`: The system must utilize sensible default color accents (with optional user-defined customisation as a bonus) to ensure a clean, professional visual hierarchy.
- `2.C`: The interface and terminology must be tailored to a technical target audience (Software Engineers, Architects, UX members, Database Creators), utilizing standard development terms (e.g., Kanban, Bug, Feature, Prompt Context).

### `3`: Accessibility (Design)

- `3.A`: The application's UI design must feature high-contrast text and accessible color palettes to accommodate users with visual impairments (complementing the code-based accessibility FRs).
- `3.B`: The design must clearly indicate interactive elements and task states using both color and secondary indicators (e.g., the small corner icons for features vs. bugs) so information is not conveyed by color alone.

### `4`: Security & Privacy

- `4.A`: The system must not implement cybersecurity protocols, login screens, or cloud-based data storage at this stage.
- `4.B`: Any user data (e.g., names inputted into the assignee list, prompt histories) must remain strictly local to the user's specific browser instance to ensure basic privacy by default.

### `5`: Scope Exclusions

- `5.A`: The system must not include real-time collaboration features.
- `5.B`: The system must not include real GitHub API integrations or webhooks.
- `5.C`: The system must not support multiple teams or multiple projects simultaneously (it is a single-project, single-team tool).


## `DR`: Data Requirements

### `1`: Task Entity Data Model

- `1.A`: The system must store each task as an object containing an id field, formatted as a unique string (UUID or timestamp).
- `1.B`: The system must store basic text information for each task using title (string) and description (string) fields.
- `1.C`: The system must restrict the task type field strictly to the string values: 'feature' or 'bug'.
- `1.D`: The system must restrict the task status field strictly to the string values: 'todo', 'in-progress', 'review', or 'done'.
- `1.E`: The system must store the task assignee as a string representing one of the designated team member names.
- `1.F`: The system must store temporal data using createdDate (required ISO date string 'YYYY-MM-DD') and dueDate (ISO date string 'YYYY-MM-DD', or null if unassigned).

### `2`: Vibecoding Context Data Model

- `2.A`: The system must store prompt tracking information within the task object using a context field (string formatted for Markdown).
- `2.B`: The system must track the AI application used via a contextTool field, restricted to the string values: 'Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other', or null.
- `2.C`: The system must record updates to the context via a contextUpdatedAt field, stored as an ISO timestamp string, or null if never updated.

### `3`: Deliverable Tracking (Anchor) Data Model

- `3.A`: The system must represent the Deliverable Anchor Board using an array of Anchor objects.
- `3.B`: Each Anchor object must contain an id field restricted strictly to: 'presentation', 'demo', 'report', or 'documentation'.
- `3.C`: Each Anchor object must contain a label field (string) for human-readable display.
- `3.D`: Each Anchor object must contain a url field (string) representing the pasted link, or null if no link has been provided.

### `4`: Team / User Data

- `4.A`: The system must maintain a static data structure (e.g., an array of objects or strings) storing team member names (and optionally emails/GitHub handles as per open forum notes) to populate assignee options.

### `5`: Storage and Serialization

- `5.A`: The system must serialize all Task, Anchor, and Team data structures into JSON strings before writing to the browser's localStorage API.
- `5.B`: The system must successfully parse stringified JSON data from localStorage back into functional JavaScript objects upon application load.
  id field restricted strictly to: 'presentation', 'demo', 'report', or 'documentation'.
- `3.C`: Each Anchor object must contain a label field (string) for human-readable display.
- `3.D`: Each Anchor object must contain a url field (string) representing the pasted link, or null if no link has been provided.

### `4`: Team / User Data

- `4.A`: The system must maintain a static data structure (e.g., an array of objects or strings) storing team member names (and optionally emails/GitHub handles as per open forum notes) to populate assignee options.

### `5`: Storage and Serialization

- `5.A`: The system must serialize all Task, Anchor, and Team data structures into JSON strings before writing to the browser's localStorage API.
- `5.B`: The system must successfully parse stringified JSON data from localStorage back into functional JavaScript objects upon application load.
