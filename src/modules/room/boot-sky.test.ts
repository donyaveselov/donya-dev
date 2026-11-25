// index.html paints the sky before any module runs, with a small inline copy of the status schedule and the backdrop
// colours. This keeps that copy in step with the real statusAt, phuketTime, BACKDROP and the routes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRoute } from './routes';
import { BACKDROP } from './scene/lighting';
import { phuketTime, statusAt } from './store/clock';

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const script = /<script>([\s\S]*?BACKDROP[\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';

/** Runs the inline script at a given UTC time and hash; returns the colours it sets. */
function bootSky(utc: Date, hash: string): [string, string] {
  const vars: Record<string, string> = {};
  const document = { documentElement: { style: { setProperty: (k: string, v: string) => (vars[k] = v) } } };
  const location = { hash: hash ? `#${hash}` : '' };
  const FakeDate = class extends Date {
    constructor() {
      super(utc.getTime());
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the page's own inline script, read from index.html
  const run = new Function('document', 'location', 'Date', script) as (d: unknown, l: unknown, D: unknown) => void;
  run(document, location, FakeDate);
  return [vars['--sky-top'] ?? '', vars['--sky-bottom'] ?? ''];
}

/** What the room itself shows first: the route's preview and forced status, no Discord reading yet. */
function roomSky(utc: Date, hash: string): readonly [string, string] {
  const route = parseRoute(hash);
  return BACKDROP[statusAt(phuketTime(utc, route.preview), route.forced, null)];
}

describe('the sky before the first paint', () => {
  it('is in index.html', () => {
    expect(script).toContain('BACKDROP');
  });
  it('matches the room at every quarter hour, for every route', () => {
    const hashes = [
      '',
      'day',
      'sunset',
      'night',
      'work',
      'play',
      'sleep',
      'outside',
      'dota',
      'cs',
      'pcdota',
      'pc',
      'resume',
      'constructor',
      'nonsense',
    ];
    for (let q = 0; q < 24 * 4; q++) {
      const utc = new Date(Date.UTC(2026, 10, 25, 0, q * 15));
      for (const hash of hashes)
        expect(bootSky(utc, hash), `${hash} at ${utc.toISOString()}`).toEqual(roomSky(utc, hash));
    }
  });
});
