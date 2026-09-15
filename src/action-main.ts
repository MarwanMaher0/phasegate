import { appendFileSync } from 'node:fs';
import { runAction } from './action.js';

process.exitCode = runAction(process.env, process.env.GITHUB_WORKSPACE ?? process.cwd(), {
  log: (line) => console.log(line),
  appendSummary: (path, text) => appendFileSync(path, text),
});
