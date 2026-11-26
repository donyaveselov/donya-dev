// The build's page per language and route (vite.config.ts), so that /resume and /ru/resume open on a host without a
// fallback to index.html, and its sitemap.
import { describe, expect, it } from 'vitest';
import { routeNames, routePages } from '../../../vite.config';
import type { PageOptions } from '../../../vite.config';
import { ROUTES } from './routes';

const PAGES = Object.keys(ROUTES);

interface Emitted {
  fileName: string;
  source: string;
}

interface Asset {
  type: 'asset';
  fileName: string;
  source: string;
}

const localize: PageOptions['localize'] = (html, lang, name) => `${html}:${lang}:${name}`;

/** Runs the plugin's two hooks on a bundle with the given files; returns what it emitted (or throws its error). */
async function run(bundle: Record<string, Asset>, names: readonly string[]): Promise<Emitted[]> {
  const emitted: Emitted[] = [];
  const ctx = {
    emitFile: (f: Emitted) => emitted.push(f),
    error: (m: string) => {
      throw new Error(m);
    },
  };
  const plugin = routePages(() => Promise.resolve(names), { localize, today: () => '2026-11-26' });
  const start = plugin.buildStart as unknown as (this: typeof ctx) => Promise<void>;
  const hook = plugin.generateBundle;
  if (!hook || typeof hook === 'function') throw new Error('generateBundle is not an ordered hook');
  await start.call(ctx);
  (hook.handler as unknown as (this: typeof ctx, o: unknown, b: unknown) => void).call(ctx, {}, bundle);
  return emitted;
}

const page = (): Record<string, Asset> => ({ 'index.html': { type: 'asset', fileName: 'index.html', source: 'p' } });

describe('the route pages', () => {
  it('take their names from the route table', async () => {
    expect(await routeNames()).toEqual(PAGES);
  });
  it('are the built page in each language, in a folder per name, with a sitemap', async () => {
    const bundle = page();
    const emitted = await run(bundle, PAGES);
    expect(bundle['index.html']?.source).toBe('p:en:');
    const files = Object.fromEntries(emitted.map((f) => [f.fileName, f.source]));
    expect(Object.keys(files).sort()).toEqual(
      [
        ...PAGES.map((n) => `${n}/index.html`),
        'ru/index.html',
        ...PAGES.map((n) => `ru/${n}/index.html`),
        'sitemap.xml',
      ].sort(),
    );
    expect(files['resume/index.html']).toBe('p:en:resume');
    expect(files['ru/index.html']).toBe('p:ru:');
    expect(files['ru/resume/index.html']).toBe('p:ru:resume');
    expect(files['sitemap.xml']).toContain('<lastmod>2026-11-26</lastmod>');
  });
  it('fail the build without a page to copy, or with a name that is no folder', async () => {
    await expect(run({}, PAGES)).rejects.toThrow(/no index.html/);
    await expect(run(page(), ['../x'])).rejects.toThrow(/no folder name/);
    await expect(run(page(), ['ru', ...PAGES])).rejects.toThrow(/no folder name/);
    await expect(run(page(), [])).rejects.toThrow(/no route list/);
    await expect(run(page(), ['day'])).rejects.toThrow(/sitemap's route/);
  });
});
