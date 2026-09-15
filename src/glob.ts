import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Minimal glob support for config paths: `*` and `?` within a path segment,
 * `**` across segments. Paths are relative to the project root and use `/`.
 */

const SKIP_DIRS = new Set(['node_modules', '.git']);

export function hasGlob(pattern: string): boolean {
  return /[*?]/.test(pattern);
}

export function toPosix(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function globToRegExp(pattern: string): RegExp {
  const p = toPosix(pattern);
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i] as string;
    if (c === '*') {
      if (p[i + 1] === '*') {
        const atSegmentEnd = p[i + 2] === '/';
        re += atSegmentEnd ? '(?:.*/)?' : '.*';
        i += atSegmentEnd ? 2 : 1;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function walk(root: string, rel: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(join(root, rel), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(root, childRel, out);
    } else if (entry.isFile()) {
      out.push(childRel);
    }
  }
}

export function isExcluded(relPath: string, exclude: string[]): boolean {
  const base = relPath.split('/').pop() ?? relPath;
  return exclude.some((ex) => {
    const re = globToRegExp(ex);
    return re.test(relPath) || (!ex.includes('/') && re.test(base));
  });
}

/** Returns matching files, relative to root, sorted. */
export function expandGlob(root: string, pattern: string, exclude: string[] = []): string[] {
  const p = toPosix(pattern);
  if (!hasGlob(p)) {
    return isFile(join(root, p)) && !isExcluded(p, exclude) ? [p] : [];
  }
  const segments = p.split('/');
  const firstGlob = segments.findIndex((s) => hasGlob(s));
  const base = segments.slice(0, firstGlob).join('/');
  const files: string[] = [];
  walk(root, base, files);
  const re = globToRegExp(p);
  return files.filter((f) => re.test(f) && !isExcluded(f, exclude)).sort();
}
