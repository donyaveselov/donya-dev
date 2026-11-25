// Visit analytics without personal data: what a visitor did here (the tour, the PC, the apps, the resume) and for how
// long, batched to /api/collect.php (public/api: PHP on the host), which logs it and tells the owner in Telegram.
// No cookies, no ids in localStorage, no fingerprint: a random id per tab in sessionStorage, a coarse device class and
// viewport, the referrer's host only. Off in dev (unless VITE_ANALYTICS=1), with Do Not Track or Global Privacy
// Control, for automated browsers and in debug mode. Until initAnalytics() turns it on, track() does nothing.
// The event list (SCHEMA) is mirrored in public/api/analytics-lib.php: an event or a prop missing there is dropped.
import type { Lang } from '../types';
import { debugWanted } from '../utils/debug';
import { ROUTES } from '../modules/room/routes';
import { routeName } from './router.service';

export type Device = 'phone' | 'tablet' | 'desktop';

/** How far the visit got, in the order it is usually reached; visit_end lists the ones reached. */
const MILESTONES = ['tour', 'tour_done', 'pc', 'app', 'resume', 'project', 'site'] as const;
export type Milestone = (typeof MILESTONES)[number];

const LANGS = ['ru', 'en'] as const satisfies readonly Lang[];

/** A prop's kind: a slug (lowercase id), a short text, a whole number, a flag, one of a list, or a list of those. */
type Spec = 'id' | 'text' | 'int' | 'bool' | readonly string[] | { readonly list: readonly string[] };

/** Every event and its props: the only data that leaves the page. */
export const SCHEMA = {
  /** the first page of a tab's visit */
  visit_start: {
    /** the route ('home', 'resume', 'pc', ...; 'other' for an unknown path) and the #fragment */
    route: 'id',
    hash: 'id',
    /** the page's language and the browser's (its primary subtag) */
    lang: LANGS,
    blang: 'id',
    device: ['phone', 'tablet', 'desktop'],
    /** the window in CSS px, rounded to tens: "390x840" */
    vp: 'text',
    /** the referrer's host, or 'direct' */
    ref: 'text',
    utm: 'text',
  },
  /** the talkie asks (replay: from its corner button, which starts at the first step) */
  tour_offer: {},
  tour_accept: { replay: 'bool' },
  tour_decline: {},
  tour_step: { step: 'id' },
  /** Skip in the middle; `step` is where */
  tour_skip: { step: 'id' },
  tour_complete: {},
  /** the fly-in to a monitor (or the desktop without the room); the way out: Log Off / Esc, or Turn Off Computer */
  pc_enter: { screen: ['left', 'right', 'flat'] },
  pc_exit: { how: ['normal', 'shutdown'] },
  app_open: { app: 'id' },
  resume_open: { from: ['header', 'frame', 'desktop', 'route'] },
  diploma_click: {},
  project_open: { id: 'id' },
  site_window_open: { site: 'id' },
  lang_switch: { to: LANGS },
  /** sent when the tab hides or closes and every minute while it is shown: the latest wins on the server */
  visit_end: { activeMs: 'int', totalMs: 'int', maxDepth: { list: MILESTONES } },
} as const satisfies Record<string, Record<string, Spec>>;

type Value<S> = S extends 'id' | 'text'
  ? string
  : S extends 'int'
    ? number
    : S extends 'bool'
      ? boolean
      : S extends { readonly list: readonly (infer V)[] }
        ? V[]
        : S extends readonly (infer V)[]
          ? V
          : never;

export type EventName = keyof typeof SCHEMA;
export type EventProps = {
  [E in EventName]: { -readonly [K in keyof (typeof SCHEMA)[E]]: Value<(typeof SCHEMA)[E][K]> };
};
/** One event with its props, as a discriminated union on `e`. */
export type AnalyticsEvent = { [E in EventName]: { e: E; p: EventProps[E] } }[EventName];
/** What the page's own code may track; the visit's start and end belong to this module. */
export type TrackedEvent = Exclude<EventName, 'visit_start' | 'visit_end'>;

