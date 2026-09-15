/**
 * A deliberately small Markdown reader. phasegate only needs to know about
 * ATX headings, sections, HTML comments (guidance), fenced code, inline code
 * and task-list checkboxes, so it does not pull in a full Markdown parser.
 */

export interface Heading {
  level: number;
  text: string;
  /** 0-based line index. */
  line: number;
}

export interface Section {
  heading: Heading;
  /** Lines after the heading up to the next heading of the same or higher level. */
  body: string;
  /** 0-based line index of the first body line. */
  bodyStartLine: number;
}

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;

export function splitLines(md: string): string[] {
  return md.replace(/\r\n?/g, '\n').split('\n');
}

/** Tracks whether each line is inside a fenced code block (fence lines count as inside). */
function fenceMask(lines: string[]): boolean[] {
  const mask: boolean[] = [];
  let open: { char: string; len: number } | null = null;
  for (const line of lines) {
    const m = FENCE_RE.exec(line);
    if (open) {
      mask.push(true);
      if (m && m[1] && m[1][0] === open.char && m[1].length >= open.len && line.trim() === m[1]) {
        open = null;
      }
    } else if (m && m[1]) {
      mask.push(true);
      open = { char: m[1][0] ?? '`', len: m[1].length };
    } else {
      mask.push(false);
    }
  }
  return mask;
}

/**
 * Removes HTML comments (phasegate's guidance) outside fenced code blocks.
 * Line breaks inside comments are kept so line numbers stay stable.
 * An unclosed comment runs to the end of the document.
 */
export function stripComments(md: string): string {
  const lines = splitLines(md);
  const out: string[] = [];
  let inComment = false;
  let open: { char: string; len: number } | null = null;

  for (const line of lines) {
    if (!inComment) {
      const m = FENCE_RE.exec(line);
      if (open) {
        out.push(line);
        if (m && m[1] && m[1][0] === open.char && m[1].length >= open.len && line.trim() === m[1]) {
          open = null;
        }
        continue;
      }
      if (m && m[1]) {
        open = { char: m[1][0] ?? '`', len: m[1].length };
        out.push(line);
        continue;
      }
    }

    let result = '';
    let rest = line;
    while (rest.length > 0) {
      if (inComment) {
        const end = rest.indexOf('-->');
        if (end === -1) {
          rest = '';
        } else {
          rest = rest.slice(end + 3);
          inComment = false;
        }
      } else {
        const start = rest.indexOf('<!--');
        if (start === -1) {
          result += rest;
          rest = '';
        } else {
          result += rest.slice(0, start);
          rest = rest.slice(start + 4);
          inComment = true;
        }
      }
    }
    out.push(result.trim() === '' ? '' : result);
  }
  return out.join('\n');
}

