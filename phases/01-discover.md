# Discover

> Is this problem worth solving, for whom, and how will we know it worked?

## Purpose

Discover is where you check that the problem is real before anyone designs a solution. You talk to the people who have the problem, write down what hurts and what it costs them today, and agree on a small number of measurable signals that will tell you whether the project succeeded. The output is short on purpose: a one-page problem statement that a newcomer could read in five minutes and explain back. If you cannot write that page, you are not ready to gather requirements, because every requirement would be a guess about a problem nobody has pinned down.

## Artifacts

- `problem-statement.md`: who has the problem, what it costs them today, what they do instead, and what is out of scope.
- Success metrics: two to four measurable signals, each with a baseline, a target, and how it will be measured.

## Gate criteria

- The problem statement exists.
- The **Problem**, **Who is affected** and **Success metrics** sections contain real text (guidance comments do not count).
- No `TODO` or `TBD` markers are left in the document.

## How teams skip it (and pay later)

The team starts from a solution ("we need a dashboard") instead of a problem ("support spends two hours a day answering the same status question"). Nothing looks wrong for months: features ship and demos go well. Then launch comes and usage is flat, because what was built solves a problem the users did not have, or did not rank highly. With no success metric agreed up front, nobody can say whether the project worked, so it drifts on and collects maintenance cost. An afternoon of interviews and one written metric would have cost far less than a quarter spent building the wrong thing.
