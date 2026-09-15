import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseDocument } from 'yaml';

export const CONFIG_FILENAMES = ['phasegate.config.yaml', 'phasegate.config.yml'];

export type GateLevel = 'required' | 'recommended';

interface GateBase {
  level: GateLevel;
  name?: string;
  hint?: string;
}

export interface FileExistsGate extends GateBase {
  type: 'file-exists';
  path: string;
  exclude: string[];
}
export interface SectionGate extends GateBase {
  type: 'section';
  path: string;
  heading: string;
  exclude: string[];
}
export interface AcceptanceCriteriaGate extends GateBase {
  type: 'acceptance-criteria';
  path: string;
  pattern: string;
  exclude: string[];
}
export interface AdrStatusGate extends GateBase {
  type: 'adr-status';
  path: string;
  allowed: string[];
  exclude: string[];
}
export interface ChecklistGate extends GateBase {
  type: 'checklist';
  path: string;
  exclude: string[];
}
export interface NoTodoGate extends GateBase {
  type: 'no-todo';
  path: string;
  markers: string[];
  exclude: string[];
}
export interface CommandGate extends GateBase {
  type: 'command';
  run: string;
  /** Seconds. */
  timeout: number;
}

export type Gate =
  | FileExistsGate
  | SectionGate
  | AcceptanceCriteriaGate
  | AdrStatusGate
  | ChecklistGate
  | NoTodoGate
  | CommandGate;

export type GateType = Gate['type'];

export interface ArtifactSpec {
  path: string;
  exclude: string[];
}

export interface PhaseConfig {
  id: string;
  title?: string;
  /** Path to a Markdown file with teaching content, for custom phases. */
  guide?: string;
  artifacts: ArtifactSpec[];
  gates: Gate[];
}

export interface Config {
  version: 1;
  current: string;
  phases: PhaseConfig[];
}

export interface LoadedConfig {
  config: Config;
  path: string;
  root: string;
}

