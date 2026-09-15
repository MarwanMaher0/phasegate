import { describe, expect, it } from 'vitest';
import {
  findAdrStatus,
  findMarkers,
  findRequirements,
  findSection,
  hasContent,
  normalizeHeading,
  parseChecklist,
  parseHeadings,
  stripComments,
} from '../src/markdown.js';

describe('stripComments', () => {
  it('removes single-line and multi-line guidance comments but keeps line numbers', () => {
    const md = 'a\n<!-- one -->\nb <!-- two\nthree -->c\nd';
    const out = stripComments(md);
    expect(out.split('\n')).toHaveLength(md.split('\n').length);
    expect(out).not.toContain('one');
    expect(out).not.toContain('three');
    expect(out).toContain('b ');
    expect(out).toContain('c');
  });

  it('leaves comments inside fenced code alone', () => {
    const md = '```html\n<!-- keep me -->\n```';
    expect(stripComments(md)).toContain('keep me');
  });

  it('treats an unclosed comment as running to the end', () => {
    expect(stripComments('text\n<!-- open\nstill hidden')).not.toContain('hidden');
  });
});

describe('headings and sections', () => {
  it('ignores headings inside fenced code', () => {
    const headings = parseHeadings('# Real\n```\n# Not a heading\n```\n## Also real');
    expect(headings.map((h) => h.text)).toEqual(['Real', 'Also real']);
  });

  it('normalises numbering, emphasis, case and trailing colons', () => {
    expect(normalizeHeading('2. **Success Metrics**:')).toBe('success metrics');
  });

  it('finds a section and stops at the next heading of the same level', () => {
    const md = '## Problem\nIt is slow.\n### Detail\nmore\n## Next\nother';
    const section = findSection(md, 'problem');
    expect(section?.body).toContain('It is slow.');
    expect(section?.body).toContain('more');
    expect(section?.body).not.toContain('other');
  });

  it('does not match a heading that only exists inside a guidance comment', () => {
    expect(findSection('<!--\n## Problem\n-->\ntext', 'Problem')).toBeUndefined();
  });

  it('counts a section with only guidance comments as empty', () => {
    expect(hasContent('\n<!-- describe the problem -->\n\n')).toBe(false);
    expect(hasContent('\n<!-- guidance -->\nReal words.\n')).toBe(true);
  });
});

describe('parseChecklist', () => {
  it('reads ticked and unticked items with line numbers', () => {
    const items = parseChecklist('- [x] done\n- [ ] open\n* [X] also done\n1. [ ] numbered');
    expect(items.map((i) => i.checked)).toEqual([true, false, true, false]);
    expect(items[1]).toMatchObject({ text: 'open', line: 1 });
  });

  it('ignores checkboxes in comments and code', () => {
    expect(parseChecklist('<!-- - [ ] hidden -->\n```\n- [ ] code\n```')).toHaveLength(0);
  });
});

describe('findMarkers', () => {
  it('finds TODO and TBD on word boundaries', () => {
    const hits = findMarkers('Owner: TBD\nTODO: write this\nTODOS are fine\nnon-TODO-ish', ['TODO', 'TBD']);
    expect(hits.map((h) => h.marker)).toEqual(['TBD', 'TODO']);
    expect(hits[0]?.line).toBe(0);
  });

  it('ignores markers in guidance comments, fenced code and inline code', () => {
    const md = '<!-- TODO in guidance -->\nUse `TODO` in docs.\n```\nTODO in code\n```';
    expect(findMarkers(md, ['TODO'])).toHaveLength(0);
  });

  it('is case-sensitive', () => {
    expect(findMarkers('todo later', ['TODO'])).toHaveLength(0);
  });
});

describe('findRequirements', () => {
  const pattern = /^REQ-\d+/;

  it('marks requirements with and without Given/Then criteria', () => {
    const md = [
      '## REQ-1 Login',
      '**Given** a user **When** they sign in **Then** they see the dashboard',
      '## REQ-2 Logout',
      'Users can log out.',
    ].join('\n');
    const reqs = findRequirements(md, pattern);
    expect(reqs.map((r) => [r.id, r.hasCriteria])).toEqual([
      ['REQ-1', true],
      ['REQ-2', false],
    ]);
  });

  it('does not let one requirement borrow criteria from the next', () => {
    const md = '### REQ-1 A\nno criteria\n### REQ-2 B\nGiven x Then y';
    expect(findRequirements(md, pattern).map((r) => r.hasCriteria)).toEqual([false, true]);
  });

  it('skips example requirements written inside guidance comments', () => {
    expect(findRequirements('<!--\n## REQ-9 Example\n-->', pattern)).toHaveLength(0);
  });
});

describe('findAdrStatus', () => {
  it('reads the first word of a Status section', () => {
    expect(findAdrStatus('# ADR\n## Status\n\n**Accepted** on 2026-01-02')).toBe('Accepted');
  });

  it('reads a MADR-style status line', () => {
    expect(findAdrStatus('---\nstatus: proposed\n---\n# ADR')).toBe('proposed');
    expect(findAdrStatus('- Status: Superseded by ADR-0004')).toBe('Superseded');
  });

  it('returns undefined when no status is written', () => {
    expect(findAdrStatus('# ADR\n## Context\ntext')).toBeUndefined();
  });
});
