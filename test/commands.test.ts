import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCommand, EXIT, explain, init, next, status } from '../src/commands.js';
import { project, TWO_PHASES } from './helpers.js';

describe('init', () => {
  it('writes the standard profile config and phase templates', () => {
    const root = project();
    const result = init({ cwd: root });
    expect(result.code).toBe(EXIT.ok);
    expect(existsSync(join(root, 'phasegate.config.yaml'))).toBe(true);
    expect(existsSync(join(root, 'docs/phases/06-release/release-checklist.md'))).toBe(true);
    expect(result.stdout).toContain('created  phasegate.config.yaml');
  });

  it('writes a smaller set for the small profile', () => {
    const root = project();
    init({ cwd: root, profile: 'small' });
    expect(existsSync(join(root, 'docs/phases/release.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/phases/06-release'))).toBe(false);
  });

  it('never overwrites an existing file without --force', () => {
    const root = project({ 'phasegate.config.yaml': 'mine' });
    const result = init({ cwd: root });
    expect(readFileSync(join(root, 'phasegate.config.yaml'), 'utf8')).toBe('mine');
    expect(result.stdout).toContain('skipped  phasegate.config.yaml');
    init({ cwd: root, force: true });
    expect(readFileSync(join(root, 'phasegate.config.yaml'), 'utf8')).not.toBe('mine');
  });

  it('rejects an unknown profile with exit code 2', () => {
    expect(init({ cwd: project(), profile: 'huge' })).toMatchObject({ code: EXIT.error });
  });

  it('produces a config that loads and whose first phase is in progress', () => {
    const root = project();
    init({ cwd: root });
    const result = status({ cwd: root, json: true });
    expect(result.code).toBe(EXIT.ok);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.current).toBe('discover');
    expect(parsed.next.kind).toBe('current-phase');
  });
});

describe('check command', () => {
  it('exits 1 when enforced gates fail and 0 when they pass', () => {
    const root = project({ 'phasegate.config.yaml': TWO_PHASES });
    expect(checkCommand({ cwd: root }).code).toBe(EXIT.failed);
    const done = project({ 'phasegate.config.yaml': TWO_PHASES, 'docs/adr.md': 'x' });
    expect(checkCommand({ cwd: done }).code).toBe(EXIT.ok);
  });

  it('exits 2 for a missing config or an unknown phase', () => {
    expect(checkCommand({ cwd: project() })).toMatchObject({ code: EXIT.error });
    const root = project({ 'phasegate.config.yaml': TWO_PHASES });
    const result = checkCommand({ cwd: root, phase: 'deploy' });
    expect(result.code).toBe(EXIT.error);
    expect(result.stderr).toContain('Unknown phase "deploy"');
  });

  it('prints machine-readable failures with --json', () => {
    const root = project({ 'phasegate.config.yaml': TWO_PHASES });
    const parsed = JSON.parse(checkCommand({ cwd: root, json: true }).stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.failures[0]).toMatchObject({ phase: 'design', type: 'file-exists', status: 'fail' });
  });

  it('reports invalid config as exit 2 with every problem listed', () => {
    const root = project({ 'phasegate.config.yaml': 'version: 1\nphases: []\n' });
    const result = checkCommand({ cwd: root });
    expect(result.code).toBe(EXIT.error);
    expect(result.stderr).toContain('"phases" must be a non-empty list');
  });
});

describe('explain and next', () => {
  it('explains a built-in phase without a config', () => {
    const result = explain('release', { cwd: project() });
    expect(result.code).toBe(EXIT.ok);
    expect(result.stdout.toLowerCase()).toContain('rollback');
  });

  it('adds the project gates when a config exists', () => {
    const root = project({ 'phasegate.config.yaml': TWO_PHASES });
    expect(explain('build', { cwd: root }).stdout).toContain('checklist fully ticked (docs/done.md)');
  });

  it('rejects an unknown phase and lists the known ones', () => {
    const result = explain('deploy', { cwd: project() });
    expect(result.code).toBe(EXIT.error);
    expect(result.stderr).toContain('discover');
  });

  it('next returns the skipped earlier phase as JSON', () => {
    const root = project({ 'phasegate.config.yaml': TWO_PHASES });
    expect(JSON.parse(next({ cwd: root, json: true }).stdout)).toMatchObject({ kind: 'skipped-phase', phase: 'design' });
  });
});
