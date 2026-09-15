# Contributing to phasegate

Bug reports, new gate ideas and small, focused pull requests are all welcome.

## Set up

Node 20 or later.

```bash
git clone https://github.com/MarwanMaher0/phasegate.git
cd phasegate
npm ci
npm run build
node dist/cli.js --help
```

## Run the checks

CI runs these on Node 20 and 22. Run them before you push:

```bash
npm run lint
npm run typecheck
npm test           # Vitest, test/
npm run build      # rebuilds dist/cli.js and dist/action.js
```

CI also fails if `dist/` differs from a fresh build, and runs the built CLI end to end in an
empty directory (`init`, `status`, `next`, `check`). **Commit `dist/` with your source change**:
the GitHub Action runs straight from it.

## Where things live

- `src/config.ts` loads and validates `phasegate.config.yaml`.
- `src/gates.ts` has one evaluator per gate type; `src/markdown.ts` finds headings, sections
  and checklists, and ignores guidance comments.
- `src/evaluate.ts` decides which phases are enforced and what the next step is.
- `src/cli.ts` and `src/commands.ts` are the CLI; `src/action.ts` is the GitHub Action.
- `phases/` is the teaching text behind `phasegate explain`; `templates/` is what `init` writes.

## Style

- ESLint and `tsc` are the style guide.
- Dependencies are pinned to exact versions. A new dependency needs a good reason.
- No network access and no telemetry.
- `status` and `next` never run `command` gates unless `--run-commands` is passed. Keep it
  that way.
- A new gate type needs validation in `src/config.ts`, an evaluator in `src/gates.ts`, a row
  in the README's gate table, and tests.
- This repository checks its own phase documents in `docs/phases/` with its own Action, so a
  change to what a gate accepts shows up there too.

## Propose a change

1. For anything bigger than a small fix, open an issue first so the approach is agreed before
   you write code. The roadmap lives in the open issues.
2. Branch from `main`, keep the pull request to one change, and fill in the template.
3. CI must be green before review.

Security problems go through [SECURITY.md](SECURITY.md), not a public issue.
