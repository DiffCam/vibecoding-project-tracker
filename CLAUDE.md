# VibeCheckr — working notes

Hackathon project (`vibecheckr.app`): a single-page Kanban board for tracking
AI-assisted work. React 18 + TypeScript + Vite + Tailwind. **localStorage only
— no backend, no auth, no state library.** Desktop only.

Read `NOTES.md` for the milestone list, `DESIGN.md` / `PRD` / `REQUIREMENTS`
for the brief. M4–M12 are built; **M13 `pitch-ready` is the only one left.**

---

## Traps this codebase has already sprung

Each of these cost real debugging time. They are not hypothetical.

**Tailwind silently drops arbitrary values containing commas or an alpha
slash.** `shadow-[0_1px_3px_rgb(0_0_0/0.18)]` and
`ease-[cubic-bezier(0.22,1.25,0.36,1)]` both generated *nothing*, with `tsc`
and the build perfectly happy. Put anything like that in `index.css` as a real
class. Always confirm a new arbitrary class appears in `dist/assets/*.css`.

**New colour tokens need a dev-server restart.** PostCSS reads
`tailwind.config.js` once at boot. Worse: **two dev servers have been running
all session (5173 and 5174)**, and a six-day-old one on 5174 served CSS with
no rule for a new token while happily serving the new CSS variable — so the
value was right and nothing applied it. If a colour "doesn't work", check
which port is open before touching the colour.

**Check a fill against what is *behind* it, not just its sibling.** Three
separate bugs came from this: preview panes 1.02 from the page, a selected
card painting *darker* than the resting one, and unselected tags on
`bg-surface-page` inside a page-coloured column (invisible). Translucent fills
(`bg-x/10`) composite over the parent — compute the result, don't assume.

**Contrast ratio is a poor measure near black.** `#050507` vs `#101012` looks
plainly different and scores 1.06. Chasing the number drove an optimiser to
mid-greys. Below ~#202020, use a hairline instead of contorting tones.

**The `hidden` attribute loses to any display utility on the same element.**
Preflight ships `[hidden]:where(:not([hidden=until-found]))`, and `:where()`
contributes nothing — so it is `(0,1,0)`, exactly the same as `.inline-flex`
or `.flex`, which are declared *later* and therefore win. `hidden={cond}` on a
flex button is silently inert. Don't render it, or use `className={cond ?
'hidden' : 'flex'}`. (A bare `hidden` on an element with no display class —
`CollapsibleSection` — is fine.)

**`tsc` cannot catch a JSX structural move.** Cutting a block by "start marker
to assumed end marker" twice produced valid, balanced JSX wrapped around the
wrong content — the preview panes ended up inside the left column. Before
moving JSX, print the div depth per line and verify the result the same way.

**Grep escaping has produced several false "MISSING" reports.** Minified CSS
strips leading zeros and spaces around `/`: `calc((100% - 0.25rem)/3)` ships as
`calc((100% - .25rem) / 3)`. Use `grep -F` with the minified form, and note
`grep … | head -1 || echo MISSING` can never fire — the pipe masks the status.

**Test expectations have been wrong more often than the code.** Due dates are
end-of-day, so a task due "3 days ago" reads as 2 days past. Recognised
headings are consumed by the parser and regenerated, so they are absent from
parsed text by design. Assert the *contract* across a range, not hand-computed
strings.

**Other one-offs:** `visibility: hidden` cannot hold focus (it stranded a
keyboard carry). A nested `<form>` is invalid and hands submit to the outer
form (it reloaded the page). Comparing array *lengths* as a proxy for "something
was discarded" fails at off-by-one — the overwrite warning missed v2-of-3.

---

## Conventions

**Colour.** Every colour resolves through a CSS variable in `index.css`; the
theme swaps by toggling one class on `<html>`. **No `dark:` variants anywhere.**
Tokens that behave differently per theme get per-theme values, not opacity
tricks — `surface-chrome` is the *brightest* surface in light and the *darkest*
in dark, so no single pair works for both.

**Contrast is measured, not guessed.** Text 4.5:1, non-text 3:1, and CIELAB ΔE
when two colours must be told apart (>10 distinct; the vibe palette holds ΔE 27
across moods). Several palettes here exist because the obvious choice failed a
measurement.

**Self-checks instead of a test runner.** There is no test framework. The
pattern is: compile the module with
`npx tsc src/x.ts --outDir node_modules/.check --module commonjs --target es2020 --ignoreConfig`,
run `node --input-type=commonjs -e "…assertions…"`, then `rm -rf node_modules/.check`.
Modules with checks: `dueState`, `relativeTime`, `promptContext`, `safeUrl`,
`boardNavigation`, `taskFilter`, `tags`, `tagColor`, `teamMember`, `sprints`,
`useModifierKey`, `vibe`, `demoData`, `reasons`, `sections`, `contextHistory`,
`taskHistory`. Non-trivial new logic should leave one.

**No browser automation in this environment.** Everything visual is unverified
until the user looks. Say so.

---

## Architecture worth knowing

**Three context tiers** compose in `promptContext.ts`: agent → project → task,
one `#` heading each — *Your Role*, *Full Project Context*, *Task Description*,
*Task Context*. The task's own title is an `##` under its section; it used to be
the only `#`, which made the contents outrank their container. The old
"byte-identical with no outer tiers" guarantee is **retired** — every copied
prompt now carries its headings. Empty tiers are still dropped entirely rather
than emitted as bald headings, and that *is* asserted.

