import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActiveClock,
  IDLE_MS,
  MAX_BYTES,
  deviceClass,
  enabledBuild,
  mayTrack,
  pack,
  referrerHost,
  routeLabel,
  sanitize,
  track,
  viewportBucket,
} from './analytics.service';
import type { WireEvent } from './analytics.service';

describe('the event list', () => {
  it('is typed: an event takes exactly its props (checked by tsc), and does nothing before initAnalytics', () => {
    track('tour_offer');
    track('app_open', { app: 'paint' });
    // @ts-expect-error: app_open needs its app
    track('app_open');
    // @ts-expect-error: no such event
    track('page_view', { url: '/' });
    // @ts-expect-error: the visit's end is the module's own
    track('visit_end', { activeMs: 1, totalMs: 1, maxDepth: [] });
    // @ts-expect-error: not a language of the page
    track('lang_switch', { to: 'de' });
    // @ts-expect-error: no such prop
    track('lang_switch', { to: 'en', email: 'a@b.c' });
  });
  it('drops events that are not in it', () => {
    expect(sanitize('page_view', { url: 'https://donya.dev/' })).toBeNull();
    expect(sanitize('__proto__')).toBeNull();
    expect(sanitize('toString')).toBeNull();
  });
  it('keeps only the props an event has, of their kind', () => {
    expect(sanitize('app_open', { app: 'paint', email: 'a@b.c', extra: 1 })).toEqual({ app: 'paint' });
    // ids are slugs
    expect(sanitize('app_open', { app: 'Paint <script>' })).toEqual({ app: 'paintscript' });
    expect(sanitize('project_open', { id: 'x'.repeat(100) })).toEqual({ id: 'x'.repeat(32) });
    // a value outside its list goes, so does a value of the wrong type
    expect(sanitize('pc_exit', { how: 'crashed' })).toEqual({});
    expect(sanitize('lang_switch', { to: 'de' })).toEqual({});
    expect(sanitize('lang_switch', { to: 'en' })).toEqual({ to: 'en' });
    expect(sanitize('tour_accept', { replay: 'yes' })).toEqual({});
    expect(sanitize('tour_accept', { replay: true })).toEqual({ replay: true });
    expect(sanitize('tour_offer', { anything: 1 })).toEqual({});
  });
  it('cuts texts, rounds and bounds numbers, filters lists', () => {
    const start = sanitize('visit_start', { ref: `${'a'.repeat(80)}\u0000`, utm: '', vp: '390x840', route: 'home' });
    expect(start).toEqual({ ref: 'a'.repeat(64), vp: '390x840', route: 'home' }); // the empty utm is left out
    expect(
      sanitize('visit_end', { activeMs: 1234.6, totalMs: -5, maxDepth: ['pc', 'pc', 'hacked', 7, 'resume'] }),
    ).toEqual({ activeMs: 1235, totalMs: 0, maxDepth: ['pc', 'resume'] });
    expect(sanitize('visit_end', { activeMs: NaN, totalMs: Infinity, maxDepth: [] })).toEqual({});
  });
});

describe('the visitor, coarsely', () => {
  it('keeps only the referrer host', () => {
    expect(referrerHost('https://hh.ru/vacancy/123?from=search&q=me', 'donya.dev')).toBe('hh.ru');
    expect(referrerHost('https://www.google.com/', 'donya.dev')).toBe('google.com');
    expect(referrerHost('http://t.me:8080/x#y', 'donya.dev')).toBe('t.me');
    expect(referrerHost('android-app://org.telegram.messenger/', 'donya.dev')).toBe('org.telegram.messenger');
    expect(referrerHost('', 'donya.dev')).toBe('direct');
    expect(referrerHost('not a url', 'donya.dev')).toBe('direct');
    expect(referrerHost('file:///Users/me/cv.html', 'donya.dev')).toBe('direct');
    // the site itself (a reload, another route) is no referrer
    expect(referrerHost('https://donya.dev/resume', 'donya.dev')).toBe('direct');
    expect(referrerHost('https://www.donya.dev/', 'donya.dev')).toBe('direct');
  });
  it('buckets the device and the window', () => {
    expect(deviceClass(true, 390, 844)).toBe('phone');
    expect(deviceClass(true, 844, 390)).toBe('phone'); // a phone on its side
    expect(deviceClass(true, 820, 1180)).toBe('tablet');
    expect(deviceClass(false, 390, 844)).toBe('desktop'); // a narrow window with a mouse
    expect(deviceClass(false, 1920, 1080)).toBe('desktop');
    expect(viewportBucket(390, 844)).toBe('390x840');
    expect(viewportBucket(1366, 657)).toBe('1370x660');
  });
  it('names the route', () => {
    expect(routeLabel('/')).toBe('home');
    expect(routeLabel('/resume')).toBe('resume');
    expect(routeLabel('/pc/')).toBe('pc');
    expect(routeLabel('/wp-admin')).toBe('other');
    // a Russian page counts as the same route: the stats are not split by language
    expect(routeLabel('/ru/')).toBe('home');
    expect(routeLabel('/ru')).toBe('home');
    expect(routeLabel('/ru/resume')).toBe('resume');
    expect(routeLabel('/ru/pc/')).toBe('pc');
    expect(routeLabel('/ru/wp-admin')).toBe('other');
  });
});

