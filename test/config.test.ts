import { describe, expect, it } from 'vitest';
import { ConfigError, ConfigNotFoundError, DEFAULT_MARKERS, loadConfig, parseConfig, suggest } from '../src/config.js';
import { project, TWO_PHASES } from './helpers.js';

function problems(text: string): string[] {
  try {
    parseConfig(text);
  } catch (e) {
    if (e instanceof ConfigError) return e.problems;
    throw e;
  }
  return [];
}

describe('parseConfig', () => {
  it('accepts a valid config and fills gate defaults', () => {
    const config = parseConfig(`version: 1
current: design
phases:
  - id: design
    gates:
      - type: no-todo
        path: docs/*.md
`);
    const gate = config.phases[0]?.gates[0];
    expect(gate).toMatchObject({ type: 'no-todo', level: 'required', markers: DEFAULT_MARKERS, exclude: [] });
  });

  it('reports every problem at once, not just the first', () => {
    const found = problems(`current: nope
phases:
  - id: Design
  - id: build
    gates:
      - type: file-exist
        path: x
`);
    expect(found.some((p) => p.includes('missing "version"'))).toBe(true);
    expect(found.some((p) => p.includes('lower-case name'))).toBe(true);
    expect(found.some((p) => p.includes('unknown gate type "file-exist"'))).toBe(true);
    expect(found.some((p) => p.includes('"current" is "nope"'))).toBe(true);
  });

  it('suggests the closest gate type for a typo', () => {
    expect(problems('version: 1\ncurrent: a\nphases:\n  - id: a\n    gates:\n      - type: checklst\n        path: x\n').join('\n')).toContain(
      'Did you mean "checklist"?',
    );
  });

  it('rejects unknown keys and names the allowed ones', () => {
    const found = problems('version: 1\ncurrent: a\nphases:\n  - id: a\n    gates:\n      - type: file-exists\n        path: x\n        paht: y\n');
    expect(found.join('\n')).toMatch(/unknown key "paht".*Did you mean "path"/);
  });

  it('requires the fields each gate type needs', () => {
    expect(problems('version: 1\ncurrent: a\nphases:\n  - id: a\n    gates:\n      - type: section\n        path: x\n').join('\n')).toContain(
      '"heading" is required',
    );
  });

  it('rejects an invalid acceptance-criteria pattern', () => {
    const text = 'version: 1\ncurrent: a\nphases:\n  - id: a\n    gates:\n      - type: acceptance-criteria\n        path: x\n        pattern: "("\n';
    expect(problems(text).join('\n')).toContain('not a valid regular expression');
  });

  it('rejects duplicate phase ids and a bad level', () => {
    const found = problems('version: 1\ncurrent: a\nphases:\n  - id: a\n  - id: a\n    gates:\n      - type: file-exists\n        path: x\n        level: optional\n');
    expect(found.join('\n')).toContain('duplicate phase id "a"');
    expect(found.join('\n')).toContain('"level" must be "required" or "recommended"');
  });

  it('turns YAML syntax errors into a ConfigError with a line number', () => {
    expect(problems('version: 1\nphases: [unclosed').join('\n')).toMatch(/YAML syntax error at line \d+/);
  });

  it('rejects an unsupported version', () => {
    expect(problems(TWO_PHASES.replace('version: 1', 'version: 2')).join('\n')).toContain('unsupported "version"');
  });
});

describe('loadConfig', () => {
  it('finds phasegate.config.yaml in the project root', () => {
    const root = project({ 'phasegate.config.yaml': TWO_PHASES });
    const loaded = loadConfig(root);
    expect(loaded.root).toBe(root);
    expect(loaded.config.phases.map((p) => p.id)).toEqual(['design', 'build']);
  });

  it('accepts the .yml spelling and an explicit path', () => {
    const root = project({ 'phasegate.config.yml': TWO_PHASES, 'ci/custom.yaml': TWO_PHASES });
    expect(loadConfig(root).path.endsWith('phasegate.config.yml')).toBe(true);
    expect(loadConfig(root, 'ci/custom.yaml').path.endsWith('custom.yaml')).toBe(true);
  });

  it('throws ConfigNotFoundError with a hint to run init', () => {
    const root = project();
    expect(() => loadConfig(root)).toThrow(ConfigNotFoundError);
    expect(() => loadConfig(root)).toThrow(/phasegate init/);
  });
});

describe('suggest', () => {
  it('only suggests close matches', () => {
    expect(suggest('desgin', ['design', 'build'])).toContain('design');
    expect(suggest('zzzzzz', ['design', 'build'])).toBe('');
  });
});
