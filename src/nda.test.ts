import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The desktop never names the employer whose work is under NDA, nor that work's repository. The room's public resume
// sheet (index.html) is outside the desktop by design, so it is not scanned.
//
// The names are not spelled here either: the list holds SHA-256 hashes, and a file is checked by hashing what could be
// such a name in it — the first 7 letters of every word of 7 letters or more (lower case), and every run of
// hyphen-joined parts inside a hyphenated token (lower case).
const FORBIDDEN = new Set([
  '309217348bcdee697bbf35480a37efa38e743b2d01e7519644f6d862ae228242',
  '3f63e7cada0d6f028d57ddba78ab4c777125b23859fc0876946801e282f23383',
  '0f6136664c11d3a44f90a4407bea5af7ee37fa263eec9174818daff9b10c6ae8',
]);
const PREFIX = 7;

// all of src: the desktop and everything it imports (the room has nothing to hide, so it is scanned too)
const SRC = fileURLToPath(new URL('.', import.meta.url));

const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

/** What in a text could be a forbidden name: word prefixes and the hyphenated runs. */
function candidates(text: string): Set<string> {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const [word] of lower.matchAll(/\p{L}{7,}/gu)) out.add(word.slice(0, PREFIX));
  for (const [token] of lower.matchAll(/[\p{L}\d]+(?:-[\p{L}\d]+)+/gu)) {
    const parts = token.split('-');
    for (let a = 0; a < parts.length; a++)
      for (let b = a + 2; b <= parts.length; b++) out.add(parts.slice(a, b).join('-'));
  }
  return out;
}

const hits = (text: string): string[] => [...candidates(text)].filter((c) => FORBIDDEN.has(sha(c)));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|css|json|html)$/.test(n) && !n.endsWith('.test.ts') ? [p] : [];
  });
}

describe('XP desktop NDA', () => {
  it('finds a name by its hash, in any case, inside a longer word or token', () => {
    // made-up names stand in for the real ones
    const check = (text: string, forbidden: string[]): string[] => {
      const set = new Set(forbidden.map(sha));
      return [...candidates(text)].filter((c) => set.has(sha(c)));
    };
    expect(check('Работал в ВЫМЫШЛЕННОМ институте', ['вымышле'])).toEqual(['вымышле']);
    expect(check('see the Some-Secret-Repo-v2 build', ['secret-repo'])).toEqual(['secret-repo']);
    expect(check('nothing of the kind here', ['вымышле', 'secret-repo'])).toEqual([]);
  });

  it('names no NDA employer or repository', () => {
    const scanned = files(SRC);
    expect(scanned.length).toBeGreaterThan(0);
    const found = scanned.flatMap((f) => (hits(readFileSync(f, 'utf8')).length ? [f] : []));
    expect(found).toEqual([]);
  });
});
