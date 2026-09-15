# Definition of done

<!--
phasegate guidance: BUILD
This is the team's shared meaning of "done" for the build phase. Adjust the
list together, then tick items as they become true. If an item genuinely does
not apply, tick it and add a short note saying why, for example
"n/a: the project stores no secrets". The checklist gate requires every item to
be ticked: an unticked box is an unanswered question.
To make your test suite part of this gate, enable the command gate in
phasegate.config.yaml.
Why this phase exists: npx phasegate explain build
-->

## Source control and review

<!-- How changes reach the main branch. -->

- [ ] All code lives in version control and the main branch is protected
- [ ] Every change is reviewed by someone other than its author before it merges

## Automated checks

<!-- What runs automatically on every change. -->

- [ ] CI runs linting, type checks and tests on every pull request
- [ ] The project builds from a clean checkout with one documented command

## Traceability

<!-- Tie the code back to what was asked for and what was decided. -->

- [ ] Every requirement (REQ-n) is implemented, or explicitly deferred with a note in requirements.md
- [ ] Every Accepted ADR is reflected in the code, or has been superseded

## Hygiene

- [ ] No secrets are committed; configuration comes from the environment
- [ ] Dependencies are pinned and the lockfile is committed
- [ ] The README explains how to run the project locally