/** The endpoint, at the site's root (public/api/collect.php). */
const COLLECT_URL = '/api/collect.php';
/** The server refuses a bigger body. */
export const MAX_BYTES = 4096;
const ID_MAX = 32;
const TEXT_MAX = 64;
/** Input within this long counts the time as active. */
export const IDLE_MS = 60_000;
/** Inputs closer together than this are one. */
const INPUT_EVERY_MS = 1000;
const HEARTBEAT_MS = 60_000;
/** Queued events go out this long after the first of them (or at once when the tab hides). */
const BATCH_MS = 5000;
const STORE_KEY = 'dd.visit';
/** A visit_end is sent again only for this much more active time (or with other events). */
const END_STEP_MS = 1000;

/** Crawlers, link previews, headless and scripted browsers. */
const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender|phantom|selenium|puppeteer|playwright|preview|facebookexternalhit|embedly|curl|wget|python|go-http|java\//i;

/* ---------- what a prop may hold ---------- */

const MILESTONE_IDS: readonly string[] = MILESTONES;

function clean(spec: Spec, v: unknown): unknown {
  if (spec === 'id')
    return typeof v === 'string'
      ? v
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, '')
          .slice(0, ID_MAX)
      : undefined;
  if (spec === 'text')
    return typeof v === 'string'
      ? v
          .replace(/[\p{Cc}\p{Cf}]/gu, '')
          .trim()
          .slice(0, TEXT_MAX)
      : undefined;
  if (spec === 'int')
    return typeof v === 'number' && Number.isFinite(v) ? Math.min(1e9, Math.max(0, Math.round(v))) : undefined;
  if (spec === 'bool') return typeof v === 'boolean' ? v : undefined;
  if ('list' in spec) {
    if (!Array.isArray(v)) return undefined;
    const allowed: readonly string[] = spec.list;
    return [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.includes(x)))];
  }
  return typeof v === 'string' && spec.includes(v) ? v : undefined;
}

/**
 * The props an event may send, cleaned: unknown props are dropped, ids are slugs, texts are cut short, a value outside
 * its list goes, empty strings and lists are left out. null for an event that is not in the list.
 */
export function sanitize(event: string, props: Readonly<Record<string, unknown>> = {}): Record<string, unknown> | null {
  if (!Object.hasOwn(SCHEMA, event)) return null;
  const specs: Readonly<Record<string, Spec>> = SCHEMA[event as EventName];
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(specs)) {
    const v = clean(spec, props[key]);
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    out[key] = v;
  }
  return out;
}

/* ---------- the visitor, coarsely ---------- */

/** A touch screen with a short side under 600 px is a phone, a bigger one a tablet; a mouse is a desktop. */
export function deviceClass(coarse: boolean, w: number, h: number): Device {
  if (!coarse) return 'desktop';
  return Math.min(w, h) < 600 ? 'phone' : 'tablet';
}

/** The window rounded to tens of CSS px: "390x840". */
export const viewportBucket = (w: number, h: number): string =>
  `${String(Math.round(w / 10) * 10)}x${String(Math.round(h / 10) * 10)}`;

/** The referrer's host alone (no path, no query, no www.), or 'direct': none, this site itself, or not a web page. */
export function referrerHost(referrer: string, ownHost: string): string {
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return 'direct';
  }
  if (!['http:', 'https:', 'android-app:'].includes(url.protocol)) return 'direct';
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!host || host === ownHost.toLowerCase().replace(/^www\./, '')) return 'direct';
  return host.slice(0, TEXT_MAX);
}

/** The route the page was opened at: its name, 'home' for /, 'other' for an unknown path. */
export function routeLabel(path: string): string {
  const name = routeName(path);
  if (!name) return 'home';
  return Object.hasOwn(ROUTES, name) ? name : 'other';
}

interface Privacy {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
  webdriver?: boolean;
  userAgent?: string;
}

/** Whether to count this visit: not with Do Not Track or Global Privacy Control, not for a bot or a driven browser. */
export function mayTrack(nav: Privacy): boolean {
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl === true) return false;
  if (nav.webdriver === true) return false;
  return !BOT_UA.test(nav.userAgent ?? '');
}

