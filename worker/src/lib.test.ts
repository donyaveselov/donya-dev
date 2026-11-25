import { describe, expect, it } from 'vitest';
import {
  MAX_EVENTS,
  buildVisit,
  clock,
  digest,
  digestText,
  duration,
  isBot,
  isDay,
  originAllowed,
  parseBatch,
  phuketDay,
  phuketDayBefore,
  phuketTime,
  requestOrigin,
  sameSecret,
  uaClass,
  visitText,
  visitorHash,
} from './lib';
import type { DigestRow, VisitEvent } from './lib';

const SID = '0b9f8e2a-4c1d-4e5f-9a7b-1c2d3e4f5a6b';
const body = (e: unknown, s: unknown = SID): string => JSON.stringify({ s, e });

describe('a batch', () => {
  it('keeps the events and props of the list, cleaned', () => {
    const b = parseBatch(
      body([
        { n: 'visit_start', t: 0, p: { route: 'Home', lang: 'ru', device: 'desktop', ref: 'hh.ru', ip: '1.2.3.4' } },
        { n: 'page_view', t: 5, p: { url: '/' } },
        { n: 'app_open', t: 12.7, p: { app: 'Paint <b>' } },
        { n: 'visit_end', t: -4, p: { activeMs: 95_000.4, totalMs: 120_000, maxDepth: ['pc', 'x'] } },
        'junk',
        { n: 'toString' },
      ]),
    );
    expect(b).toEqual({
      session: SID,
      events: [
        { n: 'visit_start', t: 0, p: { route: 'home', lang: 'ru', device: 'desktop', ref: 'hh.ru' } },
        { n: 'app_open', t: 12, p: { app: 'paintb' } },
        { n: 'visit_end', t: 0, p: { activeMs: 95_000, totalMs: 120_000, maxDepth: ['pc'] } },
      ],
    });
  });
  it('refuses what is not a batch', () => {
    expect(parseBatch('not json')).toBeNull();
    expect(parseBatch('[]')).toBeNull();
    expect(parseBatch(body([{ n: 'tour_offer' }], 'not-a-uuid'))).toBeNull();
    expect(parseBatch(body([{ n: 'tour_offer' }], SID.toUpperCase()))).toBeNull();
    expect(parseBatch(body([]))).toBeNull();
    expect(parseBatch(body({ n: 'tour_offer' }))).toBeNull();
    expect(parseBatch(body(Array.from({ length: MAX_EVENTS + 1 }, () => ({ n: 'tour_offer' }))))).toBeNull();
    // nothing on the list
    expect(parseBatch(body([{ n: 'evil', p: {} }]))).toBeNull();
    // props that are not an object count as none
    expect(parseBatch(body([{ n: 'app_open', p: ['x'] }]))?.events).toEqual([{ n: 'app_open', t: 0, p: {} }]);
  });
});

