# Security policy

## Supported versions

Security fixes go into `main` and the next release. Please check that the problem still exists
on the latest release or on `main` before reporting it.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub:

1. Open the [Security tab](https://github.com/MarwanMaher0/phasegate/security) of this repository.
2. Choose **Report a vulnerability**
   ([direct link](https://github.com/MarwanMaher0/phasegate/security/advisories/new)).
3. Include the version or commit, the steps to reproduce, and what an attacker could do with it.

You will get a reply in the advisory thread, updates while a fix is prepared, and credit in the
published advisory unless you would rather not be named.

## Scope

In scope, for example:

- `status` or `next` running a `command` gate without `--run-commands`;
- text from a config or phase document that injects workflow commands or markup into the
  Action's annotations or job summary.

Out of scope: `check` and the Action run the shell commands in your `command` gates. That is
what the gate is for, so treat `phasegate.config.yaml` like any other CI script and review
changes to it.
