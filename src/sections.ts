/** A `##` block: its heading and everything under it, before the next one. */
export type Block = { title: string; body: string };

/** Everything before the first heading, plus the blocks that follow. */
export type Split = { preamble: string; blocks: Block[] };

/**
 * Splits markdown on `##` headings.
 *
 * Fenced code is skipped while scanning: a `## comment` inside a block is
 * content, not a heading, and the seeded demo task contains exactly that.
 * Shared by the REASONS canvas and the custom sections so the two can never
 * disagree about where a section starts.
 */
export function splitSections(markdown: string): Split {
  const preamble: string[] = [];
  const blocks: { title: string; lines: string[] }[] = [];
  let fenced = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) fenced = !fenced;

    const heading = fenced ? null : /^##\s+(.+?)\s*$/.exec(line);
    if (heading) blocks.push({ title: heading[1], lines: [] });
    else if (blocks.length === 0) preamble.push(line);
    else blocks[blocks.length - 1].lines.push(line);
  }

  return {
    preamble: preamble.join('\n').trim(),
    blocks: blocks.map(({ title, lines }) => ({ title, body: lines.join('\n').trim() })),
  };
}

/** The label that tells a reader — human or model — what a section is for. */
export const DEFINITION_LABEL = 'Section definition:';

const DEFINITION = new RegExp(`^>\\s*\\*\\*${DEFINITION_LABEL}\\*\\*\\s*(.*)$`);

/** A custom section: a heading, what it is for, and what it holds. */
export type CustomSection = { title: string; definition: string; body: string };

/**
 * Reads a block's leading blockquote as its definition, if it has one.
 *
 * A section named "Requirements" needs no explanation, but one named "Threat
 * model notes" does — so a custom section carries its own, written where a
 * model will read it before the content rather than in a tooltip nobody
 * pastes. Blocks without a definition are still sections; they just have none.
 */
export function readSection(block: Block): CustomSection {
  const lines = block.body.split('\n');
  const first = DEFINITION.exec(lines[0] ?? '');
  if (!first) return { title: block.title, definition: '', body: block.body };

  // A quote can run over several lines; it ends at the first that is not one.
  const quoted = [first[1]];
  let index = 1;
  for (; index < lines.length && lines[index].startsWith('>'); index++) {
    quoted.push(lines[index].replace(/^>\s?/, ''));
  }

  return {
    title: block.title,
    definition: quoted.join('\n').trim(),
    body: lines.slice(index).join('\n').trim(),
  };
}

/** One custom section as markdown; the definition is dropped when empty. */
export function writeSection({ title, definition, body }: CustomSection): string {
  const parts = [`## ${title}`];
  if (definition.trim()) {
    const quoted = definition.trim().split('\n').join('\n> ');
    parts.push(`> **${DEFINITION_LABEL}** ${quoted}`);
  }
  if (body.trim()) parts.push(body.trim());
  return parts.join('\n\n');
}

/** A whole context blob as custom sections, with anything above them kept. */
export function parseSections(markdown: string): {
  preamble: string;
  sections: CustomSection[];
} {
  const { preamble, blocks } = splitSections(markdown);
  return { preamble, sections: blocks.map(readSection) };
}

export function sectionsToMarkdown(preamble: string, sections: CustomSection[]): string {
  const parts = preamble.trim() ? [preamble.trim()] : [];
  for (const section of sections) parts.push(writeSection(section));
  return parts.join('\n\n');
}
