import { ConfigError, ConfigNotFoundError, loadConfig } from './config.js';
import { check, evaluateProject, UnknownPhaseError, type CheckResult } from './evaluate.js';
import { makeColors, renderCheck, renderSummaryMarkdown } from './render.js';

/**
 * GitHub Action entry point. Reads inputs from INPUT_* variables and writes
 * workflow commands directly, so it needs no @actions/* dependencies.
 */

export interface ActionEnv {
  [key: string]: string | undefined;
}

export interface ActionIO {
  log: (line: string) => void;
  appendSummary: (path: string, text: string) => void;
}

export function input(env: ActionEnv, name: string): string {
  return (env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] ?? '').trim();
}

export function parseBoolean(value: string, name: string): boolean {
  if (value === '') return false;
  if (['true', 'yes', '1', 'on'].includes(value.toLowerCase())) return true;
  if (['false', 'no', '0', 'off'].includes(value.toLowerCase())) return false;
  throw new Error(`Input "${name}" must be true or false, got "${value}".`);
}

function escapeData(s: string): string {
  return s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
function escapeProperty(s: string): string {
  return escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

export function annotations(result: CheckResult): string[] {
  return result.failures.map(({ phase, gate }) => {
    const file = gate.path && !/[*?]/.test(gate.path) ? `file=${escapeProperty(gate.path)},` : '';
    return `::error ${file}title=${escapeProperty(`phasegate: ${phase}`)}::${escapeData(`${gate.label}: ${gate.message}`)}`;
  });
}

export function runAction(env: ActionEnv, cwd: string, io: ActionIO): number {
  try {
    const phase = input(env, 'phase');
    const strict = parseBoolean(input(env, 'strict'), 'strict');
    const configPath = input(env, 'config');
    const loaded = loadConfig(cwd, configPath || undefined);
    const report = evaluateProject(loaded, { runCommands: true, cwd });
    const result = check(report, { ...(phase ? { phase } : {}), strict });

    io.log(renderCheck(result, makeColors(true)));
    for (const line of annotations(result)) io.log(line);
    if (env.GITHUB_STEP_SUMMARY) io.appendSummary(env.GITHUB_STEP_SUMMARY, renderSummaryMarkdown(result));
    return result.ok ? 0 : 1;
  } catch (e) {
    const known = e instanceof ConfigError || e instanceof ConfigNotFoundError || e instanceof UnknownPhaseError;
    io.log(`::error title=phasegate::${escapeData(known ? e.message : ((e as Error).stack ?? String(e)))}`);
    if (env.GITHUB_STEP_SUMMARY) {
      io.appendSummary(env.GITHUB_STEP_SUMMARY, `## phasegate could not run\n\n\`\`\`\n${(e as Error).message}\n\`\`\`\n`);
    }
    return 2;
  }
}