/** Blanks fenced code blocks and inline code spans, keeping line numbers. */
export function stripCode(md: string): string {
  const lines = splitLines(md);
  const mask = fenceMask(lines);
  return lines
    .map((line, i) => (mask[i] ? '' : line.replace(/(`+)(?:(?!\1).)+?\1/g, '')))
    .join('\n');
}

export function parseHeadings(md: string): Heading[] {
  const lines = splitLines(md);
  const mask = fenceMask(lines);
  const headings: Heading[] = [];
  lines.forEach((line, i) => {
    if (mask[i]) return;
    const m = HEADING_RE.exec(line);
    if (m && m[1]) {
      headings.push({ level: m[1].length, text: (m[2] ?? '').trim(), line: i });
    }
  });
  return headings;
}

/** Lower-case, drop emphasis, numbering like "2." and trailing punctuation. */
export function normalizeHeading(text: string): string {
  return text
    .replace(/[*_`]/g, '')
    .replace(/^\s*\d+(?:\.\d+)*[.)]?\s+/, '')
    .replace(/[\s:.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sectionFor(lines: string[], headings: Heading[], index: number, stopAt?: (h: Heading) => boolean): Section {
  const heading = headings[index] as Heading;
  let end = lines.length;
  for (let j = index + 1; j < headings.length; j++) {
    const next = headings[j] as Heading;
    if (next.level <= heading.level || (stopAt && stopAt(next))) {
      end = next.line;
      break;
    }
  }
  return {
    heading,
    body: lines.slice(heading.line + 1, end).join('\n'),
    bodyStartLine: heading.line + 1,
  };
}

/**
 * Finds the first section whose heading matches `heading` (case-insensitive,
 * ignoring numbering and trailing colons). Guidance comments are stripped
 * first, so headings inside comments do not count.
 */
export function findSection(md: string, heading: string): Section | undefined {
  const stripped = stripComments(md);
  const lines = splitLines(stripped);
  const headings = parseHeadings(stripped);
  const target = normalizeHeading(heading);
  const index = headings.findIndex((h) => normalizeHeading(h.text) === target);
  return index === -1 ? undefined : sectionFor(lines, headings, index);
}

/** True when a section body holds something other than whitespace, comments and bare headings. */
export function hasContent(body: string): boolean {
  const lines = splitLines(stripComments(body));
  return lines.some((line) => line.trim() !== '' && !HEADING_RE.test(line));
}

export interface ChecklistItem {
  checked: boolean;
  text: string;
  line: number;
}

const CHECKBOX_RE = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s*(.*)$/;

/** Task-list items outside comments and fenced code. */
export function parseChecklist(md: string): ChecklistItem[] {
  const lines = splitLines(stripComments(md));
  const mask = fenceMask(lines);
  const items: ChecklistItem[] = [];
  lines.forEach((line, i) => {
    if (mask[i]) return;
    const m = CHECKBOX_RE.exec(line);
    if (m) items.push({ checked: m[1] !== ' ', text: (m[2] ?? '').trim(), line: i });
  });
  return items;
}

export interface MarkerHit {
  marker: string;
  line: number;
  text: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds leftover markers such as TODO and TBD. Guidance comments, fenced code
 * and inline code are ignored, so documentation can still talk about `TODO`.
 * Matching is case-sensitive and on word boundaries.
 */
export function findMarkers(md: string, markers: string[]): MarkerHit[] {
  if (markers.length === 0) return [];
  const re = new RegExp(`(?<![\\w-])(${markers.map(escapeRegExp).join('|')})(?![\\w-])`);
  const lines = splitLines(stripCode(stripComments(md)));
  const hits: MarkerHit[] = [];
  lines.forEach((line, i) => {
    const m = re.exec(line);
    if (m && m[1]) hits.push({ marker: m[1], line: i, text: line.trim() });
  });
  return hits;
}

export interface Requirement {
  id: string;
  title: string;
  line: number;
  hasCriteria: boolean;
}

/**
 * Requirements are headings whose text matches `pattern` (for example
 * "^REQ-\d+"). Each needs at least one acceptance criterion in its section:
 * a "Given" and a "Then" (Gherkin keywords, any case, bold or plain).
 */
export function findRequirements(md: string, pattern: RegExp): Requirement[] {
  const stripped = stripComments(md);
  const lines = splitLines(stripped);
  const headings = parseHeadings(stripped);
  const plain = (t: string) => t.replace(/[*_`]/g, '').trim();
  const isReq = (h: Heading) => pattern.test(plain(h.text));
  const reqs: Requirement[] = [];
  headings.forEach((h, i) => {
    if (!isReq(h)) return;
    const section = sectionFor(lines, headings, i, isReq);
    const body = section.body.replace(/[*_]/g, '');
    const m = pattern.exec(plain(h.text));
    reqs.push({
      id: m ? m[0].trim() : plain(h.text),
      title: plain(h.text),
      line: h.line,
      hasCriteria: /\bgiven\b/i.test(body) && /\bthen\b/i.test(body),
    });
  });
  return reqs;
}

/**
 * Reads an ADR's status: the first word of the "Status" section, or a
 * "Status: Accepted" line (MADR style, list item or front matter).
 */
export function findAdrStatus(md: string): string | undefined {
  const section = findSection(md, 'Status');
  if (section) {
    for (const line of splitLines(section.body)) {
      const cleaned = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').replace(/[*_`]/g, '').trim();
      if (cleaned === '' || HEADING_RE.test(line)) continue;
      const word = /^[A-Za-z]+/.exec(cleaned);
      if (word) return word[0];
    }
  }
  for (const line of splitLines(stripComments(md))) {
    const m = /^\s*(?:[-*+]\s+)?[*_]*status[*_]*\s*:\s*[*_]*([A-Za-z]+)/i.exec(line);
    if (m && m[1]) return m[1];
  }
  return undefined;
}
