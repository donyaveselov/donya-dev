// The model: public/room.json is {"gz": base64(gzip(GLB))}, the GLB quantized by gltfpack (scripts/pack-room.mjs).
// The build cache-busts the literal fetch('room.json') below (vite.config.ts): keep that spelling.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

declare global {
  interface Window {
    pako?: { inflate(data: Uint8Array): Uint8Array };
  }
}

function gunzip(buf: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === 'function')
    return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  // older browsers: a small inflater from the CDN
  return new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako_inflate.min.js';
    sc.onload = () => {
      const pako = window.pako;
      if (pako) resolve(pako.inflate(buf).buffer as ArrayBuffer);
      else reject(new Error('no pako'));
    };
    sc.onerror = reject;
    document.head.appendChild(sc);
  });
}

/** Fetches, unpacks and parses the room; `progress` gets 0.6 once the file is in. */
export async function loadRoom(progress: (k: number) => void): Promise<GLTF> {
  const data = (await fetch('room.json').then((r) => r.json())) as { gz: string };
  progress(0.6);
  const bin = atob(data.gz);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const glb = await gunzip(buf);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(glb, '', resolve, reject);
  });
}
