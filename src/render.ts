import { countsAsFailure, type CheckResult, type GateReport, type NextStep, type PhaseReport, type PhaseState, type ProjectReport } from './evaluate.js';

export interface Colors {
  enabled: boolean;
  bold: (s: string) => string;
  dim: (s: string) => string;
  red: (s: string) => string;
  green: (s: string) => string;
  yellow: (s: string) => string;
  cyan: (s: string) => string;
}

const wrap = (on: boolean, open: number, close: number) => (s: string) => (on ? `[${open}m${s}[${close}m` : s);

export function makeColors(enabled: boolean): Colors {
  return {
    enabled,
    bold: wrap(enabled, 1, 22),
    dim: wrap(enabled, 2, 22),
    red: wrap(enabled, 31, 39),
    green: wrap(enabled, 32, 39),
    yellow: wrap(enabled, 33, 39),
    cyan: wrap(enabled, 36, 39),
  };
}

/**
 * Colour is on only for a TTY, unless FORCE_COLOR is set. `--no-color` and a
 * non-empty NO_COLOR (https://no-color.org) always turn it off.
 */
export function shouldColor(flag: boolean | undefined, env: NodeJS.ProcessEnv, isTTY: boolean): boolean {
  if (flag === false) return false;
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false') return true;
  return isTTY;
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\[[0-9;]*m/g;
export function visibleLength(s: string): number {
  return s.replace(ANSI_RE, '').length;
}
function pad(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - visibleLength(s)));
}

export function table(rows: string[][], gap = 2): string {
  const widths: number[] = [];
  for (const row of rows) row.forEach((cell, i) => (widths[i] = Math.max(widths[i] ?? 0, visibleLength(cell))));
  return rows
    .map((row) =>
      row
        .map((cell, i) => (i === row.length - 1 ? cell : pad(cell, (widths[i] ?? 0) + gap)))
        .join('')
        .trimEnd(),
    )
    .join('\n');
}

const STATE_LABEL: Record<PhaseState, string> = {
  done: 'done',
  skipped: 'skipped',
  'in-progress': 'in progress',
  upcoming: 'upcoming',
};

function stateCell(state: PhaseState, c: Colors): { mark: string; label: string } {
  switch (state) {
    case 'done':
      return { mark: c.green('✔'), label: c.green(STATE_LABEL[state]) };
    case 'skipped':
      return { mark: c.red('✘'), label: c.red(c.bold(STATE_LABEL[state])) };
    case 'in-progress':
      return { mark: c.yellow('▶'), label: c.yellow(STATE_LABEL[state]) };
    case 'upcoming':
      return { mark: c.dim('·'), label: c.dim(STATE_LABEL[state]) };
  }
}

function gateMark(g: GateReport, strict: boolean, c: Colors): string {
  if (g.status === 'pass') return c.green('✔');
  if (g.status === 'skip') return c.dim('-');
  return g.level === 'required' || strict ? c.red('✘') : c.yellow('!');
}

function ratio(n: number, total: number, c: Colors): string {
  const text = `${n}/${total}`;
  if (total === 0) return c.dim('-');
  return n === total ? c.green(text) : text;
}

function gateLines(g: GateReport, strict: boolean, c: Colors, indent: string): string[] {
  const level = g.level === 'recommended' ? c.dim(' (recommended)') : '';
  const lines = [`${indent}${gateMark(g, strict, c)} ${g.label}${level}`];
  if (g.status !== 'pass') {
    lines.push(`${indent}    ${c.dim(g.message)}`);
    for (const d of g.details) lines.push(`${indent}    ${c.dim(d)}`);
    if (g.hint && g.status === 'fail') lines.push(`${indent}    ${c.cyan('hint:')} ${g.hint}`);
  }
  return lines;
}

export function renderStatus(report: ProjectReport, next: NextStep, c: Colors): string {
  const out: string[] = [];
  out.push(`${c.bold('phasegate status')}  ${c.dim(report.config)}`);
  const current = report.phases.find((p) => p.position === 'current') as PhaseReport;
  out.push(`Current phase: ${c.bold(current.title)}${current.question ? c.dim(`  ${current.question}`) : ''}`);
  out.push('');

  const rows = [[' ', c.dim('PHASE'), c.dim('ARTIFACTS'), c.dim('GATES'), c.dim('STATE')]];
  for (const p of report.phases) {
    const { mark, label } = stateCell(p.state, c);
    const present = p.artifacts.filter((a) => a.present).length;
    const gatesPassing = p.summary.passed;
    const name = p.position === 'current' ? c.bold(`${p.id} ◀`) : p.id;
    const extra = p.summary.recommendedFailed > 0 ? c.dim(` (+${p.summary.recommendedFailed} recommended)`) : '';
    rows.push([mark, name, ratio(present, p.artifacts.length, c), ratio(gatesPassing, p.summary.gates, c), label + extra]);
  }
  out.push(table(rows));

  const attention = report.phases.filter((p) => p.position !== 'after' && p.gates.some((g) => g.status === 'fail'));
  if (attention.length > 0) {
    out.push('');
    out.push(c.bold('Failing gates'));
    for (const p of attention) {
      out.push(`  ${p.state === 'skipped' ? c.red(p.id) : c.yellow(p.id)}`);
      for (const g of p.gates.filter((x) => x.status === 'fail')) {
        const level = g.level === 'recommended' ? c.dim(' (recommended)') : '';
        out.push(`    ${gateMark(g, false, c)} ${g.label}${level}`);
        out.push(`        ${c.dim(g.message)}`);
      }
    }
  }

  out.push('');
  out.push(`${c.bold('Next:')} ${next.message}`);
  out.push(c.dim(`Why it matters: phasegate explain ${next.phase}`));
  return out.join('\n');
}

