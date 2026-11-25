#!/usr/bin/env node
// @ts-check
// Packs the Blender export into public/room.json:
//   gltfpack 0.24.0 -kn -km -kv -vpf -vtf   (KHR_mesh_quantization: 8-bit normals and UVs, float positions;
//                                            names, materials and the screens' untextured UVs are kept)
//   gzip -9, base64, {"gz": "..."}
// The page inflates it with the browser's DecompressionStream. gltfpack is a pinned devDependency (its output is part
// of the model's bytes), so `npm ci` is all it needs.
//
//   node scripts/pack-room.mjs [path/to/room.glb]
//
// Input: the argument, else ../resume/portfolio/blender/room.glb next to this repo.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, constants } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_GLB = resolve(ROOT, '..', 'resume', 'portfolio', 'blender', 'room.glb');
const input = process.argv[2];

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(message);
  process.exit(1);
}

const glb = input ? resolve(input) : DEFAULT_GLB;
if (!existsSync(glb)) {
  fail(
    input
      ? `no such file: ${glb}`
      : `no Blender export at ${glb}\nusage: node scripts/pack-room.mjs <path/to/room.glb>`,
  );
}

const work = join(ROOT, '.work');
mkdirSync(work, { recursive: true });
const packed = join(work, 'room-packed.glb');

try {
  // through its cli.js with this Node: no shell, no PATH, the same on every OS
  const cli = fileURLToPath(import.meta.resolve('gltfpack/cli.js'));
  execFileSync(process.execPath, [cli, '-i', glb, '-o', packed, '-kn', '-km', '-kv', '-vpf', '-vtf'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 300_000,
  });
} catch (e) {
  const why = e instanceof Error ? (e.message.split('\n')[0] ?? e.message) : String(e);
  fail(`gltfpack did not run (${why}).\nRun npm ci.`);
}
const data = readFileSync(packed);
const gz = gzipSync(data, { level: constants.Z_BEST_COMPRESSION });
const out = join(ROOT, 'public', 'room.json');
writeFileSync(out, JSON.stringify({ gz: gz.toString('base64') }).replace('{"gz":"', '{"gz": "'));
const v = createHash('md5').update(readFileSync(out)).digest('hex').slice(0, 10);
console.log(
  `model: ${String(statSync(glb).size >> 10)} KB raw -> ${String(gz.length >> 10)} KB quantized+gzip; room.json ${String(statSync(out).size >> 10)} KB, v=${v}`,
);