/** On in production builds unless VITE_ANALYTICS=0; in dev only with VITE_ANALYTICS=1. */
export function enabledBuild(env: { DEV: boolean; VITE_ANALYTICS?: string }): boolean {
  return env.VITE_ANALYTICS === '1' || (!env.DEV && env.VITE_ANALYTICS !== '0');
}

/* ---------- active time ---------- */

/**
 * Time that counts: the tab is visible and there was input (pointer, key, scroll) within the last minute. Accrued
 * lazily: each call first credits the time since the previous one, up to a minute after the last input.
 */
export class ActiveClock {
  private from: number;
  private lastInput: number;

  constructor(
    now: number,
    private visible: boolean,
    /** carried over from earlier pages of the visit */
    private active = 0,
  ) {
    this.from = now;
    this.lastInput = now; // opening the page is an input
  }

  private accrue(now: number): void {
    if (this.visible) {
      const end = Math.min(now, this.lastInput + IDLE_MS);
      if (end > this.from) this.active += end - this.from;
    }
    this.from = Math.max(this.from, now);
  }

  input(now: number): void {
    if (now - this.lastInput < INPUT_EVERY_MS) return;
    this.accrue(now);
    this.lastInput = now;
  }

  /** The tab was shown (which is an input) or hidden. */
  setVisible(visible: boolean, now: number): void {
    this.accrue(now);
    this.visible = visible;
    if (visible) this.lastInput = now;
  }

  /** The active time so far, ms. */
  read(now: number): number {
    this.accrue(now);
    return this.active;
  }
}

/* ---------- the wire ---------- */

/** An event on the wire: name, ms since the visit began, props (left out when empty). */
export interface WireEvent {
  n: EventName;
  t: number;
  p?: Record<string, unknown>;
}

const bytes = (s: string): number => new TextEncoder().encode(s).length;

/**
 * The bodies to send: {"s": session, "e": [events]}, as few as fit MAX_BYTES each, in order. An event too big for a
 * body of its own is dropped (sanitize keeps them far smaller).
 */
export function pack(session: string, events: readonly WireEvent[]): string[] {
  const head = `{"s":${JSON.stringify(session)},"e":[`;
  const empty = bytes(head) + 2; // and "]}"
  const bodies: string[] = [];
  let parts: string[] = [];
  let size = empty;
  for (const ev of events) {
    const json = JSON.stringify(ev);
    const n = bytes(json);
    if (empty + n > MAX_BYTES) continue;
    if (parts.length && size + 1 + n > MAX_BYTES) {
      bodies.push(`${head}${parts.join(',')}]}`);
      parts = [];
      size = empty;
    }
    size += n + (parts.length ? 1 : 0);
    parts.push(json);
  }
  if (parts.length) bodies.push(`${head}${parts.join(',')}]}`);
  return bodies;
}

function send(url: string, body: string): void {
  try {
    if (navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
  } catch {
    // no beacon (or it refused the body): fetch below
  }
  void fetch(url, {
    method: 'POST',
    body,
    keepalive: true,
    credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  }).catch(() => undefined);
}

/* ---------- the visit ---------- */

/** What one tab's visit keeps across its pages (a reload, a route opened in the same tab). */
interface Visit {
  id: string;
  /** when the visit began, ms since the epoch */
  t0: number;
  active: number;
  depth: Milestone[];
}

function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function loadVisit(): Visit | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Visit> | null) : null;
    if (v && typeof v.id === 'string' && typeof v.t0 === 'number' && typeof v.active === 'number')
      return {
        id: v.id,
        t0: v.t0,
        active: v.active,
        depth: Array.isArray(v.depth) ? v.depth.filter((m) => MILESTONE_IDS.includes(m)) : [],
      };
  } catch {
    // no storage (or blocked): a new visit, kept in memory
  }
  return null;
}

function saveVisit(v: Visit): void {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(v));
  } catch {
    // the visit then ends with the page
  }
}

/** The milestone an event reaches, if any. */
const REACHES: Partial<Record<EventName, Milestone>> = {
  tour_accept: 'tour',
  tour_complete: 'tour_done',
  pc_enter: 'pc',
  app_open: 'app',
  resume_open: 'resume',
  project_open: 'project',
  site_window_open: 'site',
};

