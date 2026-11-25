#!/usr/bin/env node
// Pixel comparison of two regression captures (scripts/regress.mjs output folders).
//
//   node scripts/compare.mjs <baselineDir> <candidateDir> [reportDir] [--max=0.002] [--threshold=0.1]
//
// For every PNG in the baseline: pixelmatch (per-pixel colour threshold --threshold, anti-aliasing not counted)
// against the same file in the candidate, a diff PNG for each image that differs, and <reportDir>/report.json with the
// mismatch % per image. Exits 1 when any image is missing, changed size, or is above --max percent.
//
// Noise floor: regress.mjs freezes the clock and Math.random, so two captures of the same build are pixel-identical
// except for an occasional pixel or two (measured: 0 % on 41 of 42 states, 0.0002 % = 2 px on one). The default
// --max of 0.002 % (about 20 px of a 1280x800 frame) sits above that and well below the smallest real regression seen
// so far (the room's chips losing their backdrop blur: 0.017 %).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [aDir, bDir, outArg] = args.filter((a) => !a.startsWith('--')).map((p) => resolve(p));
if (!aDir || !bDir) {
  console.error(
    'usage: node scripts/compare.mjs <baselineDir> <candidateDir> [reportDir] [--max=0.002] [--threshold=0.1]',
  );
  process.exit(2);
}
const OUT = outArg ?? join(bDir, '_diff');
const MAX = Number(flags.max ?? 0.002);
const THRESHOLD = Number(flags.threshold ?? 0.1);
mkdirSync(OUT, { recursive: true });

const files = readdirSync(aDir)
  .filter((f) => f.endsWith('.png'))
  .sort();
const rows = [];
for (const f of files) {
  const bPath = join(bDir, f);
  if (!existsSync(bPath)) {
    rows.push({ file: f, status: 'missing', mismatchPct: 100 });
    continue;
  }
  const a = PNG.sync.read(readFileSync(join(aDir, f)));
  const b = PNG.sync.read(readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) {
    rows.push({ file: f, status: 'size', mismatchPct: 100, a: [a.width, a.height], b: [b.width, b.height] });
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: THRESHOLD, includeAA: false });
  const pct = (n / (a.width * a.height)) * 100;
  let diffFile = null;
  if (n > 0) {
    diffFile = 'diff-' + f;
    writeFileSync(join(OUT, diffFile), PNG.sync.write(diff));
  }
  rows.push({
    file: f,
    status: pct > MAX ? 'over' : n > 0 ? 'noise' : 'same',
    mismatchPx: n,
    mismatchPct: +pct.toFixed(4),
    diff: diffFile,
  });
}
const extra = existsSync(bDir) ? readdirSync(bDir).filter((f) => f.endsWith('.png') && !files.includes(f)) : [];
const bad = rows.filter((r) => r.status === 'over' || r.status === 'missing' || r.status === 'size');
const report = {
  baseline: aDir,
  candidate: bDir,
  threshold: THRESHOLD,
  maxPct: MAX,
  images: rows.length,
  failing: bad.length,
  extraInCandidate: extra,
  rows,
};
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

for (const r of rows) console.log(`${r.status.padEnd(7)} ${String(r.mismatchPct).padStart(8)} %  ${r.file}`);
if (extra.length) console.log('only in candidate: ' + extra.join(', '));
console.log(`${rows.length} images, ${bad.length} over ${MAX} % -> ${join(OUT, 'report.json')}`);
process.exitCode = bad.length ? 1 : 0;
