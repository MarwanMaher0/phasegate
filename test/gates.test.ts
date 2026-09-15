import { describe, expect, it } from 'vitest';
import type { Gate } from '../src/config.js';
import { evaluateGate, gateLabel } from '../src/gates.js';
import { project } from './helpers.js';

const ctx = (root: string, runCommands = false) => ({ root, runCommands });
const base = { level: 'required' as const, exclude: [] as string[] };

describe('file-exists', () => {
  it('passes for an existing file and fails with a clear message otherwise', () => {
    const root = project({ 'docs/a.md': 'x' });
    expect(evaluateGate({ ...base, type: 'file-exists', path: 'docs/a.md' }, ctx(root)).status).toBe('pass');
    const missing = evaluateGate({ ...base, type: 'file-exists', path: 'docs/b.md' }, ctx(root));
    expect(missing).toMatchObject({ status: 'fail', message: 'docs/b.md does not exist' });
  });

  it('supports globs and exclusions', () => {
    const root = project({ 'adr/template.md': 'x' });
    const gate: Gate = { ...base, type: 'file-exists', path: 'adr/*.md', exclude: ['template.md'] };
    expect(evaluateGate(gate, ctx(root))).toMatchObject({ status: 'fail', message: 'no files match adr/*.md' });
  });
});

describe('section', () => {
  const gate: Gate = { ...base, type: 'section', path: 'p.md', heading: 'Problem' };

  it('passes when the section has real content', () => {
    expect(evaluateGate(gate, ctx(project({ 'p.md': '## Problem\nIt breaks.\n' }))).status).toBe('pass');
  });

  it('fails when the section only has guidance, and points at the line', () => {
    const result = evaluateGate(gate, ctx(project({ 'p.md': '# Doc\n\n## Problem\n<!-- say what breaks -->\n' })));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('empty');
    expect(result.details[0]).toContain('p.md:3');
  });

  it('fails when the heading is missing', () => {
    expect(evaluateGate(gate, ctx(project({ 'p.md': '## Other\ntext' }))).message).toContain('no "Problem" heading');
  });
});

describe('acceptance-criteria', () => {
  const gate: Gate = { ...base, type: 'acceptance-criteria', path: 'r.md', pattern: '^REQ-\\d+' };

  it('passes when every requirement has Given/Then', () => {
    const md = '## REQ-1 A\nGiven x Then y\n## REQ-2 B\ngiven a, then b\n';
    expect(evaluateGate(gate, ctx(project({ 'r.md': md })))).toMatchObject({ status: 'pass', message: '2 requirements, all with acceptance criteria' });
  });

  it('lists the requirements without criteria', () => {
    const result = evaluateGate(gate, ctx(project({ 'r.md': '## REQ-1 A\nGiven x Then y\n## REQ-2 B\nnothing\n' })));
    expect(result.status).toBe('fail');
    expect(result.message).toBe('1 of 2 requirements lack a Given/Then acceptance criterion');
    expect(result.details).toEqual(['r.md:3: REQ-2 B']);
  });

  it('fails when there are no requirements at all', () => {
    expect(evaluateGate(gate, ctx(project({ 'r.md': '# Requirements\n' }))).message).toContain('no requirements found');
  });
});

describe('adr-status', () => {
  const gate: Gate = { ...base, type: 'adr-status', path: 'adr/*.md', exclude: ['template.md'], allowed: ['Accepted', 'Superseded'] };

  it('passes when every ADR is accepted, ignoring the template', () => {
    const root = project({ 'adr/0001-db.md': '## Status\nAccepted', 'adr/template.md': '## Status\nProposed' });
    expect(evaluateGate(gate, ctx(root))).toMatchObject({ status: 'pass', message: '1 ADR, all Accepted or Superseded' });
  });

  it('fails for a proposed ADR and for one with no status', () => {
    const root = project({ 'adr/0001.md': '## Status\nProposed', 'adr/0002.md': '# ADR\n' });
    const result = evaluateGate(gate, ctx(root));
    expect(result.status).toBe('fail');
    expect(result.details).toEqual(['adr/0001.md: status is Proposed', 'adr/0002.md: no status found (add a "## Status" section)']);
  });

  it('fails with guidance when no ADRs exist yet', () => {
    expect(evaluateGate(gate, ctx(project({ 'adr/template.md': 'x' }))).message).toContain('write one from the template');
  });
});

describe('checklist', () => {
  const gate: Gate = { ...base, type: 'checklist', path: 'c.md' };

  it('passes when every item is ticked', () => {
    expect(evaluateGate(gate, ctx(project({ 'c.md': '- [x] a\n- [X] b' }))).message).toBe('2 items ticked');
  });

  it('lists unticked items', () => {
    const result = evaluateGate(gate, ctx(project({ 'c.md': '- [x] a\n- [ ] rollback plan' })));
    expect(result).toMatchObject({ status: 'fail', message: '1 of 2 items unticked', details: ['c.md:2: [ ] rollback plan'] });
  });

  it('fails when the file has no checklist', () => {
    expect(evaluateGate(gate, ctx(project({ 'c.md': 'prose only' }))).message).toContain('no checklist items');
  });
});

describe('no-todo', () => {
  const gate: Gate = { ...base, type: 'no-todo', path: 'docs/*.md', markers: ['TODO', 'TBD'] };

  it('fails with the location of each marker', () => {
    const result = evaluateGate(gate, ctx(project({ 'docs/a.md': 'ok\nOwner: TBD' })));
    expect(result).toMatchObject({ status: 'fail', message: '1 marker left', details: ['docs/a.md:2: Owner: TBD'] });
  });

  it('passes when a glob matches nothing, since there is nothing left to finish', () => {
    expect(evaluateGate(gate, ctx(project())).status).toBe('pass');
  });

  it('truncates very long detail lists', () => {
    const md = Array.from({ length: 30 }, (_, i) => `TODO ${i}`).join('\n');
    const result = evaluateGate(gate, ctx(project({ 'docs/a.md': md })));
    expect(result.details).toHaveLength(21);
    expect(result.details.at(-1)).toBe('... and 10 more');
  });
});

describe('command', () => {
  const gate = (run: string, timeout = 30): Gate => ({ level: 'required', type: 'command', run, timeout });

  it('is skipped unless commands are enabled', () => {
    expect(evaluateGate(gate('exit 1'), ctx(project())).status).toBe('skip');
  });

  it('passes on exit 0 and reports the tail of the output on failure', () => {
    const root = project();
    expect(evaluateGate(gate('exit 0'), ctx(root, true)).status).toBe('pass');
    const failed = evaluateGate(gate('echo broken && exit 3'), ctx(root, true));
    expect(failed).toMatchObject({ status: 'fail', message: 'exit code 3' });
    expect(failed.details).toContain('broken');
  });

  it('fails when the command times out', () => {
    expect(evaluateGate(gate('sleep 5', 1), ctx(project(), true)).message).toBe('timed out after 1s');
  });
});

describe('gateLabel', () => {
  it('prefers an explicit name', () => {
    expect(gateLabel({ ...base, type: 'file-exists', path: 'x', name: 'Runbook written' })).toBe('Runbook written');
    expect(gateLabel({ level: 'required', type: 'command', run: 'npm test', timeout: 1 })).toBe('command succeeds: npm test');
  });
});
