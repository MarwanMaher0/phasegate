# Runbook

<!--
phasegate guidance: OPERATE
Write this for someone who is woken at 3 a.m. by an alert and did not build the
system. Prefer exact commands and direct links over prose. Review it after
every incident.
Why this phase exists: npx phasegate explain operate
-->

## Service overview

<!--
What the service does, who uses it, what it depends on (databases, queues,
third-party APIs) and what depends on it. Link the relevant ADRs.
-->

## Dashboards and logs

<!-- Where to look first, as direct links. -->

## Alerts

<!--
One entry per alert: what it means, how urgent it is, what to check first, and
how to fix it. For example:

### HighErrorRate (orders-api)

- Means: more than 2% of requests failed over 5 minutes
- Urgency: page the on-call engineer at any hour
- Check first: the error dashboard, and whether anything was deployed in the last hour
- Fix: if a deploy happened recently, roll back (see Recovery procedures)
-->

## Recovery procedures

<!--
Rollback, restart, failover and restore from backup, with the exact commands.
When was a backup last restored as a test?
-->

## Escalation

<!--
Who to contact when this runbook is not enough: the on-call rotation, owners of
dependencies, vendor support, and how to reach each of them.
-->

## Routine maintenance

<!--
Recurring work that keeps the service healthy: certificate renewals, dependency
updates, data retention jobs, cost reviews.
-->
