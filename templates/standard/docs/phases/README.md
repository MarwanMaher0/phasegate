# Project phases

This folder holds one lightweight document per phase of the project. Together they
are the evidence that each phase was actually done, not just talked about.

| # | Phase        | Document                                        |
|---|--------------|-------------------------------------------------|
| 1 | Discover     | `01-discover/problem-statement.md`              |
| 2 | Requirements | `02-requirements/requirements.md`               |
| 3 | Design       | `03-design/adr/` (one ADR per decision)         |
| 4 | Build        | `04-build/definition-of-done.md`                |
| 5 | Test         | `05-test/test-plan.md`                          |
| 6 | Release      | `06-release/release-checklist.md`               |
| 7 | Operate      | `07-operate/runbook.md`, `post-incident-template.md` |

Text inside HTML comments is guidance. The gates ignore it, so a section that
contains only guidance counts as empty until you write something of your own.

Useful commands:

- `npx phasegate status` shows where the project is.
- `npx phasegate next` names the single most important missing thing.
- `npx phasegate explain <phase>` explains why a phase exists and how teams skip it.
- `npx phasegate check` is what CI runs.

The phase the team is currently in is set by `current:` in `phasegate.config.yaml`.