describe('the request', () => {
  it('comes from our pages only (localhost with DEV_ORIGINS)', () => {
    const ours = 'https://donya.dev, https://www.donya.dev/';
    expect(originAllowed('https://donya.dev', ours, false)).toBe(true);
    expect(originAllowed('https://www.donya.dev', ours, false)).toBe(true);
    expect(originAllowed('https://evil.example', ours, false)).toBe(false);
    expect(originAllowed('https://donya.dev.evil.example', ours, false)).toBe(false);
    expect(originAllowed('', ours, false)).toBe(false);
    expect(originAllowed('http://localhost:5173', ours, false)).toBe(false);
    expect(originAllowed('http://localhost:5173', ours, true)).toBe(true);
    expect(originAllowed('http://127.0.0.1:4175', ours, true)).toBe(true);
    expect(originAllowed('http://localhost.evil.example', ours, true)).toBe(false);
    expect(requestOrigin('https://Donya.dev/', null)).toBe('https://donya.dev');
    expect(requestOrigin(null, 'https://www.donya.dev/resume?x=1')).toBe('https://www.donya.dev');
    expect(requestOrigin('null', 'nonsense')).toBe('');
  });
  it('is not from a bot', () => {
    expect(isBot('')).toBe(true);
    expect(isBot('curl/8.7.1')).toBe(true);
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBot('Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/142.0 Safari/537.36')).toBe(true);
    expect(isBot('okhttp/4.12')).toBe(true);
    expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/142.0 Safari/537.36')).toBe(
      false,
    );
  });
  it('keeps only a browser and an OS family of the User-Agent', () => {
    expect(uaClass('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1')).toEqual({
      browser: 'Safari',
      os: 'iOS',
    });
    expect(uaClass('Mozilla/5.0 (Linux; Android 14) Chrome/142.0 Mobile Safari/537.36')).toEqual({
      browser: 'Chrome',
      os: 'Android',
    });
    expect(uaClass('Mozilla/5.0 (Windows NT 10.0) Chrome/142.0 Safari/537.36 Edg/142.0')).toEqual({
      browser: 'Edge',
      os: 'Windows',
    });
    expect(uaClass('Mozilla/5.0 (Macintosh) YaBrowser/25.1 Safari/537.36')).toEqual({ browser: 'Yandex', os: 'macOS' });
    expect(uaClass('something')).toEqual({ browser: 'other', os: 'other' });
  });
  it('hashes the visitor with the salt, short', async () => {
    const a = await visitorHash('salt1', '203.0.113.5', 'UA');
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await visitorHash('salt1', '203.0.113.5', 'UA')).toBe(a);
    expect(await visitorHash('salt2', '203.0.113.5', 'UA')).not.toBe(a);
  });
  it('compares the digest key exactly', () => {
    expect(sameSecret('abc', 'abc')).toBe(true);
    expect(sameSecret('abc', 'abd')).toBe(false);
    expect(sameSecret('abc', 'abcd')).toBe(false);
    expect(sameSecret('abc', '')).toBe(false);
  });
});

describe("Phuket's clock", () => {
  // 2026-11-24 20:30 UTC is 2026-11-25 03:30 in Phuket
  const t = Date.UTC(2026, 10, 24, 20, 30);
  it('gives the day and the hour there', () => {
    expect(phuketDay(t)).toBe('2026-11-25');
    expect(phuketTime(t)).toEqual({ hour: 3, hhmm: '03:30' });
    expect(phuketDayBefore(t, 1)).toBe('2026-11-24');
    expect(phuketDayBefore(t, 180)).toBe('2026-05-29');
  });
  it('checks a day', () => {
    expect(isDay('2026-11-24')).toBe(true);
    expect(isDay('2026-13-40')).toBe(false);
    expect(isDay('yesterday')).toBe(false);
  });
});

describe('the visit message', () => {
  it('formats times', () => {
    expect(duration(45_000)).toBe('45 с');
    expect(duration(192_000)).toBe('3 мин 12 с');
    expect(duration(3_900_000)).toBe('1 ч 05 мин');
    expect(clock(160_000)).toBe('2:40');
    expect(clock(3_723_000)).toBe('1:02:03');
    expect(clock(-5)).toBe('0:00');
  });
  it('says how long, on what, from where, and how far the visit went', () => {
    const events: VisitEvent[] = [
      { n: 'visit_start', p: { route: 'home', lang: 'ru', blang: 'ru', device: 'phone', ref: 'hh.ru' } },
      { n: 'tour_offer', p: {} },
      { n: 'tour_accept', p: {} },
      { n: 'tour_step', p: { step: 'work' } },
      { n: 'tour_complete', p: {} },
      { n: 'pc_enter', p: { screen: 'left' } },
      { n: 'app_open', p: { app: 'projects' } },
      { n: 'app_open', p: { app: 'resume' } },
      { n: 'app_open', p: { app: 'kompy-app' } },
      { n: 'site_window_open', p: { site: 'kompy' } },
      { n: 'visit_end', p: { activeMs: 160_000, totalMs: 192_000 } },
      // an older beacon, late: the longest visit wins
      { n: 'visit_end', p: { activeMs: 60_000, totalMs: 60_000 } },
    ];
    expect(visitText(buildVisit(events, 'Safari/iOS'))).toBe(
      '👀 Визит 3 мин 12 с (активно 2:40) · телефон · RU · пришёл: hh.ru · Safari/iOS\n' +
        'экскурсия: да, до конца → компьютер → Проекты, Резюме → Компи (сайт)',
    );
  });
  it('shows the utm, the route, a tour cut short, the resume and the rest', () => {
    const v = buildVisit([
      {
        n: 'visit_start',
        p: { route: 'resume', lang: 'en', device: 'desktop', ref: 'direct', utm: 'test-from-claude' },
      },
      { n: 'tour_accept', p: {} },
      { n: 'tour_step', p: { step: 'work' } },
      { n: 'tour_step', p: { step: 'play' } },
      { n: 'pc_enter', p: {} },
      { n: 'pc_exit', p: { how: 'shutdown' } },
      { n: 'resume_open', p: { from: 'header' } },
      { n: 'resume_open', p: { from: 'desktop' } },
      { n: 'project_open', p: { id: 'verifikat' } },
      { n: 'diploma_click', p: {} },
      { n: 'lang_switch', p: { to: 'ru' } },
      { n: 'visit_end', p: { activeMs: 95_000, totalMs: 100_000 } },
    ]);
    expect(visitText(v)).toBe(
      '👀 Визит 1 мин 40 с (активно 1:35) · десктоп · EN · пришёл: напрямую (utm test-from-claude) · /resume\n' +
        'экскурсия: да, до «игры» → компьютер (выключил) → Верификат → лист резюме (кнопка, с компьютера) → диплом → язык → RU',
    );
  });
  it('for a visit that only looked', () => {
    const v = buildVisit([
      { n: 'tour_offer', p: {} },
      { n: 'visit_end', p: { activeMs: 4000, totalMs: 5000 } },
    ]);
    expect(visitText(v)).toBe('👀 Визит 5 с (активно 0:04)\nэкскурсия: без ответа');
    expect(visitText(buildVisit([]))).toBe('👀 Визит 0 с (активно 0:00)\nпосмотрел комнату');
  });
});

