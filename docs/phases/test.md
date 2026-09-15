# Test

## How I will know it works

- REQ-1: `test/commands.test.ts` covers both profiles, no-overwrite without `--force`, and an unknown profile.
- REQ-2: `test/evaluate.test.ts` covers phase positions and states and every `next` step kind; `status --json` is checked in `test/commands.test.ts`.
- REQ-3: `test/gates.test.ts` covers every gate type passing and failing with file and line details; `test/evaluate.test.ts` covers enforcement and `--strict`.
- REQ-4: `test/commands.test.ts` covers `explain` with and without a config, and unknown phases.
- REQ-5: `test/action-render-glob.test.ts` covers inputs, annotations, escaping, the job summary and exit codes. This repository also runs the Action on itself.
- Awkward cases: guidance-only sections, markers inside inline code, unclosed comments, globs that match nothing, command timeouts, and invalid YAML.
- CI runs the whole suite on Node 20 and 22, then runs the built CLI end to end in a fresh directory.
