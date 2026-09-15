# Discover

## Problem

Software projects rarely fail during the build. They fail in the phases people skip: nobody wrote down
what "done" means, a hard-to-reverse decision was made in a pull request comment, or a release went out
with no rollback plan. Process documents exist, but nothing checks them, so they drift into empty
templates. Developers early in their careers often do not know these phases exist at all.

## Success metric

A team can add phasegate to a repository in under five minutes, and its CI fails when a phase the team
has moved past is still incomplete, pointing at the exact file and line to fix.
