import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach } from 'vitest';

const created: string[] = [];

afterEach(() => {
  while (created.length > 0) rmSync(created.pop() as string, { recursive: true, force: true });
});

/** Creates a throwaway project directory containing the given files. */
export function project(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'phasegate-test-'));
  created.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

/** A minimal, valid config with two phases. */
export const TWO_PHASES = `version: 1
current: build
phases:
  - id: design
    gates:
      - type: file-exists
        path: docs/adr.md
  - id: build
    gates:
      - type: checklist
        path: docs/done.md
`;
