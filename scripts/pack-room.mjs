#!/usr/bin/env node
// Packs the Blender export into public/room.json, the same way portfolio/site/build.py does:
//   gltfpack 0.24.0 -kn -km -kv -vpf -vtf   (KHR_mesh_quantization: 8-bit normals and UVs, float positions;
//                                            names, materials and the screens' untextured UVs are kept)
//   gzip -9 (mtime 0), base64, {"gz": "..."}
// The packed GLB is byte-identical to build.py's; the gzip bytes can differ with the zlib build (both inflate the same).
// The page inflates it with the browser's DecompressionStream. Without gltfpack it falls back to gzip only.
//
//   node scripts/pack-room.mjs [path/to/room.glb]
// Default input: ../resume/portfolio/blender/room.glb (or $ROOM_GLB).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, constants } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const glb = resolve(
  process.argv[2] ?? process.env.ROOM_GLB ?? '/Users/donya/Projects/resume/portfolio/blender/room.glb',
);
const work = join(ROOT, '.work');
mkdirSync(work, { recursive: true });
const packed = join(work, 'room-packed.glb');

let data = readFileSync(glb);
let how = 'quantized+gzip';
try {
  execFileSync('npx', ['--yes', 'gltfpack@0.24.0', '-i', glb, '-o', packed, '-kn', '-km', '-kv', '-vpf', '-vtf'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 300_000,
  });
  data = readFileSync(packed);
} catch (e) {
  how = `gzip only (gltfpack unavailable: ${e instanceof Error ? e.message.split('\n')[0] : String(e)})`;
}
const gz = gzipSync(data, { level: constants.Z_BEST_COMPRESSION });
const out = join(ROOT, 'public', 'room.json');
writeFileSync(out, JSON.stringify({ gz: gz.toString('base64') }).replace('{"gz":"', '{"gz": "'));
const v = createHash('md5').update(readFileSync(out)).digest('hex').slice(0, 10);
console.log(
  `model: ${statSync(glb).size >> 10} KB raw -> ${gz.length >> 10} KB ${how}; room.json ${statSync(out).size >> 10} KB, v=${v}`,
);