**One markdown string, three editors.** `task.context` is the only store;
Simple / SPDD / Custom are *views*. `sections.ts` owns the fence-aware `##`
splitter that both `reasons.ts` (the REASONS canvas) and the custom-section
parser build on, so they cannot disagree about where a section starts. Switching
views is asserted lossless and idempotent across 24 sequences.

**The canvas and custom textareas are uncontrolled on purpose.** The store
trims, which was swallowing Space and Enter mid-typing. They need a `key` bump
(`restoredAt`) to pick up an external change — that is why restoring a version
works.

**Context history is splice patches**, forward-chained from empty
(`contextHistory.ts`): `{at, remove, insert}` from the common prefix/suffix.
Exact, reverses by construction, 441 round-trips asserted. Task history
(`taskHistory.ts`) is a separate audit log storing rendered text, so renaming a
milestone later does not rewrite the past.

**Keyboard model.** One carry mechanism, two inputs. Rows stack vertically —
cards → lane drop boxes → sprint pills → milestone tabs — and which rows are
reachable depends on what is in hand. `⌥` is select mode (groups), normal mode
is single items. `boardNavigation.carryTo` is shared and asserted.

---

## Outstanding

- **M13 `pitch-ready`** — the only unbuilt milestone.
- **`public/vibemeter.png`** — 4.2MB, unused since the webp, still staged.
  `git rm` it before it lands in history.
- **Five `TEMPORARY` markers in `VibeDialog.tsx`** — the draggable probe for
  checking the vibe regions. Delete once the boundaries are settled.
- **Two AA failures, raised several times, undecided:** white on
  `brand-primary` (4.02 light / 3.65 dark) and `brand-accent` as text. Both
  affect New Task and Save. Suggested: `#0062CC` light, `#0A6BD0` dark.
- **`DESIGN.md` has drifted** from the code in at least six places (dark mode,
  `text-muted`, due colours, type colours, new surface tokens).
- **Demo scenarios set `contextMode: 'spdd'` but leave the context empty**, so
  they show an unfilled canvas. Filling one would make a much better pitch.
- **No precedence line in the composed prompt.** Agreed in discussion, never
  added: *"later tiers narrow earlier ones; where they conflict the narrower
  wins."* Concatenation genuinely hands an LLM contradictions without it.
- **`history` and `events` are unbounded** per task. Patches are small, but
  there is no cap.
- **An agent's *role* cannot be edited after creation.** Its context can —
  `ContextPage` serves both the project tier and each agent, reached from the
  team roster. A person's name, handle, email and role are also create-only.
- `vercel-v0-one-shot-alternative/` is gitignored and unused.

---

## Working style for this session

`/ponytail full` is active: smallest complete change, reuse what exists, and
**end every reply naming what was skipped and any risk.** The user is technical,
decisive, and corrects quickly — give a recommendation rather than a survey, and
disagree when the evidence supports it. They have twice preferred a stated
decision over a clarifying question, and have twice been right against my
advice (REASONS at the task tier; the task editor needing a full page).
