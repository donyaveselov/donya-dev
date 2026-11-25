// The pure part of the analytics Worker: what a request may hold, the visitor, the visit's Telegram message and the
// daily digest. No bindings, no network: index.ts does the D1 and Telegram work, the tests (lib.test.ts) run this in
// Node. The event list itself is the page's: src/services/analytics.schema.ts.
import { MAX_BYTES, isEventName, sanitize } from '../../src/services/analytics.schema';
import type { EventName } from '../../src/services/analytics.schema';

export { MAX_BYTES };

/** Phuket: the days, the salt and the digest go by its clock. */
export const TZ = 'Asia/Bangkok';
export const MAX_EVENTS = 80;
/** per visitor: this many events per window (s) */
export const RATE_MAX = 120;
export const RATE_WINDOW = 600;
/** a later visit_end edits the visit's message for this long (s) after it was sent... */
export const EDIT_WINDOW = 1800;
/** ...and at most once in this long (s) */
export const EDIT_EVERY = 60;
/** visits with less active time get no message */
export const MIN_ACTIVE_MS = 3000;
export const KEEP_DAYS = 180;

/** Crawlers, link previews, headless browsers and scripts (an empty User-Agent counts too). Wider than the page's. */
const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender|phantom|selenium|puppeteer|playwright|preview|facebookexternalhit|embedly|curl|wget|python|go-http|java\/|httpclient|okhttp|axios|node-fetch|scrapy|^$/i;

const SESSION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* ---------- the request ---------- */

export interface CleanEvent {
  n: EventName;
  /** ms since the visit began, by the page's clock */
  t: number;
  p: Record<string, unknown>;
}

export interface Batch {
  session: string;
  events: CleanEvent[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * A body as the page sends it, {"s": "<session uuid>", "e": [{"n", "t", "p"}]}, with only the events and props of the
 * list kept; null when it is malformed or nothing in it is on the list.
 */
export function parseBatch(body: string): Batch | null {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  const { s, e } = data;
  if (typeof s !== 'string' || !SESSION_RE.test(s)) return null;
  if (!Array.isArray(e) || e.length === 0 || e.length > MAX_EVENTS) return null;
  const events: CleanEvent[] = [];
  for (const ev of e as unknown[]) {
    if (!isRecord(ev) || !isEventName(ev.n)) continue;
    const p = sanitize(ev.n, ev.p ?? {});
    if (p === null) continue;
    const t = typeof ev.t === 'number' && Number.isFinite(ev.t) ? Math.trunc(Math.max(0, Math.min(1e10, ev.t))) : 0;
    events.push({ n: ev.n, t, p });
  }
  return events.length ? { session: s, events } : null;
}

export const isBot = (ua: string): boolean => BOT_UA.test(ua);

/** The request's origin: the Origin header, else the scheme, host and port of the Referer; '' when neither. */
export function requestOrigin(origin: string | null, referer: string | null): string {
  if (origin && origin !== 'null') return origin.toLowerCase().replace(/\/+$/, '');
  try {
    return referer ? new URL(referer).origin.toLowerCase() : '';
  } catch {
    return '';
  }
}

/** Our pages (a comma list), plus http://localhost:<port> and http://127.0.0.1:<port> when dev is on. */
export function originAllowed(origin: string, allowed: string, dev: boolean): boolean {
  if (!origin) return false;
  const list = allowed
    .split(',')
    .map((o) => o.trim().toLowerCase().replace(/\/+$/, ''))
    .filter(Boolean);
  if (list.includes(origin)) return true;
  return dev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin);
}

/* ---------- the visitor ---------- */

export interface UaClass {
  browser: string;
  os: string;
}

/** A browser family and an OS family ("Chrome", "Android"), nothing finer. */
export function uaClass(ua: string): UaClass {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : ua.includes('Android')
      ? 'Android'
      : ua.includes('CrOS')
        ? 'ChromeOS'
        : ua.includes('Windows')
          ? 'Windows'
          : ua.includes('Macintosh') || ua.includes('Mac OS X')
            ? 'macOS'
            : ua.includes('Linux')
              ? 'Linux'
              : 'other';
  const browser = ua.includes('YaBrowser')
    ? 'Yandex'
    : ua.includes('Edg')
      ? 'Edge'
      : ua.includes('OPR/') || ua.includes('Opera')
        ? 'Opera'
        : ua.includes('SamsungBrowser')
          ? 'Samsung'
          : ua.includes('Firefox/') || ua.includes('FxiOS')
            ? 'Firefox'
            : ua.includes('Chrome/') || ua.includes('CriOS')
              ? 'Chrome'
              : ua.includes('Safari/')
                ? 'Safari'
                : 'other';
  return { browser, os };
}

const hex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** sha256(daily salt + ip + ua), its first 16 hex digits: the same visitor all day, a stranger the next. */
export async function visitorHash(salt: string, ip: string, ua: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip + ua));
  return hex(digest).slice(0, 16);
}

