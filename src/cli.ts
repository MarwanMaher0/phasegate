import { Command, Option } from 'commander';
import { VERSION } from './assets.js';
import { checkCommand, EXIT, explain, init, next, status, type CommandResult } from './commands.js';
import { shouldColor } from './render.js';

function emit(result: CommandResult): void {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.code;
}

interface Flags {
  config?: string;
  color?: boolean;
  json?: boolean;
  strict?: boolean;
  phase?: string;
  runCommands?: boolean;
  profile?: string;
  force?: boolean;
}

function common(flags: Flags) {
  return {
    cwd: process.cwd(),
    ...(flags.config ? { config: flags.config } : {}),
    color: shouldColor(flags.color, process.env, Boolean(process.stdout.isTTY)),
  };
}

const program = new Command();
program
  .name('phasegate')
  .description('Walk a project through its phases, discover to operate, and check the gates that show each phase is really done.')
  .version(VERSION)
  .showHelpAfterError()
  .addHelpText(
    'after',
    '\nExit codes: 0 ok, 1 gates failing (check), 2 usage or configuration error.\nNo network access and no telemetry.',
  );

const withConfig = (cmd: Command) =>
  cmd.option('-c, --config <path>', 'path to phasegate.config.yaml').option('--no-color', 'disable colour (NO_COLOR is also respected)');

program
  .command('init')
  .description('write phasegate.config.yaml and docs/phases/ templates (never overwrites without --force)')
  .addOption(new Option('-p, --profile <profile>', 'template set').choices(['small', 'standard']).default('standard'))
  .option('-f, --force', 'overwrite files that already exist')
  .action((flags: Flags) => emit(init({ cwd: process.cwd(), profile: flags.profile ?? 'standard', force: Boolean(flags.force) })));

withConfig(program.command('status'))
  .description('show each phase: artifacts present, gates passing, and the current phase')
  .option('--json', 'machine-readable output')
  .option('--run-commands', 'also run command gates (they are skipped by default here)')
  .action((flags: Flags) => emit(status({ ...common(flags), json: Boolean(flags.json), runCommands: Boolean(flags.runCommands) })));

withConfig(program.command('check'))
  .description('evaluate gates; exits 1 if any fail. Default: every phase before `current`')
  .option('--phase <id>', 'check only this phase')
  .option('--strict', 'recommended gates fail the check too')
  .option('--json', 'machine-readable output')
  .action((flags: Flags) =>
    emit(
      checkCommand({
        ...common(flags),
        ...(flags.phase ? { phase: flags.phase } : {}),
        strict: Boolean(flags.strict),
        json: Boolean(flags.json),
      }),
    ),
  );

withConfig(program.command('explain'))
  .argument('<phase>', 'phase id, for example design')
  .description('why a phase exists, what it produces, and how teams skip it')
  .action((phase: string, flags: Flags) => emit(explain(phase, common(flags))));

withConfig(program.command('next'))
  .description('the single most important missing thing')
  .option('--json', 'machine-readable output')
  .option('--run-commands', 'also run command gates')
  .action((flags: Flags) => emit(next({ ...common(flags), json: Boolean(flags.json), runCommands: Boolean(flags.runCommands) })));

program.exitOverride((err) => {
  process.exit(err.exitCode === 0 ? EXIT.ok : EXIT.error);
});

try {
  await program.parseAsync(process.argv);
} catch (e) {
  process.stderr.write(`phasegate: ${(e as Error).stack ?? String(e)}\n`);
  process.exitCode = EXIT.error;
}
