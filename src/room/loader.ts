// The model: public/room.json is {"gz": base64(gzip(GLB))}, the GLB quantized by gltfpack (scripts/pack-room.mjs).
// The build cache-busts the literal fetch('room.json') below (vite.config.ts): keep that spelling.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** The browser's own gzip (every current browser has it). Without it the room fails over to the plain page, rather
 *  than pulling an inflater from a CDN. */
function gunzip(buf: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('no DecompressionStream'));
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

/** Fetches, unpacks and parses the room; `progress` gets 0.6 once the file is in. */
export async function loadRoom(progress: (k: number) => void): Promise<GLTF> {
  const res = await fetch('room.json');
  if (!res.ok) throw new Error(`room.json: HTTP ${String(res.status)}`);
  const data = (await res.json()) as { gz: string };
  progress(0.6);
  const bin = atob(data.gz);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const glb = await gunzip(buf);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(glb, '', resolve, reject);
  });
}
