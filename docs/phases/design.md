# Design

## Decisions

- Markdown and YAML instead of a database or web app: phase documents live in the repository, reviewed in pull requests like code.
- A small purpose-built Markdown reader instead of a full parser: phasegate needs headings, sections, comments, checklists and code fences only, and a small reader keeps the bundle dependency-light.
- Guidance lives in HTML comments: templates can teach without the guidance itself counting as content.
- `check` enforces phases before `current` only: the phase you are working in is allowed to be unfinished.
- Command gates are off by default and skipped by `status`: reading status must never run arbitrary commands.
- The Action writes workflow commands directly instead of depending on @actions/core: fewer dependencies to audit.
- No network access and no telemetry, by design.
