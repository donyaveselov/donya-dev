import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

// public/room.json is what the page fetches: {"gz": base64(gzip(GLB))}, the GLB quantized by gltfpack
describe('public/room.json', () => {
  const data = JSON.parse(readFileSync(new URL('../../../public/room.json', import.meta.url), 'utf8')) as {
    gz?: string;
  };
  it('holds a gzipped glTF binary', () => {
    expect(typeof data.gz).toBe('string');
    const glb = gunzipSync(Buffer.from(data.gz ?? '', 'base64'));
    expect(glb.subarray(0, 4).toString('latin1')).toBe('glTF');
    expect(glb.readUInt32LE(4)).toBe(2);
    expect(glb.readUInt32LE(8)).toBe(glb.length);
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8')) as {
      extensionsUsed?: string[];
      nodes?: { name?: string }[];
    };
    expect(gltf.extensionsUsed ?? []).toContain('KHR_mesh_quantization');
    const names = (gltf.nodes ?? []).map((n) => n.name);
    expect(names).toContain('Screen_L');
    expect(names).toContain('Screen_R');
  });
});
