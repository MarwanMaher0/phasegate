import { describe, expect, it } from 'vitest';
import { annotations, input, parseBoolean, runAction } from '../src/action.js';
import { expandGlob, globToRegExp, isExcluded } from '../src/glob.js';
import { makeColors, shouldColor, table, visibleLength } from '../src/render.js';
import { project, TWO_PHASES } from './helpers.js';

function capture() {
  const lines: string[] = [];
  const summaries: string[] = [];
  return { lines, summaries, io: { log: (l: string) => lines.push(l), appendSummary: (_p: string, t: string) => summaries.push(t) } };
}

describe('GitHub Action', () => {
  it('reads inputs the way the runner passes them', () => {
    expect(input({ INPUT_PHASE: ' design ' }, 'phase')).toBe('design');
    expect(parseBoolean('', 'strict')).toBe(false);
    expect(parseBoolean('TRUE', 'strict')).toBe(true);
    expect(() => parseBoolean('maybe', 'strict')).toThrow(/true or false/);
  });

  it('fails, annotates and writes a job summary when gates fail', () => {
    const root = project({ 'phasegate.config.yaml': TWO_PHASES });
    const out = capture();
    const code = runAction({ GITHUB_STEP_SUMMARY: '/tmp/summary' }, root, out.io);
    expect(code).toBe(1);
    expect(out.lines.some((l) => l.startsWith('::error file=docs/adr.md,title=phasegate%3A design::'))).toBe(true);
    expect(out.summaries.join('')).toContain('design');
  });

  it('passes when gates pass', () => {
    const root = project({ 'phasegate.config.yaml': TWO_PHASES, 'docs/adr.md': 'x' });
    expect(runAction({}, root, capture().io)).toBe(0);
  });

  it('exits 2 with an error annotation for a broken config', () => {
    const out = capture();
    expect(runAction({}, project(), out.io)).toBe(2);
    expect(out.lines[0]).toMatch(/^::error title=phasegate::No phasegate config found/);
  });

  it('escapes newlines and colons in annotations', () => {
    const [line] = annotations({
      ok: false,
      strict: false,
      enforced: [],
      failures: [{ phase: 'a', gate: { type: 'command', label: 'run: x', level: 'required', status: 'fail', message: 'one\ntwo', details: [] } }],
    });
    expect(line).toBe('::error title=phasegate%3A a::run: x: one%0Atwo');
  });
});

describe('colour', () => {
  it('respects --no-color, NO_COLOR, FORCE_COLOR and TTY', () => {
    expect(shouldColor(false, { FORCE_COLOR: '1' }, true)).toBe(false);
    expect(shouldColor(undefined, { NO_COLOR: '1' }, true)).toBe(false);
    expect(shouldColor(undefined, { FORCE_COLOR: '1' }, false)).toBe(true);
    expect(shouldColor(undefined, {}, false)).toBe(false);
    expect(shouldColor(undefined, {}, true)).toBe(true);
  });

  it('aligns table columns by visible width, ignoring colour codes', () => {
    const c = makeColors(true);
    expect(visibleLength(c.red('abc'))).toBe(3);
    const lines = table([[c.green('a'), 'x'], ['long', 'y']]).split('\n');
    expect(visibleLength(lines[0] as string)).toBe(visibleLength(lines[1] as string));
  });
});

describe('glob', () => {
  it('matches single-segment and recursive patterns', () => {
    expect(globToRegExp('docs/*.md').test('docs/a.md')).toBe(true);
    expect(globToRegExp('docs/*.md').test('docs/sub/a.md')).toBe(false);
    expect(globToRegExp('docs/**/*.md').test('docs/a.md')).toBe(true);
    expect(globToRegExp('docs/**/*.md').test('docs/x/y/a.md')).toBe(true);
  });

  it('excludes by basename or path and skips node_modules', () => {
    expect(isExcluded('adr/template.md', ['template.md'])).toBe(true);
    const root = project({ 'a/x.md': '', 'a/node_modules/y.md': '', 'a/template.md': '' });
    expect(expandGlob(root, 'a/**/*.md', ['template.md'])).toEqual(['a/x.md']);
  });
});
