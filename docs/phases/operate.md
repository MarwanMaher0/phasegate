# Operate

## If it breaks

- A gate gives a wrong result: run `phasegate check --json` to see each gate's raw status and details, then reproduce it with a test in `test/gates.test.ts` before fixing.
- The Action fails to start: confirm `dist/action.js` is committed and up to date; CI fails if `npm run build` changes it.
- A user needs the previous behaviour: point the workflow at an earlier tag, for example `uses: MarwanMaher0/phasegate@v0.1.0`.
