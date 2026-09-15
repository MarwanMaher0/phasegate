# Build

> Is what we are building staying shippable, and does it trace back to what was asked for?

## Purpose

Build is the phase every team already does, so its gate is not about writing code. It is about the habits that keep the code shippable: every change goes through version control, review and automated checks, and the work maps back to the requirements and decisions made earlier. A definition of done is a short checklist the team agrees on, so that "done" means the same thing to everyone (merged, tested, documented where it matters) rather than "works on my machine". Build rarely fails outright. It fails slowly, by piling up untested and untraced work that makes every later phase slower and riskier.

## Artifacts

- `definition-of-done.md`: a checklist of the engineering practices that must hold before the build is called complete.
- Optionally, a command gate that runs your test suite (off by default).

## Gate criteria

- The definition of done exists.
- Every checklist item is ticked. If an item genuinely does not apply, tick it and add a note saying why.
- Optional: a configured command such as `npm test` exits with code 0.

## How teams skip it (and pay later)

The team treats "it worked in the demo" as done. There is no CI yet, tests are "coming later", and the password reset requirement quietly fell off the list because nobody traced the work back to it. None of this is visible in the build phase itself. It is paid for in test and release, where the same gaps are more expensive to find, harder to fix, and discovered under deadline pressure.
