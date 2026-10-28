import { ALT_LABEL, MODIFIER_LABEL } from './useModifierKey';

export type Hint = { keys: string; label: string };

/** Where the keyboard cursor is sitting. Mirrors `aim`, with null as cards. */
export type Row = 'cards' | 'sprint' | 'status' | 'milestone';

export type BoardState = {
  /** A keyboard mode is live — the cursor arrived by key, not by click. */
  armed: boolean;
  selectMode: boolean;
  /** A single card in hand. */
  carrying: boolean;
  /** A sprint in hand. */
  heldSprint: boolean;
  /** A milestone in hand. */
  heldMilestone: boolean;
  /** How many cards are in the pile. */
  selected: number;
  focus: Row;
};

/**
   * Backspace, not Escape: on macOS Escape leaves full screen, so backing
   * out of a carry would take the window with it.
   */
const BACK = '⌫';
const EXIT = { keys: BACK, label: 'Back' };

/**
 * What the keyboard can do from exactly where the board is now.
 *
 * One exhaustive list taught the shortcuts once and then said the same thing
 * forever, including the two thirds that do nothing from here. This answers
 * a narrower question — what do these keys do *now* — which is the only one
 * anyone has while holding a card.
 *
 * Pure, and the single source for both the strip and anything else that
 * wants to describe the board's state in keys.
 */
export function boardHints(state: BoardState): Hint[] {
  const { armed, selectMode, carrying, heldSprint, heldMilestone, selected, focus } = state;

  // Nothing in hand and no mode entered: the two doors in, and nothing else.
  // Listing the arrows here would be describing a cursor that is not there.
  if (!armed && !selectMode) {
    return [
      { keys: MODIFIER_LABEL, label: 'Single selection' },
      { keys: ALT_LABEL, label: 'Group select' },
    ];
  }

  if (selectMode) {
    const pile = `${selected} selected`;
    if (focus === 'cards') {
      return [
        { keys: '← → ↑ ↓', label: 'Move' },
        { keys: 'Space', label: selected > 0 ? 'Take or return' : 'Take' },
        ...(selected > 0 ? [{ keys: '↑', label: `Lift ${pile}` }] : []),
        { keys: ALT_LABEL, label: 'Leave select mode' },
      ];
    }
    // Up among the drop rows with a pile in hand.
    return [
      { keys: '← →', label: focus === 'status' ? 'Pick a lane' : 'Pick a sprint' },
      { keys: focus === 'status' ? '↑' : '↓', label: 'Other row' },
      { keys: 'Space', label: `Drop ${pile}` },
      { keys: BACK, label: 'Back to the cards' },
    ];
  }

  if (carrying) {
    return [
      { keys: '← →', label: 'Change lane' },
      { keys: '↑ ↓', label: 'In and out of the sprints' },
      { keys: `Space / ${MODIFIER_LABEL}`, label: 'Place it' },
      { keys: BACK, label: 'Cancel the move' },
    ];
  }

  // Checked before the sprint, because the handler resolves it first: the
  // milestone is the outer container and everything below can go in it.
  if (heldMilestone) {
    if (focus === 'milestone') {
      return [
        { keys: '← →', label: 'Move along the tabs' },
        { keys: '↓', label: 'Down to the sprints' },
        { keys: BACK, label: 'Put the milestone back' },
      ];
    }
    if (focus === 'cards') {
      return [
        { keys: '← → ↑ ↓', label: 'Move' },
        { keys: 'Space', label: 'File this task under it' },
        { keys: BACK, label: 'Put the milestone back' },
      ];
    }
    return [
      { keys: '← →', label: 'Pick a sprint' },
      { keys: 'Space', label: 'File the sprint under it' },
      { keys: '↓', label: 'Down to the tasks' },
      { keys: BACK, label: 'Put the milestone back' },
    ];
  }

  if (heldSprint) {
    if (focus === 'milestone') {
      return [
        { keys: '← →', label: 'Pick a milestone' },
        { keys: 'Space', label: 'File the sprint here' },
        { keys: '↓', label: 'Back to the sprints' },
        { keys: BACK, label: 'Put the sprint back' },
      ];
    }
    if (focus === 'cards') {
      return [
        { keys: '← → ↑ ↓', label: 'Move' },
        { keys: 'Space', label: 'Add this task to the sprint' },
        { keys: BACK, label: 'Put the sprint back' },
      ];
    }
    return [
      { keys: '← →', label: 'Move along the row' },
      { keys: '↑', label: 'Up to the milestones' },
      { keys: '↓', label: 'Down to the tasks' },
      { keys: BACK, label: 'Put the sprint back' },
    ];
  }

  if (focus === 'sprint') {
    return [
      { keys: '← →', label: 'Move along the row' },
      { keys: '↵', label: 'Filter by this sprint' },
      { keys: 'Space', label: 'Pick the sprint up' },
      { keys: '↓', label: 'Back to the tasks' },
      EXIT,
    ];
  }

  if (focus === 'milestone') {
    return [
      { keys: '← →', label: 'Move along the tabs' },
      { keys: '↵', label: 'Switch to this milestone' },
      { keys: 'Space', label: 'Pick the milestone up' },
      { keys: '↓', label: 'Back to the sprints' },
      EXIT,
    ];
  }

  // Armed, on the cards, empty hands.
  return [
    { keys: '← → ↑ ↓', label: 'Move between tasks' },
    { keys: '↵', label: 'Open this task' },
    { keys: 'Space', label: 'Pick it up' },
    { keys: '↑', label: 'Up to the sprints' },
    { keys: ALT_LABEL, label: 'Group select' },
  ];
}

/** A word for the mode, for the strip's label at the left. */
export function modeName(state: BoardState): string {
  if (state.selectMode) return 'Group select';
  if (state.carrying) return 'Carrying a task';
  // Same order boardHints resolves in, so the label and the keys can never
  // describe two different carries.
  if (state.heldMilestone) return 'Carrying a milestone';
  if (state.heldSprint) return 'Carrying a sprint';
  if (state.armed) return 'Keyboard';
  return 'Keyboard shortcuts';
}
