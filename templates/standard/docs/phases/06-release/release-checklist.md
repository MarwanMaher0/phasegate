# Release checklist

<!--
phasegate guidance: RELEASE
Work through this before shipping, not during the incident. Tick each item when
it is done. If an item does not apply, tick it and say why, for example
"n/a: no schema change in this release". The checklist gate requires every box
to be ticked. Copy this file per release if you want a record of each one.
Why this phase exists: npx phasegate explain release
-->

Release: <!-- version or name, for example v1.4.0 -->

Planned date: <!-- YYYY-MM-DD -->

## Rollback plan

- [ ] The rollback steps below have been read by someone other than their author
- [ ] Rollback has been rehearsed, or the reason it cannot be is written down
- [ ] The rollback trigger is agreed: which signal means "roll back", and who decides

### Rollback steps

<!--
How do you undo this release if it goes wrong? Be specific: the commands, who
runs them, how long they take, and what happens to data written in between.
"Redeploy the previous version" is only a plan if the previous version still
works with the current database schema.
-->

## Migration plan

<!--
Schema changes, data backfills, configuration or infrastructure changes.
Prefer expand and contract: add the new structure, deploy code that handles
both, then remove the old structure in a later release.
-->

- [ ] Migrations work with the version currently deployed, or downtime is planned and announced
- [ ] Migrations have been run against a production-sized copy of the data
- [ ] Each migration can be reversed, or there is a tested way to compensate for it

## Monitoring

<!-- How will you know, within minutes, whether this release is healthy? -->

- [ ] Dashboards show the error rate and latency of what changed in this release
- [ ] Alerts cover the new failure modes and reach someone who is on call
- [ ] The success metrics from the discover phase can be measured after release

## Communication

<!-- Who needs to know, before and after? -->

- [ ] Support and on-call know what is changing and when
- [ ] Users are told about visible changes (release notes, changelog or an in-app notice)
- [ ] Stakeholders know the release date and the rollback trigger

## Go / no-go

- [ ] The exit criteria in the test plan are met
- [ ] The release is scheduled for a time when the people who can fix it are available