interface Running {
  url: string;
  visit: Visit;
  clock: ActiveClock;
  queue: WireEvent[];
  timer: ReturnType<typeof setTimeout> | null;
  /** the active time the last visit_end carried: one that adds under a second is not sent again (pagehide and the
   *  hidden visibilitychange come together) */
  endedAt: number;
}

let run: Running | null = null;

function queue(r: Running, n: EventName, props: Record<string, unknown>): void {
  const ev: WireEvent = { n, t: Math.max(0, Date.now() - r.visit.t0) };
  if (Object.keys(props).length) ev.p = props;
  r.queue.push(ev);
  const m = REACHES[n];
  if (m && !r.visit.depth.includes(m)) r.visit.depth.push(m);
  r.timer ??= setTimeout(() => {
    flush(r, false);
  }, BATCH_MS);
}

/** Sends what is queued; with `end`, a visit_end with the time so far (unless next to nothing changed since the last
 *  one). */
function flush(r: Running, end: boolean): void {
  if (r.timer !== null) clearTimeout(r.timer);
  r.timer = null;
  const now = Date.now();
  r.visit.active = r.clock.read(now);
  if (end && (r.visit.active - r.endedAt >= END_STEP_MS || r.queue.length)) {
    r.endedAt = r.visit.active;
    const p = sanitize('visit_end', {
      activeMs: r.visit.active,
      totalMs: now - r.visit.t0,
      maxDepth: r.visit.depth,
    } satisfies EventProps['visit_end']);
    r.queue.push({ n: 'visit_end', t: Math.max(0, now - r.visit.t0), ...(p && { p }) });
  }
  saveVisit(r.visit);
  if (!r.queue.length) return;
  for (const body of pack(r.visit.id, r.queue)) send(r.url, body);
  r.queue = [];
}

function startProps(lang: Lang): EventProps['visit_start'] {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    route: routeLabel(location.pathname),
    hash: location.hash.slice(1),
    lang,
    blang: (navigator.language || '').split('-')[0] ?? '',
    device: deviceClass(window.matchMedia('(pointer: coarse)').matches, w, h),
    vp: viewportBucket(w, h),
    ref: referrerHost(document.referrer, location.hostname),
    utm: new URLSearchParams(location.search).get('utm_source') ?? '',
  };
}

/**
 * Starts counting this visit (once; nothing happens when it is off). A tab's first page sends visit_start; a reload
 * goes on with the same visit, its time and milestones.
 */
export function initAnalytics(opts: { lang: Lang; url?: string }): void {
  if (run) return;
  const env = import.meta.env as { DEV: boolean; VITE_ANALYTICS?: string };
  if (!enabledBuild(env) || debugWanted() || !mayTrack(navigator)) return;
  const now = Date.now();
  const saved = loadVisit();
  const visit: Visit = saved ?? { id: newId(), t0: now, active: 0, depth: [] };
  const r: Running = {
    url: opts.url ?? COLLECT_URL,
    visit,
    clock: new ActiveClock(now, !document.hidden, visit.active),
    queue: [],
    timer: null,
    endedAt: visit.active,
  };
  run = r;
  const input = (): void => {
    r.clock.input(Date.now());
  };
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'])
    window.addEventListener(type, input, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    r.clock.setVisible(!document.hidden, Date.now());
    if (document.hidden) flush(r, true);
  });
  window.addEventListener('pagehide', () => {
    flush(r, true);
  });
  // a phone may kill a background tab without a pagehide: the last minute's heartbeat is then the visit's length
  setInterval(() => {
    if (!document.hidden) flush(r, true);
  }, HEARTBEAT_MS);
  if (!saved) {
    const p = sanitize('visit_start', startProps(opts.lang));
    if (p) queue(r, 'visit_start', p);
  }
  saveVisit(visit);
}

type Args<E extends TrackedEvent> = keyof EventProps[E] extends never ? [] : [props: EventProps[E]];

/** Counts an event of the list (with its props); nothing while analytics is off. */
export function track<E extends TrackedEvent>(event: E, ...[props]: Args<E>): void {
  const r = run;
  if (!r) return;
  const p = sanitize(event, props);
  if (p) queue(r, event, p);
}
