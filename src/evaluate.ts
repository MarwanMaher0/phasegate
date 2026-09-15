import { relative } from 'node:path';
import { guideFor, titleCase } from './assets.js';
import type { Gate, GateLevel, LoadedConfig } from './config.js';
import { evaluateGate, gateLabel, gatePath, type GateStatus } from './gates.js';
import { expandGlob } from './glob.js';

export type Position = 'before' | 'current' | 'after';
/**
 * done: every required gate passes.
 * skipped: a phase before `current` with a failing required gate.
 * in-progress: the current phase, not yet done.
 * upcoming: a phase after `current`, not yet done.
 */
export type PhaseState = 'done' | 'skipped' | 'in-progress' | 'upcoming';

export interface GateReport {
  type: Gate['type'];
  label: string;
  level: GateLevel;
  status: GateStatus;
  message: string;
  details: string[];
  path?: string;
  hint?: string;
}

export interface ArtifactReport {
  path: string;
  present: boolean;
  files: string[];
}

export interface PhaseReport {
  id: string;
  title: string;
  question: string;
  position: Position;
  state: PhaseState;
  artifacts: ArtifactReport[];
  gates: GateReport[];
  summary: {
    gates: number;
    passed: number;
    failed: number;
    skipped: number;
    requiredFailed: number;
    recommendedFailed: number;
  };
}

export interface ProjectReport {
  config: string;
  current: string;
  phases: PhaseReport[];
}

export interface EvaluateOptions {
  runCommands?: boolean;
  /** Directory the config path is shown relative to. */
  cwd?: string;
}

export function evaluateProject(loaded: LoadedConfig, options: EvaluateOptions = {}): ProjectReport {
  const { config, root } = loaded;
  const currentIndex = config.phases.findIndex((p) => p.id === config.current);
  const ctx = { root, runCommands: options.runCommands ?? false };

  const phases = config.phases.map((phase, index): PhaseReport => {
    const position: Position = index < currentIndex ? 'before' : index === currentIndex ? 'current' : 'after';
    const guide = guideFor(phase.id, root, phase.guide);

    const gates = phase.gates.map((gate): GateReport => {
      const result = evaluateGate(gate, ctx);
      const path = gatePath(gate);
      return {
        type: gate.type,
        label: gateLabel(gate),
        level: gate.level,
        status: result.status,
        message: result.message,
        details: result.details,
        ...(path ? { path } : {}),
        ...(gate.hint ? { hint: gate.hint } : {}),
      };
    });
    const artifacts = phase.artifacts.map((a): ArtifactReport => {
      const files = expandGlob(root, a.path, a.exclude);
      return { path: a.path, present: files.length > 0, files };
    });

    const failed = gates.filter((g) => g.status === 'fail');
    const summary = {
      gates: gates.length,
      passed: gates.filter((g) => g.status === 'pass').length,
      failed: failed.length,
      skipped: gates.filter((g) => g.status === 'skip').length,
      requiredFailed: failed.filter((g) => g.level === 'required').length,
      recommendedFailed: failed.filter((g) => g.level === 'recommended').length,
    };

    const complete = summary.requiredFailed === 0;
    let state: PhaseState;
    if (position === 'before') state = complete ? 'done' : 'skipped';
    else if (position === 'current') state = complete ? 'done' : 'in-progress';
    else state = complete && gates.length > 0 && artifacts.every((a) => a.present) ? 'done' : 'upcoming';

    return {
      id: phase.id,
      title: phase.title ?? guide?.title ?? titleCase(phase.id),
      question: guide?.question ?? '',
      position,
      state,
      artifacts,
      gates,
      summary,
    };
  });

  return { config: relative(options.cwd ?? process.cwd(), loaded.path) || loaded.path, current: config.current, phases };
}

// ---------------------------------------------------------------------------
// check

export interface CheckFailure {
  phase: string;
  gate: GateReport;
}

export interface CheckResult {
  ok: boolean;
  strict: boolean;
  /** Phases whose gates decide the exit code. */
  enforced: PhaseReport[];
  /** The current phase when it is not enforced: shown for information only. */
  inProgress?: PhaseReport;
  failures: CheckFailure[];
}