export class ConfigError extends Error {
  constructor(
    public readonly file: string,
    public readonly problems: string[],
  ) {
    super(`Invalid config ${file}:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

export const DEFAULT_MARKERS = ['TODO', 'TBD', 'FIXME'];
export const DEFAULT_ADR_ALLOWED = ['Accepted', 'Superseded'];
export const DEFAULT_REQUIREMENT_PATTERN = '^REQ-\\d+';
export const DEFAULT_COMMAND_TIMEOUT = 300;

const COMMON_KEYS = ['type', 'level', 'name', 'hint'];
const GATE_KEYS: Record<GateType, { required: string[]; optional: string[] }> = {
  'file-exists': { required: ['path'], optional: ['exclude'] },
  section: { required: ['path', 'heading'], optional: ['exclude'] },
  'acceptance-criteria': { required: ['path'], optional: ['pattern', 'exclude'] },
  'adr-status': { required: ['path'], optional: ['allowed', 'exclude'] },
  checklist: { required: ['path'], optional: ['exclude'] },
  'no-todo': { required: ['path'], optional: ['markers', 'exclude'] },
  command: { required: ['run'], optional: ['timeout'] },
};
export const GATE_TYPES = Object.keys(GATE_KEYS) as GateType[];

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0] as number;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j] as number;
      dp[j] = Math.min((dp[j] as number) + 1, (dp[j - 1] as number) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length] as number;
}

export function suggest(input: string, options: string[]): string {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const option of options) {
    const d = levenshtein(input.toLowerCase(), option.toLowerCase());
    if (d < bestDistance) {
      best = option;
      bestDistance = d;
    }
  }
  return best !== undefined && bestDistance <= Math.max(2, Math.floor(input.length / 3)) ? ` Did you mean "${best}"?` : '';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function describe(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'a list';
  return typeof v === 'object' ? 'a mapping' : `${typeof v} ${JSON.stringify(v)}`;
}

function checkKeys(obj: Record<string, unknown>, allowed: string[], where: string, problems: string[]): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      problems.push(`${where}: unknown key "${key}".${suggest(key, allowed)} Allowed keys: ${allowed.join(', ')}.`);
    }
  }
}

function stringList(value: unknown, where: string, problems: string[]): string[] | undefined {
  if (value === undefined) return undefined;
  const list = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(list) || !list.every((x) => typeof x === 'string')) {
    problems.push(`${where}: expected a list of strings, got ${describe(value)}.`);
    return undefined;
  }
  return list as string[];
}

function parseGate(raw: unknown, where: string, problems: string[]): Gate | undefined {
  if (!isRecord(raw)) {
    problems.push(`${where}: expected a mapping with at least "type", got ${describe(raw)}.`);
    return undefined;
  }
  const type = raw.type;
  if (typeof type !== 'string') {
    problems.push(`${where}: missing "type". Use one of: ${GATE_TYPES.join(', ')}.`);
    return undefined;
  }
  if (!(type in GATE_KEYS)) {
    problems.push(`${where}: unknown gate type "${type}".${suggest(type, GATE_TYPES)} Use one of: ${GATE_TYPES.join(', ')}.`);
    return undefined;
  }
  const spec = GATE_KEYS[type as GateType];
  const before = problems.length;
  checkKeys(raw, [...COMMON_KEYS, ...spec.required, ...spec.optional], where, problems);

  for (const key of spec.required) {
    const v = raw[key];
    if (typeof v !== 'string' || v.trim() === '') {
      problems.push(`${where}: "${key}" is required for gate type "${type}" and must be a non-empty string${v === undefined ? '' : `, got ${describe(v)}`}.`);
    }
  }
  const level = raw.level ?? 'required';
  if (level !== 'required' && level !== 'recommended') {
    problems.push(`${where}: "level" must be "required" or "recommended", got ${describe(level)}.`);
  }
  for (const key of ['name', 'hint', 'pattern']) {
    if (raw[key] !== undefined && typeof raw[key] !== 'string') {
      problems.push(`${where}: "${key}" must be a string, got ${describe(raw[key])}.`);
    }
  }
  const exclude = stringList(raw.exclude, `${where}.exclude`, problems) ?? [];
  const markers = stringList(raw.markers, `${where}.markers`, problems);
  const allowed = stringList(raw.allowed, `${where}.allowed`, problems);
  if (markers && markers.length === 0) problems.push(`${where}.markers: list at least one marker, or remove the gate.`);
  if (allowed && allowed.length === 0) problems.push(`${where}.allowed: list at least one status, for example [Accepted].`);

  const pattern = typeof raw.pattern === 'string' ? raw.pattern : DEFAULT_REQUIREMENT_PATTERN;
  if (type === 'acceptance-criteria') {
    try {
      new RegExp(pattern);
    } catch (e) {
      problems.push(`${where}.pattern: not a valid regular expression (${(e as Error).message}).`);
    }
  }
  let timeout = DEFAULT_COMMAND_TIMEOUT;
  if (raw.timeout !== undefined) {
    if (typeof raw.timeout !== 'number' || !(raw.timeout > 0)) {
      problems.push(`${where}.timeout: must be a positive number of seconds, got ${describe(raw.timeout)}.`);
    } else {
      timeout = raw.timeout;
    }
  }
  if (problems.length > before) return undefined;

  const base = {
    level: level as GateLevel,
    ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
    ...(typeof raw.hint === 'string' ? { hint: raw.hint } : {}),
  };
  const path = raw.path as string;
  switch (type as GateType) {
    case 'file-exists':
      return { type: 'file-exists', path, exclude, ...base };
    case 'section':
      return { type: 'section', path, heading: raw.heading as string, exclude, ...base };
    case 'acceptance-criteria':
      return { type: 'acceptance-criteria', path, pattern, exclude, ...base };
    case 'adr-status':
      return { type: 'adr-status', path, allowed: allowed ?? DEFAULT_ADR_ALLOWED, exclude, ...base };
    case 'checklist':
      return { type: 'checklist', path, exclude, ...base };
    case 'no-todo':
      return { type: 'no-todo', path, markers: markers ?? DEFAULT_MARKERS, exclude, ...base };
    case 'command':
      return { type: 'command', run: raw.run as string, timeout, ...base };
  }
}

function parseArtifact(raw: unknown, where: string, problems: string[]): ArtifactSpec | undefined {
  if (typeof raw === 'string' && raw.trim() !== '') return { path: raw, exclude: [] };
  if (isRecord(raw)) {
    checkKeys(raw, ['path', 'exclude'], where, problems);
    if (typeof raw.path !== 'string' || raw.path.trim() === '') {
      problems.push(`${where}: "path" is required and must be a non-empty string.`);
      return undefined;
    }
    return { path: raw.path, exclude: stringList(raw.exclude, `${where}.exclude`, problems) ?? [] };
  }
  problems.push(`${where}: expected a path string or { path, exclude }, got ${describe(raw)}.`);
  return undefined;
}

/** Validates an already-parsed YAML value. Throws ConfigError listing every problem found. */
export function validateConfig(raw: unknown, file = 'phasegate.config.yaml'): Config {
  const problems: string[] = [];
  if (!isRecord(raw)) {
    throw new ConfigError(file, [`expected a mapping with "version", "current" and "phases", got ${describe(raw)}.`]);
  }
  checkKeys(raw, ['version', 'current', 'phases'], 'top level', problems);
  if (raw.version !== 1) {
    problems.push(
      raw.version === undefined
        ? 'missing "version". Add `version: 1` at the top of the file.'
        : `unsupported "version" ${describe(raw.version)}. This release of phasegate understands version 1.`,
    );
  }

  const phases: PhaseConfig[] = [];
  if (!Array.isArray(raw.phases) || raw.phases.length === 0) {
    problems.push('"phases" must be a non-empty list. Run `phasegate init` to generate a working example.');
  } else {
    const seen = new Set<string>();
    raw.phases.forEach((p: unknown, i: number) => {
      const where = `phases[${i}]`;
      if (!isRecord(p)) {
        problems.push(`${where}: expected a mapping with "id", got ${describe(p)}.`);
        return;
      }
      checkKeys(p, ['id', 'title', 'guide', 'artifacts', 'gates'], where, problems);
      const id = p.id;
      if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) {
        problems.push(`${where}: "id" must be a lower-case name such as "design" (letters, digits, dashes), got ${describe(id)}.`);
        return;
      }
      const at = `${where} (${id})`;
      if (seen.has(id)) problems.push(`${at}: duplicate phase id "${id}".`);
      seen.add(id);
      for (const key of ['title', 'guide']) {
        if (p[key] !== undefined && typeof p[key] !== 'string') problems.push(`${at}: "${key}" must be a string.`);
      }

      const artifacts: ArtifactSpec[] = [];
      if (p.artifacts !== undefined && p.artifacts !== null) {
        if (!Array.isArray(p.artifacts)) problems.push(`${at}: "artifacts" must be a list.`);
        else
          p.artifacts.forEach((a: unknown, j: number) => {
            const spec = parseArtifact(a, `${at}.artifacts[${j}]`, problems);
            if (spec) artifacts.push(spec);
          });
      }
      const gates: Gate[] = [];
      if (p.gates !== undefined && p.gates !== null) {
        if (!Array.isArray(p.gates)) problems.push(`${at}: "gates" must be a list.`);
        else
          p.gates.forEach((g: unknown, j: number) => {
            const gate = parseGate(g, `${at}.gates[${j}]`, problems);
            if (gate) gates.push(gate);
          });
      }
      phases.push({
        id,
        ...(typeof p.title === 'string' ? { title: p.title } : {}),
        ...(typeof p.guide === 'string' ? { guide: p.guide } : {}),
        artifacts,
        gates,
      });
    });
  }

  const ids = phases.map((p) => p.id);
  if (typeof raw.current !== 'string') {
    problems.push(`missing "current". Set it to the phase the team is in now, for example \`current: ${ids[0] ?? 'discover'}\`.`);
  } else if (ids.length > 0 && !ids.includes(raw.current)) {
    problems.push(`"current" is "${raw.current}", which is not a phase in this file.${suggest(raw.current, ids)} Phases: ${ids.join(', ')}.`);
  }

