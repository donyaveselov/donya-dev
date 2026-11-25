import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

const ROOM_JSON = fileURLToPath(new URL('./public/room.json', import.meta.url));
const ROOM_FETCH = "fetch('room.json')";

/**
 * Cache-busts the model: the page fetches room.json?v=<md5[:10] of the file>, so the host can cache it for good.
 * The version reaches the code as the `__ROOM_VERSION__` constant (declared in src/build-env.d.ts). Until the loader
 * uses it, the literal fetch('room.json') is rewritten as well. Either way a build whose scripts have no
 * "room.json?v=" fails instead of shipping a model that browsers would keep forever.
 */
function roomCacheBust(): Plugin {
  let version = '';
  return {
    name: 'donya:room-cache-bust',
    enforce: 'pre',
    config() {
      version = createHash('md5').update(readFileSync(ROOM_JSON)).digest('hex').slice(0, 10);
      return { define: { __ROOM_VERSION__: JSON.stringify(version) } };
    },
    transform(code, id) {
      if (!id.includes('/src/') || !code.includes(ROOM_FETCH)) return null;
      return code.replaceAll(ROOM_FETCH, `fetch('room.json?v=${version}')`);
    },
    generateBundle(_options, bundle) {
      const busted = Object.values(bundle).some((file) => file.type === 'chunk' && file.code.includes('room.json?v='));
      if (!busted) this.error('no "room.json?v=" in the built scripts: the model would be fetched without its version');
    },
  };
}

// `vite build` makes the multi-file site for donya.dev (dist/); `vite build --mode artifact` inlines every script and
// stylesheet into one index.html (dist-artifact/) for the claude.ai artifact. Both keep room.json, games/ and wall/ as
// files next to the page, fetched at runtime. Only index.html is a build input: lab/ is served by `vite dev` alone.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    base: './',
    plugins: [roomCacheBust(), ...(artifact ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      outDir: artifact ? 'dist-artifact' : 'dist',
      emptyOutDir: true,
      // Two chunks of about 660-680 kB each: the room with three.js, and the desktop (xp), whose XP icon bitmaps are
      // inlined as base64 on purpose, so that the artifact build stays one file. Warn only when one outgrows that.
      chunkSizeWarningLimit: 750,
      // esbuild, not the default Lightning CSS: Lightning drops `backdrop-filter` when `-webkit-backdrop-filter` sits
      // next to it (the blur is lost in Chrome); esbuild keeps both.
      cssMinify: 'esbuild',
    },
    test: {
      include: ['src/**/*.test.ts', 'lab/**/*.test.ts', 'scripts/**/*.test.mjs'],
      environment: 'node',
    },
  };
});