export class UnknownPhaseError extends Error {
  constructor(
    public readonly phase: string,
    public readonly known: string[],
  ) {
    super(`Unknown phase "${phase}". Phases in this project: ${known.join(', ')}.`);
    this.name = 'UnknownPhaseError';
  }
}

export function countsAsFailure(gate: GateReport, strict: boolean): boolean {
  return gate.status === 'fail' && (gate.level === 'required' || strict);
}

/**
 * Without `phase`, enforces every phase before `current`: those are supposed
 * to be finished. The current phase is reported but does not fail the check.
 * With `phase`, enforces exactly that phase. `strict` makes recommended gates count.
 */
export function check(report: ProjectReport, options: { phase?: string; strict?: boolean } = {}): CheckResult {
  const strict = options.strict ?? false;
  let enforced: PhaseReport[];
  let inProgress: PhaseReport | undefined;
  if (options.phase) {
    const phase = report.phases.find((p) => p.id === options.phase);
    if (!phase) throw new UnknownPhaseError(options.phase, report.phases.map((p) => p.id));
    enforced = [phase];
  } else {
    enforced = report.phases.filter((p) => p.position === 'before');
    inProgress = report.phases.find((p) => p.position === 'current');
  }
  const failures = enforced.flatMap((p) => p.gates.filter((g) => countsAsFailure(g, strict)).map((gate) => ({ phase: p.id, gate })));
  return { ok: failures.length === 0, strict, enforced, ...(inProgress ? { inProgress } : {}), failures };
}

// ---------------------------------------------------------------------------
// next

export type NextKind = 'skipped-phase' | 'current-phase' | 'advance' | 'recommended' | 'complete';

export interface NextStep {
  kind: NextKind;
  phase: string;
  title: string;
  message: string;
  gate?: GateReport;
  hint?: string;
}

/**
 * The single most important missing thing, in priority order:
 * 1. a required gate failing in a phase the team has already moved past;
 * 2. a required gate failing in the current phase;
 * 3. the current phase is complete, so move `current` forward;
 * 4. on the last phase, a failing recommended gate;
 * 5. nothing: everything passes.
 */
export function nextStep(report: ProjectReport): NextStep {
  const first = (p: PhaseReport, level: GateLevel) => p.gates.find((g) => g.status === 'fail' && g.level === level);
  const describeGate = (g: GateReport) => `${g.label}: ${g.message}`;

  for (const p of report.phases.filter((ph) => ph.position === 'before')) {
    const gate = first(p, 'required');
    if (gate) {
      return {
        kind: 'skipped-phase',
        phase: p.id,
        title: p.title,
        message: `The ${p.id} phase was skipped. ${describeGate(gate)}`,
        gate,
        ...(gate.hint ? { hint: gate.hint } : {}),
      };
    }
  }

  const index = report.phases.findIndex((p) => p.position === 'current');
  const current = report.phases[index] as PhaseReport;
  const gate = first(current, 'required');
  if (gate) {
    return {
      kind: 'current-phase',
      phase: current.id,
      title: current.title,
      message: describeGate(gate),
      gate,
      ...(gate.hint ? { hint: gate.hint } : {}),
    };
  }

  const following = report.phases[index + 1];
  if (following) {
    return {
      kind: 'advance',
      phase: following.id,
      title: following.title,
      message: `Every required gate in ${current.id} passes. Set \`current: ${following.id}\` in ${report.config} and start the ${following.id} phase.`,
    };
  }

  for (const p of report.phases) {
    const rec = first(p, 'recommended');
    if (rec) {
      return {
        kind: 'recommended',
        phase: p.id,
        title: p.title,
        message: `All required gates pass. Recommended: ${describeGate(rec)}`,
        gate: rec,
        ...(rec.hint ? { hint: rec.hint } : {}),
      };
    }
  }

  return {
    kind: 'complete',
    phase: current.id,
    title: current.title,
    message: 'Every gate passes. Keep the phase documents current as the project changes, and revisit them after each incident.',
  };
}
