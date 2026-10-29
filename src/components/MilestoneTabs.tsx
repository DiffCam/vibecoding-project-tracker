import { useState } from 'react';
import Icon from './Icon';
import type { Milestone } from '../types';

const MAX_NAME = 40;

/**
 * Folder tabs above the board. The active one shares the board's material and
 * sits flush against it; the others are a shade back and dropped a few pixels,
 * which is what reads as "behind".
 *
 * Names are free text, so each label is width-capped and truncated, and the
 * row itself scrolls once there are more tabs than fit.
 */
export default function MilestoneTabs({
  milestones,
  activeId,
  aimedId,
  heldId,
  onSelect,
  onAdd,
  onDelete,
  canManage,
  onRename,
}: {
  milestones: Milestone[];
  activeId: string | null;
  /** The tab a held sprint is aimed at, if any — `undefined` means none is.
   *  Distinct from null, which is the "All" tab. */
  aimedId?: string | null;
  /** The tab currently lifted out of the row, if any. */
  heldId?: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  /** Only the owner and managers may remove a milestone. */
  canManage: boolean;
  onRename: (id: string, name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // Which existing tab is being renamed in place, if any.
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  function commitRename() {
    if (editing && editing.name.trim() !== '') {
      onRename(editing.id, editing.name.trim().slice(0, MAX_NAME));
    }
    setEditing(null);
  }

  function commit() {
    if (draft !== null && draft.trim() !== '') onAdd(draft.trim().slice(0, MAX_NAME));
    setDraft(null);
  }

  const tabs: { id: string | null; name: string }[] = [
    { id: null, name: 'All' },
    ...milestones,
  ];

  return (
    <div className="flex items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const aimed = aimedId !== undefined && tab.id === aimedId;
        // In hand: solid where the cursor is dashed, the same pairing the
        // cards use for "here" against "being carried".
        const held = heldId != null && tab.id === heldId;
        // A shell rather than one button: the tab holds two controls, and a
        // delete button nested inside a select button is invalid HTML.
        return (
          <div
            key={tab.id ?? 'all'}
            data-milestone-drop={tab.id ?? ''}
            // A dashed outline drawn inside the tab, matching a card's focus
            // ring so one shape means "the cursor is here" everywhere. Inset
            // rather than offset because a tab's whole shape is its attachment
            // to the board, and an outline outside it would fight that.
            className={`flex shrink-0 items-center rounded-t-lg text-sm ${
              held
                ? 'outline-2 -outline-offset-2 outline-brand-primary'
                : aimed
                  ? 'outline-2 outline-dashed -outline-offset-2 outline-brand-primary'
                  : ''
            } ${
              active
                ? 'bg-surface-sunken py-1 font-medium text-text-primary'
                : // mb-px leaves a hairline of page colour under inactive tabs. They
                  // share a tone with the alternating lanes, so once there are
                  // enough milestones one would otherwise merge into the lane
                  // beneath it — and not being attached is the point anyway.
                  'mb-px mt-1 bg-surface-sunken-alt py-0.5 text-text-muted'
            }`}
          >
            {editing?.id === tab.id ? (
              <input
                autoFocus
                value={editing.name}
                maxLength={MAX_NAME}
                aria-label={`Rename ${tab.name}`}
                onChange={(event) => setEditing({ id: editing.id, name: event.target.value })}
                // Clicking away abandons the rename; only Enter commits it.
                onBlur={() => setEditing(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setEditing(null); // leave the name as it was
                  }
                }}
                className="mx-2 w-40 rounded bg-surface-card px-2 py-1 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={active ? 'true' : undefined}
                title={tab.name}
                className={`rounded px-4 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                  active ? '' : 'hover:text-text-primary'
                }`}
              >
                <span className="block max-w-48 truncate">{tab.name}</span>
              </button>
            )}

            {/* One control per tab: rename the one you are in, remove the ones
                you are not. Deleting the tab you are looking at would yank the
                board out from under you. */}
            {/* Renaming the tab you are in is everyone's; deleting one you
                are not is the project's. So the control survives when it
                renames and goes when it would delete. */}
            {tab.id !== null && editing?.id !== tab.id && (active || canManage) && (
              <button
                type="button"
                onClick={() =>
                  active
                    ? setEditing({ id: tab.id as string, name: tab.name })
                    : onDelete(tab.id as string)
                }
                aria-label={`${active ? 'Rename' : 'Delete'} milestone ${tab.name}`}
                title={`${active ? 'Rename' : 'Delete'} milestone ${tab.name}`}
                className={`mr-2 rounded-full p-1 text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                  active ? 'hover:text-text-primary' : 'hover:text-brand-accent'
                }`}
              >
                <Icon name={active ? 'pencil' : 'close'} className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}

      {draft === null ? (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Add milestone"
          className="mb-px mt-1 shrink-0 rounded-t-lg bg-surface-sunken-alt px-3 py-1.5 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      ) : (
        <input
          autoFocus
          value={draft}
          maxLength={MAX_NAME}
          aria-label="Milestone name"
          placeholder="Milestone 1"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(null); // abandon without creating
            }
          }}
          className="mb-px mt-1 w-40 shrink-0 rounded-t-lg bg-surface-sunken-alt px-3 py-1.5 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        />
      )}
    </div>
  );
}
