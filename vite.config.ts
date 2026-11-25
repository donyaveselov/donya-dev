import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

const ROOM_JSON = fileURLToPath(new URL('./public/room.json', import.meta.url));
const ROUTES_TS = fileURLToPath(new URL('./src/modules/room/routes.ts', import.meta.url));

/**
 * Cache-busts the model: the page fetches room.json?v=<md5[:10] of the file>, so the host can cache it for good.
 * The version reaches the loader as the `__ROOM_VERSION__` constant (declared in src/build-env.d.ts). A build whose
 * scripts have no "room.json?v=" fails instead of shipping a model that browsers would keep forever.
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
    generateBundle(_options, bundle) {
      const busted = Object.values(bundle).some((file) => file.type === 'chunk' && file.code.includes('room.json?v='));
      if (!busted) this.error('no "room.json?v=" in the built scripts: the model would be fetched without its version');
    },
  };
}

/**
 * The names the page answers to: the routes in src/modules/room/routes.ts. Loaded
 * through Vite, as the app's own code is, rather than imported into this config.
 */
export async function routeNames(): Promise<readonly string[]> {
  const { module } = await runnerImport<{ ROUTES: Record<string, unknown> }>(ROUTES_TS, {
    configFile: false,
    logLevel: 'warn',
  });
  return Object.keys(module.ROUTES);
}

/**
 * A copy of the built page in a folder per route (resume/index.html, pc/index.html, ...): the host serves files only,
 * with no fallback to index.html, and this is how /resume opens straight away. The page's scripts and styles are at
 * absolute URLs (base '/'), so the same HTML works one folder down.
 */
export function routePages(names: () => Promise<readonly string[]> = routeNames): Plugin {
  let pages: readonly string[] = [];
  return {
    name: 'donya:route-pages',
    apply: 'build',
    enforce: 'post',
    async buildStart() {
      pages = await names();
      if (pages.length === 0) this.error('no route list: the build would ship no route pages');
      const bad = pages.find((name) => !/^[a-z0-9]+$/.test(name));
      if (bad !== undefined) this.error(`route "${bad}" is no folder name`);
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const page = bundle['index.html'];
        if (page?.type !== 'asset') return this.error('no index.html in the bundle to copy into the route folders');
        for (const name of pages) this.emitFile({ type: 'asset', fileName: `${name}/index.html`, source: page.source });
      },
    },
  };
}

// `vite build` makes the multi-file site for donya.dev (dist/); `vite build --mode artifact` inlines every script and
// stylesheet into one index.html (dist-artifact/) for the claude.ai artifact. Both keep room.json, games/ and wall/ as
// files next to the page, fetched at runtime. Only index.html is a build input: lab/ is served by `vite dev` alone.
// The site routes by the path (/resume) and has a page per route, so its URLs are absolute; the artifact is served
// from wherever it is published, so its URLs stay relative and it routes by the hash (src/modules/room/routes.ts).
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    base: artifact ? './' : '/',
    define: { __HASH_ROUTES__: JSON.stringify(artifact) },
    plugins: [roomCacheBust(), ...(artifact ? [viteSingleFile({ removeViteModuleLoader: true })] : [routePages()])],
    build: {
      outDir: artifact ? 'dist-artifact' : 'dist',
      emptyOutDir: true,
      // Two chunks of about 660-680 kB each: the room with three.js, and the desktop, whose XP icon bitmaps are
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
