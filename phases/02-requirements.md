# Requirements

> What exactly must the system do, and how will we recognise that it does it?

## Purpose

Requirements turn the problem into short, testable statements of what the system must do, each with acceptance criteria written as Given / When / Then examples. The point is not paperwork. It is to surface disagreements while they are still cheap: in a document, instead of in code review or in production. A requirement without an acceptance criterion is a wish. The developer, the tester and the person who asked for it will each picture something different, and each will be right by their own reading. Non-functional requirements such as performance, security, accessibility and cost belong here too, because they are the most expensive ones to retrofit.

## Artifacts

- `requirements.md`: numbered requirements (`REQ-1`, `REQ-2`, ...), each under its own heading with at least one Given / When / Then acceptance criterion.
- Non-goals: what the project deliberately will not do.

## Gate criteria

- The requirements document exists.
- Every requirement heading (`REQ-n`) has at least one acceptance criterion containing a **Given** and a **Then**.
- The **Non-goals** section contains real text.
- No `TODO` or `TBD` markers are left in the document.

## How teams skip it (and pay later)

The ticket says "users can export their data". The developer builds a CSV export of the current page; the person who asked expected a full account export including attachments; the tester checks ten rows while real accounts have two million. Everyone discovers the mismatch at the end, in review, in acceptance testing or from an unhappy customer, and the rework costs many times more than the conversation would have. Teams that skip this phase often say they are being agile, but agile teams write acceptance criteria too; they write them per story, before the work starts.
