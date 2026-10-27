import { splitSections } from './sections';

export type ReasonKey =
  | 'requirements'
  | 'entities'
  | 'approach'
  | 'structure'
  | 'operations'
  | 'norms'
  | 'safeguards';

/**
 * The REASONS canvas, at the level it belongs: one unit of work.
 *
 * Project and agent context are their own tiers and deliberately not shaped
 * like this — a canvas describes a job, and neither of those is a job.
 *
 * Both Structure and Safeguards badge as "S" — the acronym's own quirk — so
 * the badge is coloured to tell them apart. Those two are the furthest pair
 * in the set at ΔE 90, and the closest pair overall is 33. Every colour comes
 * from TAG_PALETTE, where white text is guaranteed 4.9:1 or better.
 */
export const REASONS: {
  key: ReasonKey;
  letter: string;
  title: string;
  blurb: string;
  colour: string;
}[] = [
  {
    key: 'requirements',
    colour: '#C2410C',
    letter: 'R',
    title: 'Requirements',
    blurb: 'What done looks like for this ticket, and how you would know.',
  },
  {
    key: 'entities',
    colour: '#15803D',
    letter: 'E',
    title: 'Entities',
    blurb: 'The data, types and domain objects this work touches.',
  },
  {
    key: 'approach',
    colour: '#0E7490',
    letter: 'A',
    title: 'Approach',
    blurb: 'How to go about it — and any route already ruled out.',
  },
  {
    key: 'structure',
    colour: '#4338CA',
    letter: 'S',
    title: 'Structure',
    blurb: 'The files, modules and dependencies in scope.',
  },
  {
    key: 'operations',
    colour: '#A21CAF',
    letter: 'O',
    title: 'Operations',
    blurb: 'The steps to carry out, in order.',
  },
  {
    key: 'norms',
    colour: '#9F1239',
    letter: 'N',
    title: 'Norms',
    blurb: 'Conventions this ticket must follow beyond the project defaults.',
  },
  {
    key: 'safeguards',
    colour: '#44403C',
    letter: 'S',
    title: 'Safeguards',
    blurb: 'What must not happen, and limits that apply only here.',
  },
];

/** A context blob taken apart: our sections, plus everything that was not. */
export type Canvas = {
  sections: Record<ReasonKey, string>;
  /**
   * Anything the canvas does not own — text before the first heading, and
   * headings we do not recognise. Kept verbatim so switching views can never
   * cost someone their writing, including the older
   * Background/Constraints/Tried so far/Pick up briefs.
   */
  extra: string;
};

const BY_TITLE = new Map(REASONS.map((entry) => [entry.title.toLowerCase(), entry.key]));

const empty = (): Record<ReasonKey, string> =>
  Object.fromEntries(REASONS.map((entry) => [entry.key, ''])) as Record<ReasonKey, string>;

/**
 * Splits a context blob into canvas sections.
 *
 * Only `##` headings whose text is exactly one of the seven count; everything
 * else lands in `extra`. Uses the shared splitter so the canvas and the custom
 * view can never disagree about where a section begins.
 */
export function parseCanvas(markdown: string): Canvas {
  const { preamble, blocks } = splitSections(markdown);
  const sections = empty();
  const extra: string[] = preamble ? [preamble] : [];

  for (const block of blocks) {
    const key = BY_TITLE.get(block.title.toLowerCase());
    if (key === undefined) {
      // Someone else's heading: it and its body stay whole.
      extra.push(`## ${block.title}`, block.body);
      continue;
    }
    // A repeated heading appends rather than replaces, so nothing is lost.
    sections[key] = [sections[key], block.body].filter(Boolean).join('\n\n');
  }

  return { sections, extra: extra.filter(Boolean).join('\n\n').trim() };
}

/**
 * Puts a canvas back together as markdown.
 *
 * Sections appear in REASONS order and only when they hold something, which is
 * what keeps an untouched canvas from pasting seven empty headings. Anything
 * the canvas did not own is appended rather than discarded.
 */
export function toMarkdown({ sections, extra }: Canvas): string {
  const parts: string[] = [];

  for (const entry of REASONS) {
    const body = sections[entry.key]?.trim();
    if (body) parts.push(`## ${entry.title}`, body);
  }

  if (extra.trim()) parts.push(extra.trim());
  return parts.join('\n\n');
}

/** How many of the seven have been written, for the card list's progress. */
export function filledCount(sections: Record<ReasonKey, string>): number {
  return REASONS.filter((entry) => sections[entry.key]?.trim()).length;
}