  if (problems.length > 0) throw new ConfigError(file, problems);
  return { version: 1, current: raw.current as string, phases };
}

export function parseConfig(text: string, file = 'phasegate.config.yaml'): Config {
  const doc = parseDocument(text, { prettyErrors: true });
  if (doc.errors.length > 0) {
    throw new ConfigError(
      file,
      doc.errors.map((e) => {
        const pos = e.linePos?.[0];
        return `YAML syntax error${pos ? ` at line ${pos.line}, column ${pos.col}` : ''}: ${e.message.split('\n')[0]}`;
      }),
    );
  }
  return validateConfig(doc.toJS(), file);
}

export class ConfigNotFoundError extends Error {
  constructor(public readonly searched: string) {
    super(`No phasegate config found in ${searched}. Run \`phasegate init\` to create one, or pass --config <path>.`);
    this.name = 'ConfigNotFoundError';
  }
}

export function findConfig(cwd: string, explicit?: string): string {
  if (explicit) {
    const p = resolve(cwd, explicit);
    if (!existsSync(p)) throw new ConfigNotFoundError(p);
    return p;
  }
  for (const name of CONFIG_FILENAMES) {
    const p = resolve(cwd, name);
    if (existsSync(p)) return p;
  }
  throw new ConfigNotFoundError(cwd);
}

export function loadConfig(cwd: string, explicit?: string): LoadedConfig {
  const path = findConfig(cwd, explicit);
  const config = parseConfig(readFileSync(path, 'utf8'), path);
  return { config, path, root: dirname(path) };
}
