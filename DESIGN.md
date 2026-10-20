# Vibecoding Project Tracker — Design

**Status:** Hackathon starter design doc · fill in the **`<TODO>`** sections before you tag `design-done`.

**Why this file exists.** This tracker is your tool. It should look like *your* tool — not a generic Kanban with default Tailwind blue. Twenty minutes of design decisions here will be visible on every screen for the next six weeks of Module 5.

**Who owns this.** Person B, during the same window the rest of the team is reviewing the PRD. By the time the team converges to start M4 (`data-model`), this file should be filled in and the colors should already be in `tailwind.config.js`.

---

## 1. Mood / vibe

One sentence that captures the feeling the tracker should leave you with.

`A clean, intuitive and professional DX tool cemented around productivity enhancement and task management.`

Two or three references that capture the vibe (links to dribbble shots, screenshots of apps you admire, Pinterest boards — anything visual):

- `https://dribbble.com/shots/25808347-Kanban-board-Project-Management`
- `https://www.atlassian.com/software/jira`
- `https://developer.apple.com/design/human-interface-guidelines`

Anti-references — what we are explicitly **not** trying to look like:

- `https://github.com/features/issues`

## 2. Color palette

These are the colors the build milestones will reference. Once chosen, paste the hex values into `tailwind.config.js` so the rest of the team can use Tailwind utility classes (e.g. `bg-brand-primary`, `border-due-warning`).

### Brand

| Token | Hex | Where it shows up |
|---|---|---|
| `brand-primary` | `007AFF` | Header, "+" button, focus rings |
| `brand-accent` | `FF2D55` | Highlights, hover states, links |
| `surface-page` | `E5E5EA` | Page background |
| `surface-card` | `F5F5F7` | Card background |
| `text-primary` | `1D1D1F` | Body text |
| `text-muted` | `86868B` | Captions, dates, counts |

### Task type (M6 `tag-style`)

| Token | Hex | When used |
|---|---|---|
| `type-feature` | `34C759` | Cards tagged `feature` (accent stripe + icon) |
| `type-bug` | `FF9500` | Cards tagged `bug` (accent stripe + icon) |

### Due-date states (M8 `due-tint`)

| Token | Hex | When used |
|---|---|---|
| `due-safe` | `34C759` | More than 2 days out |
| `due-warning` | `FFCC00` | Less than 24 hours |
| `due-overdue` | `FF3B30` | Past due |
| `due-neutral` | `86868B` | Done (overrides date) |

## 3. Typography

| Role | Font | Why |
|---|---|---|
| Heading | `Inter` | `A clean, geometric sans-serif that perfectly mimics Apple's native typography on all operating systems.` |
| Body | `Inter` | `Features an excellent, tall "x-height" optimized for screen readability, reducing eye strain during long reading sessions.` |
| Monospace (tags, badges, code) | `JetBrains Mono` | `Designed specifically for developers to distinctly separate similar characters (like 1, l, I, 0, O), heavily reducing cognitive load when reading prompts.` |

Suggested sizes (override only if the design demands it):

- Page title: 24 px / semibold
- Section header: 16 px / semibold uppercase
- Card title: 14 px / medium
- Body: 14 px / regular
- Caption: 12 px / regular muted

## 4. Component principles

One short sentence per element. These set the tone for the build phase — Person A's modal and Person B's anchor board should both feel like they came from this doc.

- **Cards:** `Flat with a subtle 1px border (border-gray-200); absolutely no drop shadows to maintain the low-glare aesthetic.` (e.g. "Light, almost weightless; the only weight is from a 1px border, no shadow except on hover.")
- **Buttons:** `Solid flat fill, pill-shaped (rounded-full or rounded-lg for iOS feel), with generous horizontal padding and a subtle opacity shift on hover.` (e.g. "Solid fill, no gradient, generous padding, rounded-md.")
- **Modal:** `Centered, constrained to max-w-lg, with a simple 40% opacity black backdrop and a subtle background blur (backdrop-blur-sm).` (e.g. "Centered, max-width-md, slate-900 backdrop at 50% opacity.")
- **Empty states:** `A delicate dashed border with text-muted typography that feels calming, not broken.` (e.g. "Dashed border, muted text, never sad.")
- **Drag affordance (if used):** `None; we use a clean status dropdown to keep interactions predictable and accessible.` (e.g. "None — we use a status dropdown.")

## 5. Voice / microcopy

Three lines of microcopy that capture the tone of the product. Keep it short — these are the words a stressed user reads at 11pm.

| Where | Text |
|---|---|
| "+" button label | `New Task` (e.g. "+ Task" or "Add task" or "New") |
| Empty column placeholder | `You've got no tasks; click "+"/"New Task" to get started!` (e.g. "Nothing here yet — keep going.") |
| Toast after "Copy as Prompt Context" | `Context copied. Ready to paste.` (e.g. "Copied. Now paste it into the AI.") |
| Confirm-delete message | `Delete this task? This cannot be undone.` (e.g. "Delete this task? You can't undo.") |
| Handoff toast (M7 `task-owner`) | `Task handed off to {name}.` (e.g. "Handed off to {name}. They've got it.") |

## 6. Logo / wordmark

The tracker probably doesn't need a logo, but it does need a name and a wordmark style.

- **Product name:** `VibeCheck` (match PRD §11 team identity)
- **Wordmark style:** `Just the name in the Inter heading font using text-primary, with "DiffCam" in semibold and "Tracker" in regular weight. No icon.` (e.g. "Just the name in the heading font, brand-primary color, no icon.")

## 7. Out of scope (this hackathon)

To keep design tight, the following are explicitly not part of `design-done`:

- A dark mode toggle. Pick one mode and ship it.
- Multiple themes. One brand, applied consistently.
- Animations beyond a 200 ms fade on toast notifications.
- A custom icon set. Use [Lucide icons](https://lucide.dev) via Tailwind classes if you need any.

---

*DESIGN.md version: hackathon-starter v1*
