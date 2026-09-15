# Release

> If this goes wrong in production, can we undo it, see it, and tell people?

## Purpose

Release is the moment your software meets reality, and this phase exists to make that moment boring. A release checklist makes the team answer four questions before shipping instead of during an incident: how do we roll back, how do data and schema migrations run (and un-run), how will we know within minutes whether the release is healthy, and who needs to know what is changing. None of these questions is hard on a calm afternoon. All of them are hard at two in the morning with users waiting.

## Artifacts

- `release-checklist.md`: rollback plan, migration plan, monitoring and communication, with every item ticked when it is done (or ticked with a note when it does not apply).

## Gate criteria

- The release checklist exists.
- The **Rollback steps** section contains real text.
- Every checklist item is ticked.
- No `TODO` or `TBD` markers are left in the document.

## How teams skip it (and pay later)

The team deploys because the code is ready. The migration turns out to be irreversible and nobody noticed. The rollback plan is "redeploy the old version", which fails because the schema has already changed. The dashboards watch CPU but not the error rate of the new endpoint, so the problem is reported by customers, and support hears about the change from them too. Each skipped item is small. Together they turn a five-minute rollback into a day-long outage with a data repair project attached.
