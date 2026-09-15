import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSION = '0.1.0';

/**
 * Package root. This module lives one directory below it both as source
 * (src/assets.ts) and when bundled (dist/cli.js, dist/action.js).
 */
export function packageRoot(): string {
  return fileURLToPath(new URL('..', import.meta.url));
}

export const PROFILES = ['small', 'standard'] as const;
export type Profile = (typeof PROFILES)[number];

export function templatesDir(profile: Profile): string {
  return join(packageRoot(), 'templates', profile);
}

export interface PhaseGuide {
  id: string;
  title: string;
  question: string;
  markdown: string;
}

function parseGuide(id: string, markdown: string): PhaseGuide {
  const title = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? titleCase(id);
  const question = /^>\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? '';
  return { id, title, question, markdown };
}

export function titleCase(id: string): string {
  return id
    .split('-')
    .map((w) => (w ? (w[0] as string).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Built-in teaching content from phases/NN-<id>.md, or undefined. */
export function builtinGuide(id: string): PhaseGuide | undefined {
  const dir = join(packageRoot(), 'phases');
  if (!existsSync(dir)) return undefined;
  const file = readdirSync(dir).find((f) => f.replace(/^\d+-/, '') === `${id}.md`);
  return file ? parseGuide(id, readFileSync(join(dir, file), 'utf8')) : undefined;
}

export function builtinPhaseIds(): string[] {
  const dir = join(packageRoot(), 'phases');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d+-[a-z-]+\.md$/.test(f))
    .sort()
    .map((f) => f.replace(/^\d+-/, '').replace(/\.md$/, ''));
}

/** A project's own guide file (phase `guide:` key) wins over the built-in one. */
export function guideFor(id: string, root?: string, guidePath?: string): PhaseGuide | undefined {
  if (root && guidePath) {
    const p = resolve(root, guidePath);
    if (existsSync(p)) return parseGuide(id, readFileSync(p, 'utf8'));
  }
  return builtinGuide(id);
}
