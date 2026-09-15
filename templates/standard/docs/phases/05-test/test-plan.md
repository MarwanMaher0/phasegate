# Test plan

<!--
phasegate guidance: TEST
Decide what evidence will convince you the system works before you start
collecting it. Keep the plan short and keep it current: update it when
requirements change.
Why this phase exists: npx phasegate explain test
-->

## Scope

<!--
What is being tested in this release or iteration, and what is not (and why).
-->

## Requirement coverage

<!--
Map every requirement to how it is verified. A list works well:

- REQ-1: unit tests in orders/status.test.ts, plus end-to-end test "orders page shows status"
- REQ-2: end-to-end test "anonymous visitor is sent to sign-in"
- REQ-7: load test with 200 orders, p95 under 2 s on a throttled 4G profile

If a requirement has no automated test, say how it is checked manually and by whom.
-->

## Test levels

<!--
Unit, integration, end-to-end and manual exploratory testing: what each level
covers and where it runs (locally, CI, staging).
-->

## Environments and test data

<!--
Where tests run and with what data. Production-sized data? An anonymised copy?
Seeded fixtures? Real devices and browsers?
-->

## Non-functional testing

<!--
Performance, security, accessibility and compatibility. The targets come from
the non-functional requirements.
-->

## Exit criteria

<!--
The conditions under which testing is finished and the release can go ahead.
For example:

- Every REQ-n has a passing automated test or a signed-off manual check
- No open severity 1 or severity 2 defects
- p95 page load under 2 seconds in the load test
-->

## Risks

<!--
What could make this plan fail? Missing environments, flaky tests, areas that
are hard to test, people who are unavailable.
-->
