# Requirements

<!--
phasegate guidance: REQUIREMENTS
Give every requirement its own heading that starts with an ID, for example
"### REQ-1 Customer can see order status". Under each one, write at least one
acceptance criterion as Given / When / Then. The acceptance-criteria gate checks
that every REQ-n heading has one.
Why this phase exists: npx phasegate explain requirements
-->

## Context

<!--
One or two sentences linking back to the problem statement and the success
metrics. Requirements that do not serve the problem belong under Non-goals.
-->

## Functional requirements

<!--
Example (copy it outside this comment, then replace it):

### REQ-1 Customer can see order status without contacting support

A signed-in customer can see the current status of each of their orders.

- **Given** a signed-in customer with an order in the "shipped" state
  **When** they open the Orders page
  **Then** the order shows "Shipped" with the carrier's tracking link

- **Given** a visitor who is not signed in
  **When** they open the Orders page
  **Then** they are asked to sign in and brought back to the Orders page afterwards

Tips:
- One behaviour per requirement. If the title needs "and", consider splitting it.
- Criteria describe behaviour someone can observe, not implementation.
- Include the unhappy paths: errors, empty states, permissions, limits.
-->

## Non-functional requirements

<!--
Performance, security, privacy, accessibility, reliability, cost. Give each one
an ID and a Given / When / Then with real numbers. For example:

### REQ-7 Orders page is fast on a mid-range phone

- **Given** a customer with 200 orders on a throttled 4G connection
  **When** they open the Orders page
  **Then** the first page of orders renders in under 2 seconds at the 95th percentile
-->

## Non-goals

<!--
Things this project deliberately will not do, at least for now. Each non-goal
written here saves an argument later.
-->
