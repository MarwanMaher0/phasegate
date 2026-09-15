// Bundles the CLI and the GitHub Action into self-contained ESM files in dist/.
// Teaching content (phases/) and templates (templates/) are read from disk at
// runtime, relative to the package root, so they are not embedded.
import { build } from 'esbuild';
import { chmodSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

// Some bundled dependencies still call require(); give ESM output a require().
const requireShim = "import { createRequire as __phasegateCreateRequire } from 'node:module';\nconst require = __phasegateCreateRequire(import.meta.url);";

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  legalComments: 'none',
  logLevel: 'warning',
};

await build({
  ...common,
  entryPoints: ['src/cli.ts'],
  outfile: 'dist/cli.js',
  banner: { js: `#!/usr/bin/env node\n${requireShim}` },
});
chmodSync('dist/cli.js', 0o755);

await build({
  ...common,
  entryPoints: ['src/action-main.ts'],
  outfile: 'dist/action.js',
  banner: { js: requireShim },
});

console.log('built dist/cli.js and dist/action.js');
