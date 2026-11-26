import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import type * as Seo from './src/services/seo';
import type { Lang } from './src/types';

const ROOM_JSON = fileURLToPath(new URL('./public/room.json', import.meta.url));
const ROUTES_TS = fileURLToPath(new URL('./src/modules/room/routes.ts', import.meta.url));
const SEO_TS = fileURLToPath(new URL('./src/services/seo.ts', import.meta.url));

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

/** The pages' heads and the sitemap (src/services/seo.ts), loaded through Vite as the route table is. */
export async function seo(): Promise<typeof Seo> {
  const { module } = await runnerImport<typeof Seo>(SEO_TS, { configFile: false, logLevel: 'warn' });
  return module;
}

export interface PageOptions {
  /** the built English page as a route's page in a language (src/services/seo.ts) */
  localize?: (html: string, lang: Lang, name: string) => string;
  /** the sitemap's lastmod: the build date */
  today?: () => string;
}

/**
 * The built page once per language and route: index.html and resume/index.html, pc/index.html, ... in English,
 * ru/index.html and ru/resume/index.html, ... in Russian, each with its head in its language (src/services/seo.ts), and
 * sitemap.xml over them. The host serves files only, with no fallback to index.html: this is how /resume and /ru/resume
 * open straight away. The page's scripts and styles are at absolute URLs (base '/'), so the same HTML works in every
 * folder.
 */
export function routePages(names: () => Promise<readonly string[]> = routeNames, opts: PageOptions = {}): Plugin {
  const today = opts.today ?? (() => new Date().toISOString().slice(0, 10));
  let pages: readonly string[] = [];
  let S: typeof Seo;
  return {
    name: 'donya:route-pages',
    apply: 'build',
    enforce: 'post',
    async buildStart() {
      pages = await names();
      S = await seo();
      if (pages.length === 0) this.error('no route list: the build would ship no route pages');
      const bad = pages.find((name) => !/^[a-z0-9]+$/.test(name) || name === 'ru');
      if (bad !== undefined) this.error(`route "${bad}" is no folder name`);
      const lost = S.INDEXED_ROUTES.find((name) => !pages.includes(name));
      if (lost !== undefined) this.error(`the sitemap's route "${lost}" is not in the route table`);
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const page = bundle['index.html'];
        if (page?.type !== 'asset') return this.error('no index.html in the bundle to copy into the route folders');
        const html = String(page.source);
        const localize = opts.localize ?? S.localizePage;
        for (const lang of ['en', 'ru'] satisfies Lang[])
          for (const name of ['', ...pages]) {
            const source = localize(html, lang, name);
            const fileName = S.pageFile(name, lang);
            if (fileName === 'index.html') page.source = source;
            else this.emitFile({ type: 'asset', fileName, source });
          }
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: S.sitemap(today()) });
      },
    },
  };
}

// `vite build` makes the site for donya.dev (dist/). Its URLs are absolute (base '/'), so the page works in every route
// folder. Only index.html is a build input.
export default defineConfig({
  base: '/',
  plugins: [roomCacheBust(), routePages()],
  build: {
    // Two chunks of about 660-680 kB each: the room with three.js, and the desktop with its XP icon bitmaps inlined
    // as base64. Warn only when one outgrows that.
    chunkSizeWarningLimit: 750,
    // esbuild, not the default Lightning CSS: Lightning drops `backdrop-filter` when `-webkit-backdrop-filter` sits
    // next to it (the blur is lost in Chrome); esbuild keeps both.
    cssMinify: 'esbuild',
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs', 'worker/src/**/*.test.ts'],
    environment: 'node',
  },
});