describe('the digest', () => {
  const row = (session: string, visitor: string, event: string, props: Record<string, unknown> = {}): DigestRow => ({
    session,
    visitor,
    event,
    props,
  });
  it('counts visits, visitors, times, sources and what they did', () => {
    const rows = [
      row('a', 'v1', 'visit_start', { ref: 'hh.ru', device: 'phone' }),
      row('a', 'v1', 'tour_accept'),
      row('a', 'v1', 'pc_enter'),
      row('a', 'v1', 'app_open', { app: 'resume' }),
      row('a', 'v1', 'app_open', { app: 'paint' }),
      row('a', 'v1', 'visit_end', { activeMs: 60_000 }),
      row('a', 'v1', 'visit_end', { activeMs: 90_000 }),
      row('b', 'v1', 'visit_start', { ref: 'direct', device: 'desktop' }),
      row('b', 'v1', 'app_open', { app: 'paint' }),
      row('b', 'v1', 'visit_end', { activeMs: 30_000 }),
      row('c', 'v2', 'visit_start', { ref: 'hh.ru', device: 'phone' }),
      row('c', 'v2', 'resume_open', { from: 'header' }),
      row('c', 'v2', 'visit_end', { activeMs: 10_000 }),
      row('d', 'v3', 'visit_start', { device: 'tablet' }),
    ];
    const d = digest(rows);
    expect(d).toMatchObject({ visits: 4, visitors: 3, median: 30_000, average: 43_333, tour: 1, pc: 1, resume: 2 });
    expect(d.refs).toEqual([
      ['hh.ru', 2],
      ['direct', 2],
    ]);
    expect(digestText('2026-11-24', d)).toBe(
      [
        '📊 Сводка за 24.11.2026',
        'Визитов: 4 · уникальных посетителей: 3',
        'Активное время: медиана 0:30, среднее 0:43',
        'Откуда: hh.ru 2, напрямую 2',
        'Устройства: телефон 2, десктоп 1, планшет 1',
        'Экскурсия 25% · компьютер 25% · резюме 50%',
        'Приложения: Кисть 2, Резюме 1',
      ].join('\n'),
    );
  });
  it('says so when there were no visits', () => {
    expect(digestText('2026-11-24', digest([]))).toBe('📊 Сводка за 24.11.2026: визитов не было');
  });
  it('takes the median of an even count as the mean of the middle two', () => {
    const d = digest([row('a', 'v', 'visit_end', { activeMs: 1000 }), row('b', 'v', 'visit_end', { activeMs: 4000 })]);
    expect(d.median).toBe(2500);
  });
});
