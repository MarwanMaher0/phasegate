import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { builtinGuide, builtinPhaseIds, guideFor, PROFILES, templatesDir, type Profile } from './assets.js';
import { ConfigError, ConfigNotFoundError, loadConfig } from './config.js';
import { check, evaluateProject, nextStep, UnknownPhaseError } from './evaluate.js';
import { makeColors, renderCheck, renderMarkdown, renderNext, renderStatus, type Colors } from './render.js';
import { gateLabel } from './gates.js';

/** Exit codes: 0 success, 1 gates failing, 2 usage or configuration error. */
export const EXIT = { ok: 0, failed: 1, error: 2 } as const;

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface CommonOptions {
  cwd: string;
  config?: string;
  color?: boolean;
}

function ok(stdout: string, code: number = EXIT.ok): CommandResult {
  return { code, stdout: stdout.endsWith('\n') || stdout === '' ? stdout : `${stdout}\n`, stderr: '' };
}

function error(message: string): CommandResult {
  return { code: EXIT.error, stdout: '', stderr: `phasegate: ${message}\n` };
}

function colors(opts: CommonOptions): Colors {
  return makeColors(opts.color ?? false);
}

/** Turns known errors into exit code 2 with a readable message. */
function guard(fn: () => CommandResult): CommandResult {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ConfigError || e instanceof ConfigNotFoundError || e instanceof UnknownPhaseError) {
      return error(e.message);
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// init

export interface InitOptions {
  cwd: string;
  profile?: string;
  force?: boolean;
}

function listFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [relative(base, p).split('\\').join('/')];
  });
}

export function init(opts: InitOptions): CommandResult {
  const profile = (opts.profile ?? 'standard') as Profile;
  if (!PROFILES.includes(profile)) {
    return error(`unknown profile "${opts.profile}". Use one of: ${PROFILES.join(', ')}.`);
  }
  const source = templatesDir(profile);
  const written: string[] = [];
  const skipped: string[] = [];
  for (const rel of listFiles(source).sort()) {
    const target = join(opts.cwd, rel);
    if (existsSync(target) && !opts.force) {
      skipped.push(rel);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(source, rel)));
    written.push(rel);
  }
  const out: string[] = [`phasegate init (${profile} profile)`];
  for (const f of written) out.push(`  created  ${f}`);
  for (const f of skipped) out.push(`  skipped  ${f} (already exists; use --force to overwrite)`);
  out.push('');
  out.push(
    written.length > 0
      ? 'Next: fill in the discover document, then run `phasegate next`. `phasegate explain discover` says why it matters.'
      : 'Nothing written: every file already exists.',
  );
  return ok(out.join('\n'));
}

// ---------------------------------------------------------------------------
// status / check / next

export interface StatusOptions extends CommonOptions {
  json?: boolean;
  runCommands?: boolean;
}

export function status(opts: StatusOptions): CommandResult {
  return guard(() => {
    const loaded = loadConfig(opts.cwd, opts.config);
    const report = evaluateProject(loaded, { runCommands: opts.runCommands ?? false, cwd: opts.cwd });
    const next = nextStep(report);
    if (opts.json) {
      return ok(JSON.stringify({ ...report, next }, null, 2));
    }
    return ok(renderStatus(report, next, colors(opts)));
  });
}

export interface CheckOptions extends CommonOptions {
  phase?: string;
  strict?: boolean;
  json?: boolean;
}

export function checkCommand(opts: CheckOptions): CommandResult {
  return guard(() => {
    const loaded = loadConfig(opts.cwd, opts.config);
    if (opts.phase && !loaded.config.phases.some((p) => p.id === opts.phase)) {
      throw new UnknownPhaseError(opts.phase, loaded.config.phases.map((p) => p.id));
    }
    const report = evaluateProject(loaded, { runCommands: true, cwd: opts.cwd });
    const result = check(report, { ...(opts.phase ? { phase: opts.phase } : {}), strict: opts.strict ?? false });
    const code = result.ok ? EXIT.ok : EXIT.failed;
    if (opts.json) {
      return ok(
        JSON.stringify(
          {
            ok: result.ok,
            strict: result.strict,
            current: report.current,
            phases: result.enforced,
            failures: result.failures.map((f) => ({ phase: f.phase, ...f.gate })),
          },
          null,
          2,
        ),
        code,
      );
    }
    return ok(renderCheck(result, colors(opts)), code);
  });
}

export function next(opts: StatusOptions): CommandResult {
  return guard(() => {
    const loaded = loadConfig(opts.cwd, opts.config);
    const report = evaluateProject(loaded, { runCommands: opts.runCommands ?? false, cwd: opts.cwd });
    const step = nextStep(report);
    return ok(opts.json ? JSON.stringify(step, null, 2) : renderNext(step, colors(opts)));
  });
}

// ---------------------------------------------------------------------------
// explain

export function explain(phase: string, opts: CommonOptions): CommandResult {
  return guard(() => {
    const c = colors(opts);
    let loaded;
    try {
      loaded = loadConfig(opts.cwd, opts.config);
    } catch (e) {
      if (!(e instanceof ConfigNotFoundError) || opts.config) throw e;
    }
    const configured = loaded?.config.phases.find((p) => p.id === phase);
    const guide = loaded && configured ? guideFor(phase, loaded.root, configured.guide) : builtinGuide(phase);
    if (!guide && !configured) {
      const known = [...new Set([...(loaded?.config.phases.map((p) => p.id) ?? []), ...builtinPhaseIds()])];
      return error(`unknown phase "${phase}". Try one of: ${known.join(', ')}.`);
    }
    const out: string[] = [];
    out.push(guide ? renderMarkdown(guide.markdown, c) : `${c.bold(phase.toUpperCase())}\n\nNo teaching content for this phase. Add \`guide: path/to/${phase}.md\` to it in the config.`);
    if (configured) {
      out.push('');
      out.push(c.bold(`In this project (${relative(opts.cwd, loaded!.path) || loaded!.path})`));
      if (configured.artifacts.length > 0) out.push(`Artifacts: ${configured.artifacts.map((a) => a.path).join(', ')}`);
      if (configured.gates.length === 0) out.push('Gates: none configured');
      for (const g of configured.gates) {
        out.push(`  - ${gateLabel(g)}${g.level === 'recommended' ? c.dim(' (recommended)') : ''}`);
      }
    }
    return ok(out.join('\n'));
  });
}