export function randomHex(bytes: number): string {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

/** Constant-time string comparison, for the digest key. */
export function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/* ---------- Phuket's clock ---------- */

const parts = (ms: number): Record<string, string> =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(ms)
      .map((p) => [p.type, p.value]),
  );

/** "2026-11-25", the Phuket day of a moment. */
export function phuketDay(ms: number): string {
  const p = parts(ms);
  return `${p.year ?? ''}-${p.month ?? ''}-${p.day ?? ''}`;
}

/** The Phuket hour (0-23) and "HH:MM" of a moment. */
export function phuketTime(ms: number): { hour: number; hhmm: string } {
  const p = parts(ms);
  return { hour: Number(p.hour), hhmm: `${p.hour ?? ''}:${p.minute ?? ''}` };
}

/** The Phuket day `days` before the moment's (Thailand keeps no daylight saving time). */
export const phuketDayBefore = (ms: number, days: number): string => phuketDay(ms - days * 86_400_000);

export const isDay = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/* ---------- words for the messages ---------- */

export const DEVICE_RU: Readonly<Record<string, string>> = { phone: 'телефон', tablet: 'планшет', desktop: 'десктоп' };

const APP_RU: Readonly<Record<string, string>> = {
  projects: 'Проекты',
  resume: 'Резюме',
  about: 'Мой компьютер',
  contact: 'Написать мне',
  browser: 'Навигатор',
  terminal: 'Командная строка',
  notepad: 'Блокнот',
  calc: 'Калькулятор',
  paint: 'Кисть',
  minesweeper: 'Сапёр',
  recycle: 'Корзина',
  run: 'Выполнить',
  taskmgr: 'Диспетчер задач',
  display: 'Свойства экрана',
  project: 'Проект',
  wax: 'Wax',
  'kompy-app': 'Компи',
};

const PROJECT_RU: Readonly<Record<string, string>> = { verifikat: 'Верификат', wax: 'Wax', kompy: 'Компи' };

const STEP_RU: Readonly<Record<string, string>> = {
  work: 'работа',
  play: 'игры',
  outside: 'на улице',
  sleep: 'сон',
  back: 'сейчас',
  projects: 'проекты',
  resume: 'резюме',
  diploma: 'диплом',
  place: 'место',
  end: 'конец',
};

const RESUME_VIA_RU: Readonly<Record<string, string>> = {
  header: 'кнопка',
  frame: 'рамка',
  desktop: 'с компьютера',
  route: 'ссылка',
};

const word = (dict: Readonly<Record<string, string>>, k: string): string => (Object.hasOwn(dict, k) ? dict[k] : k) ?? k;
export const appName = (id: string): string => word(APP_RU, id);

const secs = (ms: number): number => Math.floor((Math.max(0, ms) + 500) / 1000);
const two = (n: number): string => String(n).padStart(2, '0');

/** "3 мин 12 с", "45 с", "1 ч 05 мин". */
export function duration(ms: number): string {
  const s = secs(ms);
  if (s < 60) return `${String(s)} с`;
  if (s < 3600) return `${String(Math.floor(s / 60))} мин ${String(s % 60)} с`;
  return `${String(Math.floor(s / 3600))} ч ${two(Math.floor((s % 3600) / 60))} мин`;
}

