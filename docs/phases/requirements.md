# Requirements

## REQ-1 Scaffold phase documents

- Given an empty repository
  When I run `phasegate init`
  Then a config and one guided template per phase are written, and nothing existing is overwritten

## REQ-2 Show where the project stands

- Given a repository with a phasegate config
  When I run `phasegate status`
  Then I see every phase with its artifacts, passing gates and state, and the single next step

## REQ-3 Fail CI on skipped phases

- Given the config says the team is in the build phase
  When a gate in an earlier phase fails
  Then `phasegate check` exits 1 and names the file, line and reason

## REQ-4 Teach why each phase exists

- Given any phase name
  When I run `phasegate explain <phase>`
  Then I read its purpose, what it produces, and how teams usually skip it

## REQ-5 Run in GitHub Actions without extra dependencies

- Given a workflow that uses the phasegate Action
  When gates fail
  Then the job fails with file annotations and a summary table
