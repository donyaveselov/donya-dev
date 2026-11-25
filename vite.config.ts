import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

const ROOM_JSON = fileURLToPath(new URL('./public/room.json', import.meta.url));

/** Cache-bust the model exactly as build.py does: fetch('room.json') becomes fetch('room.json?v=<md5[:10]>'). */
function roomCacheBust(): Plugin {
  const v = createHash('md5').update(readFileSync(ROOM_JSON)).digest('hex').slice(0, 10);
  return {
    name: 'donya:room-cache-bust',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/') || !code.includes("fetch('room.json')")) return null;
      return { code: code.replaceAll("fetch('room.json')", `fetch('room.json?v=${v}')`), map: null };
    },
  };
}

// `vite build` makes the multi-file site for donya.dev (dist/); `vite build --mode artifact` inlines every script and
// stylesheet into one index.html (dist-artifact/) for the claude.ai artifact. Both keep room.json, games/ and wall/ as
// files next to the page, fetched at runtime the same way the current site does.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    base: './',
    plugins: [roomCacheBust(), ...(artifact ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      outDir: artifact ? 'dist-artifact' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2048,
      // Lightning CSS minification drops `backdrop-filter` when `-webkit-backdrop-filter` sits next to it (the room's
      // chips lose their blur in Chrome), so the CSS ships as written.
      cssMinify: false,
    },
    test: {
      include: ['src/**/*.test.ts', 'lab/**/*.test.ts', 'scripts/**/*.test.mjs'],
      environment: 'node',
    },
  };
});
