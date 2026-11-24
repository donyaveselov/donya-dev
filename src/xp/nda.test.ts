import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// NDA: the desktop must never name this employer or repository (the room's own resume sheet in index.html is not
// part of the desktop).
const FORBIDDEN = [/Жуковск/i, /Zhukovsk/i, /main-frontend/i];
const DIRS = [fileURLToPath(new URL('.', import.meta.url))];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|css|json|html)$/.test(n) && !n.endsWith('.test.ts') ? [p] : [];
  });
}

describe('XP desktop NDA', () => {
  it('names no NDA employer or repository', () => {
    const hits = DIRS.flatMap(files).flatMap((f) => {
      const s = readFileSync(f, 'utf8');
      return FORBIDDEN.filter((re) => re.test(s)).map((re) => `${f}: ${String(re)}`);
    });
    expect(hits).toEqual([]);
  });
});