/** "2:40", "1:02:03". */
export function clock(ms: number): string {
  const s = secs(ms);
  if (s >= 3600) return `${String(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  return `${String(Math.floor(s / 60))}:${two(s % 60)}`;
}

/* ---------- the visit ---------- */

export interface VisitEvent {
  n: string;
  p: Record<string, unknown>;
}

/** A visit's summary, built up from its events. */
export interface Visit {
  start?: Record<string, unknown>;
  /** "Chrome/Android" */
  ua?: string;
  tour: {
    offered?: boolean;
    accepted?: boolean;
    declined?: boolean;
    step?: string;
    skipped?: string | true;
    done?: boolean;
  };
  pc?: boolean;
  shutdown?: boolean;
  apps: string[];
  projects: string[];
  sites: string[];
  resume: string[];
  diploma?: boolean;
  lang?: string;
  end?: { totalMs: number; activeMs: number };
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const addOnce = (list: string[], x: string | undefined): void => {
  if (x !== undefined && !list.includes(x)) list.push(x);
};

/** The visit's summary from its events, in order; `ua` is the class of its first request. */
export function buildVisit(events: readonly VisitEvent[], ua?: string): Visit {
  const v: Visit = { tour: {}, apps: [], projects: [], sites: [], resume: [] };
  if (ua !== undefined) v.ua = ua;
  for (const { n, p } of events) {
    switch (n) {
      case 'visit_start':
        v.start ??= p;
        break;
      case 'tour_offer':
        v.tour.offered = true;
        break;
      case 'tour_accept':
        v.tour.accepted = true;
        break;
      case 'tour_decline':
        v.tour.declined = true;
        break;
      case 'tour_step': {
        const step = str(p.step);
        if (step === undefined) delete v.tour.step;
        else v.tour.step = step;
        break;
      }
      case 'tour_skip':
        v.tour.skipped = str(p.step) ?? true;
        break;
      case 'tour_complete':
        v.tour.done = true;
        break;
      case 'pc_enter':
        v.pc = true;
        break;
      case 'pc_exit':
        if (p.how === 'shutdown') v.shutdown = true;
        break;
      case 'app_open':
        addOnce(v.apps, str(p.app));
        break;
      case 'project_open':
        addOnce(v.projects, str(p.id));
        break;
      case 'site_window_open':
        addOnce(v.sites, str(p.site));
        break;
      case 'resume_open':
        addOnce(v.resume, str(p.from) ?? '?');
        break;
      case 'diploma_click':
        v.diploma = true;
        break;
      case 'lang_switch': {
        const to = str(p.to);
        if (to !== undefined) v.lang = to;
        break;
      }
      case 'visit_end': {
        const total = Math.trunc(num(p.totalMs));
        const active = Math.trunc(num(p.activeMs));
        // the latest beacons can arrive out of order: keep the longest
        if (total >= (v.end?.totalMs ?? -1))
          v.end = { totalMs: total, activeMs: Math.max(active, v.end?.activeMs ?? 0) };
        break;
      }
    }
  }
  return v;
}

/** The visit's message, in Russian: how long, on what, from where; then how far it went. */
export function visitText(v: Visit): string {
  const start = v.start ?? {};
  const end = v.end ?? { totalMs: 0, activeMs: 0 };
  const head = [`👀 Визит ${duration(end.totalMs)} (активно ${clock(end.activeMs)})`];
  const device = str(start.device);
  if (device !== undefined) head.push(word(DEVICE_RU, device));
  const lang = str(start.blang) ?? str(start.lang) ?? '';
  if (lang !== '') head.push(lang.toUpperCase());
  const ref = str(start.ref) ?? '';
  if (ref !== '') {
    let from = `пришёл: ${ref === 'direct' ? 'напрямую' : ref}`;
    const utm = str(start.utm);
    if (utm !== undefined) from += ` (utm ${utm})`;
    head.push(from);
  }
  const route = str(start.route);
  if (route !== undefined && route !== 'home') head.push(`/${route}`);
  if (v.ua !== undefined) head.push(v.ua);

  const path: string[] = [];
  const { tour } = v;
  if (tour.accepted) {
    if (tour.done) path.push('экскурсия: да, до конца');
    else {
      const step = tour.step !== undefined ? word(STEP_RU, tour.step) : undefined;
      path.push(`экскурсия: да${step !== undefined ? `, до «${step}»` : ''}`);
    }
  } else if (tour.declined) path.push('экскурсия: нет');
  else if (tour.offered) path.push('экскурсия: без ответа');
  if (v.pc) path.push(`компьютер${v.shutdown ? ' (выключил)' : ''}`);
  const siteApps = ['wax', 'kompy-app', 'project'];
  const apps = v.apps.filter((a) => !siteApps.includes(a));
  if (apps.length) path.push(apps.map(appName).join(', '));
  const works = new Map<string, string>();
  for (const s of v.sites) works.set(s, `${word(PROJECT_RU, s)} (сайт)`);
  for (const p of v.projects) if (!works.has(p)) works.set(p, word(PROJECT_RU, p));
  if (works.size) path.push([...works.values()].join(', '));
  if (v.resume.length) path.push(`лист резюме (${v.resume.map((k) => word(RESUME_VIA_RU, k)).join(', ')})`);
  if (v.diploma) path.push('диплом');
  if (v.lang !== undefined) path.push(`язык → ${v.lang.toUpperCase()}`);
  return `${head.join(' · ')}\n${path.length ? path.join(' → ') : 'посмотрел комнату'}`;
}

/* ---------- the daily digest ---------- */

export interface DigestRow {
  session: string;
  visitor: string;
  event: string;
  props: Record<string, unknown>;
}

export interface Digest {
  visits: number;
  visitors: number;
  median: number;
  average: number;
  refs: [string, number][];
  devices: [string, number][];
  tour: number;
  pc: number;
  resume: number;
  apps: [string, number][];
}

/** Counts, most first (ties in the order first seen). */
const ranked = (counts: Map<string, number>, top = Infinity): [string, number][] =>
  [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);

const bump = (counts: Map<string, number>, k: string): void => {
  counts.set(k, (counts.get(k) ?? 0) + 1);
};

/** The day's numbers, from its events in order. */
export function digest(rows: readonly DigestRow[]): Digest {
  interface V {
    active: number | null;
    ref: string | null;
    device: string | null;
    tour: boolean;
    pc: boolean;
    resume: boolean;
    apps: Set<string>;
  }
  const visits = new Map<string, V>();
  const visitors = new Set<string>();
  for (const r of rows) {
    visitors.add(r.visitor);
    let v = visits.get(r.session);
    if (!v) {
      v = { active: null, ref: null, device: null, tour: false, pc: false, resume: false, apps: new Set() };
      visits.set(r.session, v);
    }
    const p = r.props;
    switch (r.event) {
      case 'visit_start':
        v.ref ??= str(p.ref) ?? 'direct';
        v.device ??= str(p.device) ?? '';
        break;
      case 'visit_end':
        v.active = Math.max(v.active ?? 0, Math.trunc(num(p.activeMs)));
        break;
      case 'tour_accept':
        v.tour = true;
        break;
      case 'pc_enter':
        v.pc = true;
        break;
      case 'resume_open':
        v.resume = true;
        break;
      case 'app_open': {
        const app = str(p.app) ?? '';
        if (app === 'resume') v.resume = true;
        if (app !== '') v.apps.add(app);
        break;
      }
    }
  }
  const times: number[] = [];
  const refs = new Map<string, number>();
  const devices = new Map<string, number>();
  const apps = new Map<string, number>();
  let tour = 0;
  let pc = 0;
  let resume = 0;
  for (const v of visits.values()) {
    if (v.active !== null) times.push(v.active);
    if (v.ref !== null) bump(refs, v.ref);
    if (v.device) bump(devices, v.device);
    for (const a of v.apps) bump(apps, a);
    tour += Number(v.tour);
    pc += Number(v.pc);
    resume += Number(v.resume);
  }
  times.sort((a, b) => a - b);
  const n = times.length;
  const mid = Math.floor(n / 2);
  const median = n === 0 ? 0 : n % 2 ? (times[mid] ?? 0) : Math.floor(((times[mid - 1] ?? 0) + (times[mid] ?? 0)) / 2);
  return {
    visits: visits.size,
    visitors: visitors.size,
    median,
    average: n ? Math.floor(times.reduce((a, b) => a + b, 0) / n) : 0,
    refs: ranked(refs, 5),
    devices: ranked(devices),
    tour,
    pc,
    resume,
    apps: ranked(apps, 5),
  };
}

export function digestText(day: string, d: Digest): string {
  const [y, m, dd] = day.split('-');
  const title = `📊 Сводка за ${isDay(day) ? `${dd ?? ''}.${m ?? ''}.${y ?? ''}` : day}`;
  if (d.visits === 0) return `${title}: визитов не было`;
  const share = (k: number): string => `${String(Math.round((100 * k) / d.visits))}%`;
  const list = (counts: [string, number][], name: (k: string) => string): string =>
    counts.map(([k, n]) => `${name(k)} ${String(n)}`).join(', ');
  const lines = [
    title,
    `Визитов: ${String(d.visits)} · уникальных посетителей: ${String(d.visitors)}`,
    `Активное время: медиана ${clock(d.median)}, среднее ${clock(d.average)}`,
  ];
  if (d.refs.length) lines.push(`Откуда: ${list(d.refs, (r) => (r === 'direct' ? 'напрямую' : r))}`);
  if (d.devices.length) lines.push(`Устройства: ${list(d.devices, (k) => word(DEVICE_RU, k))}`);
  lines.push(`Экскурсия ${share(d.tour)} · компьютер ${share(d.pc)} · резюме ${share(d.resume)}`);
  if (d.apps.length) lines.push(`Приложения: ${list(d.apps, appName)}`);
  return lines.join('\n');
}
