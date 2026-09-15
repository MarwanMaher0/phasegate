# Operate

> When it breaks, can someone who did not build it fix it, and will we learn from it?

## Purpose

Operate starts the moment people depend on the system, and it never really ends. Its artifacts are written for a tired person under pressure: a runbook that says what the service is, what each alert means and what to do about it, how to recover, and whom to escalate to; and a blameless post-incident template, so that when something breaks the team learns from it instead of only recovering. Operating well is also how the success metrics from discover actually get measured, which closes the loop back to where the project started.

## Artifacts

- `runbook.md`: service overview, dashboards and logs, alerts and responses, recovery procedures, escalation and routine maintenance.
- `post-incident-template.md`: a blameless review format covering impact, timeline, contributing factors and follow-up actions.

## Gate criteria

- The runbook exists and its **Service overview**, **Alerts**, **Recovery procedures** and **Escalation** sections contain real text.
- The post-incident template exists (recommended).
- No `TODO` or `TBD` markers are left in the runbook.

## How teams skip it (and pay later)

The system is treated as finished at launch and its builders move on to the next project. The first alert fires at night for someone who did not build it, and there is nothing to read. Recovery depends on the one person who remembers the right commands. Incidents are fixed but never reviewed, so the same failure returns in a slightly different shape. The success metrics from discover are never checked, so nobody can say whether the project achieved what it set out to do.
