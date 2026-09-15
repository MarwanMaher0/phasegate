import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Gate } from './config.js';
import { expandGlob, hasGlob } from './glob.js';
import { findAdrStatus, findMarkers, findRequirements, findSection, hasContent, parseChecklist } from './markdown.js';

export type GateStatus = 'pass' | 'fail' | 'skip';

export interface GateResult {
  status: GateStatus;
  message: string;
  /** Specific findings, for example "requirements.md:12 REQ-3 has no Given/Then". */
  details: string[];
}

export interface GateContext {
  root: string;
  /** Command gates only run when this is true. */
  runCommands: boolean;
}

const MAX_DETAILS = 20;

export function gateLabel(gate: Gate): string {
  if (gate.name) return gate.name;
  switch (gate.type) {
    case 'file-exists':
      return `${gate.path} exists`;
    case 'section':
      return `"${gate.heading}" section filled in (${gate.path})`;
    case 'acceptance-criteria':
      return `every requirement has acceptance criteria (${gate.path})`;
    case 'adr-status':
      return `ADRs are ${gate.allowed.join(' or ')} (${gate.path})`;
    case 'checklist':
      return `checklist fully ticked (${gate.path})`;
    case 'no-todo':
      return `no ${gate.markers.join('/')} left (${gate.path})`;
    case 'command':
      return `command succeeds: ${gate.run}`;
  }
}

/** The file (or pattern) a gate looks at, used for CI annotations. */
export function gatePath(gate: Gate): string | undefined {
  return gate.type === 'command' ? undefined : gate.path;
}

function pass(message: string, details: string[] = []): GateResult {
  return { status: 'pass', message, details };
}
function fail(message: string, details: string[] = []): GateResult {
  return {
    status: 'fail',
    message,
    details: details.length > MAX_DETAILS ? [...details.slice(0, MAX_DETAILS), `... and ${details.length - MAX_DETAILS} more`] : details,
  };
}

function read(root: string, rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function files(ctx: GateContext, gate: Exclude<Gate, { type: 'command' }>): string[] {
  return expandGlob(ctx.root, gate.path, gate.exclude);
}

function missing(path: string): GateResult {
  return fail(hasGlob(path) ? `no files match ${path}` : `${path} does not exist`);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function evaluateGate(gate: Gate, ctx: GateContext): GateResult {
  switch (gate.type) {
    case 'file-exists': {
      const found = files(ctx, gate);
      return found.length > 0 ? pass(hasGlob(gate.path) ? `${plural(found.length, 'file')} found` : 'found') : missing(gate.path);
    }

    case 'section': {
      const found = files(ctx, gate);
      if (found.length === 0) return missing(gate.path);
      const problems: string[] = [];
      for (const f of found) {
        const section = findSection(read(ctx.root, f), gate.heading);
        if (!section) problems.push(`${f}: no "${gate.heading}" heading`);
        else if (!hasContent(section.body)) problems.push(`${f}:${section.heading.line + 1}: "${gate.heading}" is empty (guidance comments do not count)`);
      }
      if (problems.length === 0) return pass(`"${gate.heading}" has content`);
      return fail(problems.length === 1 ? (problems[0] as string).replace(/^[^:]+(?::\d+)?: /, '') : `${problems.length} files are missing "${gate.heading}"`, problems);
    }

    case 'acceptance-criteria': {
      const found = files(ctx, gate);
      if (found.length === 0) return missing(gate.path);
      const pattern = new RegExp(gate.pattern);
      let total = 0;
      const without: string[] = [];
      for (const f of found) {
        for (const req of findRequirements(read(ctx.root, f), pattern)) {
          total++;
          if (!req.hasCriteria) without.push(`${f}:${req.line + 1}: ${req.title}`);
        }
      }
      if (total === 0) {
        return fail(`no requirements found (headings matching /${gate.pattern}/, outside guidance comments)`);
      }
      if (without.length > 0) {
        return fail(`${without.length} of ${plural(total, 'requirement')} lack a Given/Then acceptance criterion`, without);
      }
      return pass(`${plural(total, 'requirement')}, all with acceptance criteria`);
    }

    case 'adr-status': {
      const found = files(ctx, gate);
      if (found.length === 0) return fail(`no ADRs found at ${gate.path}; write one from the template`);
      const allowed = gate.allowed.map((s) => s.toLowerCase());
      const bad: string[] = [];
      for (const f of found) {
        const status = findAdrStatus(read(ctx.root, f));
        if (!status) bad.push(`${f}: no status found (add a "## Status" section)`);
        else if (!allowed.includes(status.toLowerCase())) bad.push(`${f}: status is ${status}`);
      }
      if (bad.length > 0) return fail(`${bad.length} of ${plural(found.length, 'ADR')} not ${gate.allowed.join(' or ')}`, bad);
      return pass(`${plural(found.length, 'ADR')}, all ${gate.allowed.join(' or ')}`);
    }

    case 'checklist': {
      const found = files(ctx, gate);
      if (found.length === 0) return missing(gate.path);
      let total = 0;
      const open: string[] = [];
      for (const f of found) {
        for (const item of parseChecklist(read(ctx.root, f))) {
          total++;
          if (!item.checked) open.push(`${f}:${item.line + 1}: [ ] ${item.text}`);
        }
      }
      if (total === 0) return fail('no checklist items found ("- [ ] item")');
      if (open.length > 0) return fail(`${open.length} of ${plural(total, 'item')} unticked`, open);
      return pass(`${plural(total, 'item')} ticked`);
    }

    case 'no-todo': {
      const found = files(ctx, gate);
      if (found.length === 0) {
        return hasGlob(gate.path) ? pass('no files to scan') : missing(gate.path);
      }
      const hits: string[] = [];
      for (const f of found) {
        for (const hit of findMarkers(read(ctx.root, f), gate.markers)) {
          hits.push(`${f}:${hit.line + 1}: ${hit.text}`);
        }
      }
      if (hits.length > 0) return fail(`${plural(hits.length, 'marker')} left`, hits);
      return pass(`none in ${plural(found.length, 'file')}`);
    }

    case 'command': {
      if (!ctx.runCommands) {
        return { status: 'skip', message: 'command gates run in `check` (or pass --run-commands)', details: [] };
      }
      const res = spawnSync(gate.run, {
        cwd: ctx.root,
        shell: true,
        encoding: 'utf8',
        timeout: gate.timeout * 1000,
        maxBuffer: 16 * 1024 * 1024,
      });
      if (res.error && (res.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
        return fail(`timed out after ${gate.timeout}s`);
      }
      if (res.status === 0) return pass('exit code 0');
      const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.trimEnd().split('\n').filter(Boolean).slice(-10);
      return fail(res.status === null ? `terminated by ${res.signal ?? 'signal'}` : `exit code ${res.status}`, output);
    }
  }
}
