import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { check, evaluateProject, nextStep, UnknownPhaseError } from '../src/evaluate.js';
import { project } from './helpers.js';

const CONFIG = (current: string) => `version: 1
current: ${current}
phases:
  - id: discover
    gates:
      - type: file-exists
        path: docs/problem.md
  - id: design
    gates:
      - type: file-exists
        path: docs/adr.md
      - type: file-exists
        path: docs/diagram.md
        level: recommended
  - id: build
    gates:
      - type: checklist
        path: docs/done.md
`;

function report(current: string, files: Record<string, string> = {}) {
  const root = project({ 'phasegate.config.yaml': CONFIG(current), ...files });
  return evaluateProject(loadConfig(root));
}

describe('evaluateProject', () => {
  it('assigns positions and states relative to current', () => {
    const r = report('design', { 'docs/problem.md': 'x' });
    expect(r.phases.map((p) => [p.id, p.position, p.state])).toEqual([
      ['discover', 'before', 'done'],
      ['design', 'current', 'in-progress'],
      ['build', 'after', 'upcoming'],
    ]);
  });

  it('marks an earlier phase with a failing required gate as skipped', () => {
    expect(report('build').phases[0]?.state).toBe('skipped');
  });

  it('uses the built-in teaching title and question', () => {
    const discover = report('discover').phases[0];
    expect(discover?.title).toBe('Discover');
    expect(discover?.question.length).toBeGreaterThan(10);
  });
});

describe('check', () => {
  it('enforces only the phases before current by default', () => {
    const result = check(report('design', { 'docs/problem.md': 'x' }));
    expect(result.ok).toBe(true);
    expect(result.enforced.map((p) => p.id)).toEqual(['discover']);
    expect(result.inProgress?.id).toBe('design');
  });

  it('fails when an earlier phase was skipped', () => {
    const result = check(report('build', { 'docs/problem.md': 'x' }));
    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.phase)).toEqual(['design']);
  });

  it('ignores recommended gates unless strict', () => {
    const r = report('build', { 'docs/problem.md': 'x', 'docs/adr.md': 'x' });
    expect(check(r).ok).toBe(true);
    const strict = check(r, { strict: true });
    expect(strict.ok).toBe(false);
    expect(strict.failures[0]?.gate.level).toBe('recommended');
  });

  it('checks exactly one phase when asked, and rejects unknown phases', () => {
    const r = report('discover');
    expect(check(r, { phase: 'build' }).enforced.map((p) => p.id)).toEqual(['build']);
    expect(() => check(r, { phase: 'deploy' })).toThrow(UnknownPhaseError);
  });
});

describe('nextStep', () => {
  it('points at a skipped earlier phase first', () => {
    expect(nextStep(report('build'))).toMatchObject({ kind: 'skipped-phase', phase: 'discover' });
  });

  it('then at the current phase', () => {
    expect(nextStep(report('design', { 'docs/problem.md': 'x' }))).toMatchObject({ kind: 'current-phase', phase: 'design' });
  });

  it('says to advance once the current phase is complete', () => {
    const step = nextStep(report('discover', { 'docs/problem.md': 'x' }));
    expect(step).toMatchObject({ kind: 'advance', phase: 'design' });
    expect(step.message).toContain('current: design');
  });

  it('on the last phase, surfaces a failing recommended gate, then completion', () => {
    const files = { 'docs/problem.md': 'x', 'docs/adr.md': 'x', 'docs/done.md': '- [x] shipped' };
    expect(nextStep(report('build', files))).toMatchObject({ kind: 'recommended', phase: 'design' });
    expect(nextStep(report('build', { ...files, 'docs/diagram.md': 'x' })).kind).toBe('complete');
  });
});
