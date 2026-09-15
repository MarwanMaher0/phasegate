# Post-incident review: short title

<!--
phasegate guidance: OPERATE (post-incident review)
Copy this file for each incident, for example to incidents/2026-03-14-orders-outage.md,
and hold the review within a week while memories are fresh.
Keep it blameless: describe what happened and why the system allowed it, not
who is at fault. People acted on the information they had at the time.
-->

## Summary

<!-- Two or three sentences: what broke, for how long, and how it was resolved. -->

## Impact

<!-- Who was affected and how: users, requests, revenue, data. Use numbers. -->

## Timeline

<!--
Times in one time zone, from the first sign of trouble to full recovery. For example:

- 14:02 deploy of v1.4.0 completes
- 14:09 error rate alert fires
- 14:21 rollback started
- 14:30 error rate back to normal
-->

## Contributing factors

<!--
The conditions that made this possible. There is rarely a single root cause:
look at the change itself, missing tests, missing alerts and unclear runbooks.
-->

## What went well

<!-- What helped: an alert that fired early, a rollback that worked, clear communication. -->

## Follow-up actions

<!--
Each action makes the failure less likely or less harmful, and has an owner and
a due date. For example:

- [ ] Add an alert on checkout error rate (owner: Sam, due 2026-03-21)
-->

## Lessons for the phases

<!--
Which phase would have caught this earlier? A missing requirement, an untested
path, a release checklist item that was skipped, an alert that did not exist?
Update that phase's document so the lesson outlives this review.
-->
