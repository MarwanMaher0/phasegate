# Design

> Which hard-to-reverse choices are we making, and why?

## Purpose

Design is where you choose how to build the thing and write down why. Every project makes a handful of decisions that are expensive to reverse, such as the data model, where it runs, the main framework, what is synchronous and what is queued, and what to build versus buy. Each one deserves a short Architecture Decision Record (ADR): the context, the options you considered, what you chose, and the consequences you accept. ADRs are not approval forms. They exist so that the person who joins in a year, often you, can tell a deliberate trade-off from an accident, and so that the team argues about a decision once, on paper, instead of again in every pull request.

## Artifacts

- `adr/NNNN-short-title.md`: one ADR per significant decision, written from `adr/template.md`.

## Gate criteria

- At least one ADR exists (the template itself is excluded).
- Every ADR has the status **Accepted** or **Superseded**. A Proposed ADR is a decision that has not been made yet.
- No `TODO` or `TBD` markers are left in the ADRs.

## How teams skip it (and pay later)

The decisions still get made, just invisibly: in someone's head, in a chat thread, or by whichever pull request happens to land first. Six months later the database is struggling and nobody remembers why it was picked, what else was considered, or which of the original constraints still hold. The team either lives with a choice it no longer understands or rewrites it without knowing what the original author knew. Teams that do write decisions down often skip the consequences, recording what they chose but not what it costs, so the costs arrive later as surprises.
