# Test

> What evidence will convince us it works, and have we collected it?

## Purpose

Test is about deciding in advance what evidence will convince you the system works, and then collecting that evidence. A test plan maps each requirement to how it will be verified (unit, integration, end-to-end or manual exploratory testing), names the environments and data you will test with, and states the exit criteria: the conditions under which you stop testing and call the system releasable. Writing the plan before testing forces the uncomfortable questions early. How do we test with realistic data? Who tries it on a slow phone? What is the performance target, and how will we measure it?

## Artifacts

- `test-plan.md`: scope, requirement coverage, test levels, environments and test data, non-functional testing, exit criteria and risks.

## Gate criteria

- The test plan exists.
- The **Scope**, **Requirement coverage** and **Exit criteria** sections contain real text.
- No `TODO` or `TBD` markers are left in the document.

## How teams skip it (and pay later)

Testing becomes "the developers ran it and it looked fine". Coverage is measured in lines of code rather than requirements, so the untested requirement is the one that breaks. Nobody tests with production-sized data, so a query that takes 40 milliseconds in development takes 40 seconds on launch day. Without exit criteria, testing stops when the deadline arrives rather than when the evidence does, and the team ships on hope.
