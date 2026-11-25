// The build's copy of the page into a folder per route (vite.config.ts), so that /resume opens on a host without a
// fallback to index.html.
import { describe, expect, it } from 'vitest';
import { routeNames, routePages } from '../../../vite.config';
import { PAGES } from './routes';

interface Emitted {
  fileName: string;
  source: string;
}

/** Runs the plugin's two hooks on a bundle with the given files; returns what it emitted (or throws its error). */
async function run(bundle: Record<string, unknown>, names: readonly string[]): Promise<Emitted[]> {
  const emitted: Emitted[] = [];
  const ctx = {
    emitFile: (f: Emitted) => emitted.push(f),
    error: (m: string) => {
      throw new Error(m);
    },
  };
  const plugin = routePages(() => Promise.resolve(names));
  const start = plugin.buildStart as unknown as (this: typeof ctx) => Promise<void>;
  const hook = plugin.generateBundle;
  if (!hook || typeof hook === 'function') throw new Error('generateBundle is not an ordered hook');
  await start.call(ctx);
  (hook.handler as unknown as (this: typeof ctx, o: unknown, b: unknown) => void).call(ctx, {}, bundle);
  return emitted;
}

const page = { 'index.html': { type: 'asset', fileName: 'index.html', source: '<html>built</html>' } };

describe('the route pages', () => {
  it('take their names from the route tables', async () => {
    expect(await routeNames()).toEqual(PAGES);
  });
  it('are the built page in a folder per name', async () => {
    const emitted = await run(page, PAGES);
    expect(emitted.map((f) => f.fileName)).toEqual(PAGES.map((n) => `${n}/index.html`));
    expect(emitted.map((f) => f.fileName)).toContain('resume/index.html');
    for (const f of emitted) expect(f.source).toBe('<html>built</html>');
  });
  it('fail the build without a page to copy, or with a name that is no folder', async () => {
    await expect(run({}, PAGES)).rejects.toThrow(/no index.html/);
    await expect(run(page, ['../x'])).rejects.toThrow(/no folder name/);
    await expect(run(page, [])).rejects.toThrow(/no route list/);
  });
});