describe('opting out', () => {
  const chrome =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36';
  it('counts an ordinary browser', () => {
    expect(mayTrack({ userAgent: chrome, doNotTrack: null, webdriver: false })).toBe(true);
    expect(mayTrack({ userAgent: chrome, doNotTrack: '0' })).toBe(true);
  });
  it('respects Do Not Track and Global Privacy Control', () => {
    expect(mayTrack({ userAgent: chrome, doNotTrack: '1' })).toBe(false);
    expect(mayTrack({ userAgent: chrome, globalPrivacyControl: true })).toBe(false);
  });
  it('skips driven browsers and bots', () => {
    expect(mayTrack({ userAgent: chrome, webdriver: true })).toBe(false);
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/142.0 Safari/537.36',
      'TelegramBot (like TwitterBot)',
      'facebookexternalhit/1.1',
      'curl/8.7.1',
      'Mozilla/5.0 (compatible; YandexBot/3.0)',
    ])
      expect(mayTrack({ userAgent: ua }), ua).toBe(false);
  });
  it('is off in dev unless asked for, on in a build unless turned off', () => {
    expect(enabledBuild({ DEV: true })).toBe(false);
    expect(enabledBuild({ DEV: true, VITE_ANALYTICS: '1' })).toBe(true);
    expect(enabledBuild({ DEV: false })).toBe(true);
    expect(enabledBuild({ DEV: false, VITE_ANALYTICS: '0' })).toBe(false);
  });
});

describe('active time', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts a minute after each input, only while the tab is visible', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const clock = new ActiveClock(Date.now(), true);
    vi.advanceTimersByTime(30_000);
    clock.input(Date.now());
    expect(clock.read(Date.now())).toBe(30_000);
    // idle for five minutes: only the first minute after the input counts
    vi.advanceTimersByTime(5 * 60_000);
    expect(clock.read(Date.now())).toBe(30_000 + IDLE_MS);
    // back: an input starts the count again from now
    clock.input(Date.now());
    vi.advanceTimersByTime(10_000);
    expect(clock.read(Date.now())).toBe(30_000 + IDLE_MS + 10_000);
    // hidden: nothing counts, however long
    clock.setVisible(false, Date.now());
    vi.advanceTimersByTime(10 * 60_000);
    clock.input(Date.now()); // a stray event while hidden
    expect(clock.read(Date.now())).toBe(100_000);
    // shown again: that is an input
    clock.setVisible(true, Date.now());
    vi.advanceTimersByTime(20_000);
    expect(clock.read(Date.now())).toBe(120_000);
  });

  it('takes inputs closer than a second as one, and carries the time of earlier pages', () => {
    vi.useFakeTimers({ now: 0 });
    const clock = new ActiveClock(0, true, 5000);
    for (let i = 0; i < 100; i++) {
      vi.advanceTimersByTime(10);
      clock.input(Date.now());
    }
    expect(clock.read(Date.now())).toBe(6000);
  });
});

describe('the payload', () => {
  const sid = '0b6f3c1e-5d2a-4f8e-9a1b-2c3d4e5f6a7b';
  const ev = (i: number): WireEvent => ({
    n: 'app_open',
    t: i * 1000,
    p: { app: `app${String(i).padStart(28, '0')}` },
  });
  const size = (s: string): number => new TextEncoder().encode(s).length;

  it('is one compact body when it fits', () => {
    const bodies = pack(sid, [ev(1), { n: 'tour_offer', t: 5 }]);
    expect(bodies).toHaveLength(1);
    expect(JSON.parse(bodies[0] ?? '')).toEqual({ s: sid, e: [ev(1), { n: 'tour_offer', t: 5 }] });
  });
  it('splits a long queue into bodies of at most 4 KB, keeping every event in order', () => {
    const events = Array.from({ length: 200 }, (_, i) => ev(i));
    const bodies = pack(sid, events);
    expect(bodies.length).toBeGreaterThan(1);
    for (const b of bodies) expect(size(b)).toBeLessThanOrEqual(MAX_BYTES);
    const back = bodies.flatMap((b) => (JSON.parse(b) as { e: WireEvent[] }).e);
    expect(back).toEqual(events);
  });
  it('drops an event that could never fit', () => {
    const huge: WireEvent = { n: 'app_open', t: 0, p: { app: 'x'.repeat(5000) } };
    expect(pack(sid, [huge])).toEqual([]);
    expect(pack(sid, [huge, ev(1)])).toHaveLength(1);
  });
  it('sends nothing for nothing', () => {
    expect(pack(sid, [])).toEqual([]);
  });
});