export function renderCheck(result: CheckResult, c: Colors): string {
  const out: string[] = [];
  if (result.enforced.length === 0) {
    out.push(c.dim('No phases before the current one, so there is nothing to enforce yet.'));
  }
  for (const p of result.enforced) {
    const failing = p.gates.filter((g) => countsAsFailure(g, result.strict)).length;
    const head = failing === 0 ? c.green('✔') : c.red('✘');
    out.push(`${head} ${c.bold(p.id)} ${c.dim(`${p.summary.passed}/${p.summary.gates} gates passing`)}`);
    for (const g of p.gates) out.push(...gateLines(g, result.strict, c, '  '));
  }
  if (result.inProgress) {
    const p = result.inProgress;
    out.push('');
    out.push(
      `${c.yellow('▶')} ${c.bold(p.id)} ${c.dim(`(current phase, not enforced) ${p.summary.passed}/${p.summary.gates} gates passing`)}`,
    );
  }
  out.push('');
  if (result.ok) {
    out.push(c.green(c.bold('phasegate check passed')) + (result.strict ? c.dim(' (strict)') : ''));
  } else {
    const phases = new Set(result.failures.map((f) => f.phase)).size;
    out.push(
      c.red(c.bold(`phasegate check failed: ${result.failures.length} gate${result.failures.length === 1 ? '' : 's'} in ${phases} phase${phases === 1 ? '' : 's'}`)) +
        (result.strict ? c.dim(' (strict)') : ''),
    );
    out.push(c.dim(`Run \`phasegate explain ${result.failures[0]?.phase}\` to see why this phase matters.`));
  }
  return out.join('\n');
}

export function renderNext(next: NextStep, c: Colors): string {
  const out: string[] = [];
  const tag: Record<NextStep['kind'], string> = {
    'skipped-phase': c.red(c.bold('Skipped phase')),
    'current-phase': c.yellow(c.bold('Next')),
    advance: c.green(c.bold('Phase complete')),
    recommended: c.cyan(c.bold('Recommended')),
    complete: c.green(c.bold('All gates pass')),
  };
  out.push(`${tag[next.kind]} ${c.dim(`[${next.phase}]`)}`);
  out.push(next.message);
  if (next.gate) for (const d of next.gate.details) out.push(`  ${c.dim(d)}`);
  if (next.hint) out.push(`${c.cyan('hint:')} ${next.hint}`);
  out.push(c.dim(`Why it matters: phasegate explain ${next.phase}`));
  return out.join('\n');
}

/** Light terminal rendering of teaching Markdown: bold headings, dim quotes. */
export function renderMarkdown(md: string, c: Colors): string {
  return md
    .trimEnd()
    .split('\n')
    .map((line) => {
      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) return h[1] === '#' ? c.bold(c.cyan((h[2] ?? '').toUpperCase())) : c.bold(h[2] ?? '');
      if (line.startsWith('> ')) return c.dim(line.slice(2));
      return line.replace(/\*\*(.+?)\*\*/g, (_, t: string) => c.bold(t)).replace(/`([^`]+)`/g, (_, t: string) => c.cyan(t));
    })
    .join('\n');
}

export function renderSummaryMarkdown(result: CheckResult): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const icon = (g: GateReport) => (g.status === 'pass' ? '✅' : g.status === 'skip' ? '⏭️' : g.level === 'required' || result.strict ? '❌' : '⚠️');
  const lines: string[] = [];
  lines.push(`## phasegate ${result.ok ? 'passed' : 'failed'}${result.strict ? ' (strict)' : ''}`);
  lines.push('');
  if (result.enforced.length === 0) {
    lines.push('No phases before the current one, so there is nothing to enforce yet.');
    lines.push('');
  } else {
    lines.push('| Phase | Gate | Level | Result | Details |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const p of result.enforced) {
      for (const g of p.gates) {
        const details = [g.message, ...g.details].map(esc).join('<br>');
        lines.push(`| ${p.id} | ${esc(g.label)} | ${g.level} | ${icon(g)} ${g.status} | ${details} |`);
      }
    }
    lines.push('');
  }
  if (result.inProgress) {
    const p = result.inProgress;
    lines.push(`Current phase **${p.id}** (not enforced): ${p.summary.passed}/${p.summary.gates} gates passing.`);
    lines.push('');
  }
  if (!result.ok) {
    lines.push(`${result.failures.length} failing gate(s). Run \`npx phasegate next\` locally for the most important fix.`);
  }
  return lines.join('\n') + '\n';
}