describe('a visit', () => {
  type Listener = () => void;
  const listeners = new Map<string, Listener[]>();
  const on = (type: string, cb: Listener): void => {
    listeners.set(type, [...(listeners.get(type) ?? []), cb]);
  };
  const fire = (type: string): void => {
    for (const cb of listeners.get(type) ?? []) cb();
  };
  const store = new Map<string, string>();
  const doc = { hidden: false, referrer: 'https://hh.ru/vacancy/1?utm=x', addEventListener: on };
  const beacons: Blob[] = [];

  const iphone = (doNotTrack: string | null = null) => ({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1',
    language: 'ru-RU',
    doNotTrack,
    webdriver: false,
    sendBeacon: (_url: string, body: Blob) => beacons.push(body) > 0,
  });
  const setUp = (): void => {
    listeners.clear();
    store.clear();
    beacons.length = 0;
    doc.hidden = false;
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    vi.resetModules();
    vi.stubEnv('VITE_ANALYTICS', '1');
    vi.stubGlobal('window', {
      addEventListener: on,
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: true }),
    });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('location', { pathname: '/resume', hash: '', search: '?utm_source=tg', hostname: 'donya.dev' });
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    vi.stubGlobal('navigator', iphone());
  };
  const sent = async (): Promise<{ n: string; p?: Record<string, unknown> }[]> => {
    const bodies = await Promise.all(beacons.map((b) => b.text()));
    return bodies.flatMap((b) => (JSON.parse(b) as { e: { n: string; p?: Record<string, unknown> }[] }).e);
  };
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('starts, tracks, and ends with the active time when the tab hides', async () => {
    setUp();
    const a = await import('./analytics.service');
    a.initAnalytics({ lang: 'ru' });
    a.track('tour_offer');
    a.track('app_open', { app: 'resume' });
    vi.advanceTimersByTime(20_000);
    fire('pointermove');
    vi.advanceTimersByTime(30_000);
    doc.hidden = true;
    fire('visibilitychange');
    // five minutes in another tab do not count; coming back does
    vi.advanceTimersByTime(5 * 60_000);
    doc.hidden = false;
    fire('visibilitychange');
    vi.advanceTimersByTime(10_000);
    doc.hidden = true;
    fire('visibilitychange');
    const events = await sent();
    expect(events.map((e) => e.n)).toEqual(['visit_start', 'tour_offer', 'app_open', 'visit_end', 'visit_end']);
    expect(events[0]?.p).toEqual({
      route: 'resume',
      lang: 'ru',
      blang: 'ru',
      device: 'phone',
      vp: '390x840',
      ref: 'hh.ru',
      utm: 'tg',
    });
    expect(events[3]?.p).toEqual({ activeMs: 50_000, totalMs: 50_000, maxDepth: ['app'] });
    expect(events[4]?.p).toEqual({ activeMs: 60_000, totalMs: 360_000, maxDepth: ['app'] });
  });

  it('sends a heartbeat while shown, and nothing more when nothing changed', async () => {
    setUp();
    const a = await import('./analytics.service');
    a.initAnalytics({ lang: 'en' });
    vi.advanceTimersByTime(60_000); // the batch, then the first heartbeat
    expect((await sent()).map((e) => e.n)).toEqual(['visit_start', 'visit_end']);
    vi.advanceTimersByTime(5 * 60_000); // idle: the time stopped at a minute
    expect(beacons).toHaveLength(2);
  });

  it('goes on with the same visit after a reload', async () => {
    setUp();
    let a = await import('./analytics.service');
    a.initAnalytics({ lang: 'ru' });
    a.track('pc_enter', { screen: 'left' });
    vi.advanceTimersByTime(30_000);
    fire('pagehide');
    const first = await sent();
    beacons.length = 0;
    listeners.clear();
    vi.resetModules();
    a = await import('./analytics.service');
    a.initAnalytics({ lang: 'ru' });
    vi.advanceTimersByTime(10_000);
    fire('pagehide');
    const second = await sent();
    expect(second.map((e) => e.n)).toEqual(['visit_end']); // no second visit_start
    expect(second[0]?.p).toEqual({ activeMs: 40_000, totalMs: 40_000, maxDepth: ['pc'] });
    expect(first.at(-1)?.p).toMatchObject({ activeMs: 30_000 });
  });

  it('stays silent with Do Not Track', async () => {
    setUp();
    vi.stubGlobal('navigator', iphone('1'));
    const a = await import('./analytics.service');
    a.initAnalytics({ lang: 'ru' });
    a.track('diploma_click');
    vi.advanceTimersByTime(120_000);
    fire('pagehide');
    expect(beacons).toHaveLength(0);
  });
});
