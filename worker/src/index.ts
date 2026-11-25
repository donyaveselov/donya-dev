// donya.dev's visit analytics, a Cloudflare Worker with D1 (see README, «Analytics and notifications»):
//
//   POST /collect   a batch of the page's events (src/services/analytics.service.ts sends them with sendBeacon), as
//                   {"s": "<session uuid>", "e": [{"n": "<event>", "t": <ms since the visit began>, "p": {...}}]}.
//                   Checked (our Origin, at most 4 KB of JSON, no bot, the rate limit), kept to the events and props of
//                   the list, stored in D1. At the visit's end (visit_end comes when the tab hides or closes, and every
//                   minute while it is shown) ONE Telegram message goes per visit, edited while later visit_ends bring
//                   a longer visit, for half an hour and at most once a minute. Visits under 3 s active get none.
//                   Replies: 204 taken; 400 malformed; 403 not our origin, or a bot; 405 not POST; 413 too big; 429 too
//                   many.
//   GET /digest?key=<DIGEST_KEY>[&force=1][&print=1][&day=YYYY-MM-DD]
//                   the daily summary: force sends now (even outside the hour, or again), print only shows the text,
//                   day picks the day (default: yesterday, Phuket time).
//   cron, hourly    sends yesterday's digest once, in the hour DIGEST_HOUR (Phuket), and deletes data older than 180
//                   days, stale rate counters and old salts.
//
// Secrets (wrangler secret put): TG_TOKEN, TG_CHAT_ID, DIGEST_KEY. The token is never logged.
import {
  EDIT_EVERY,
  EDIT_WINDOW,
  KEEP_DAYS,
  MAX_BYTES,
  MIN_ACTIVE_MS,
  RATE_MAX,
  RATE_WINDOW,
  buildVisit,
  digest,
  digestText,
  isBot,
  isDay,
  originAllowed,
  parseBatch,
  phuketDay,
  phuketDayBefore,
  phuketTime,
  randomHex,
  requestOrigin,
  sameSecret,
  uaClass,
  visitText,
  visitorHash,
} from './lib';
import type { Batch, DigestRow } from './lib';

export interface Env {
  DB: D1Database;
  /** a comma list of the pages allowed to send events */
  ALLOWED_ORIGINS: string;
  /** non-empty: http://localhost:<port> and http://127.0.0.1:<port> may send too (wrangler dev) */
  DEV_ORIGINS?: string;
  /** the Phuket hour (0-23) the daily digest goes in */
  DIGEST_HOUR?: string;
  /** "0": no message per visit (the data and the digest go on) */
  NOTIFY?: string;
  TG_TOKEN?: string;
  TG_CHAT_ID?: string;
  DIGEST_KEY?: string;
}

const BASE_HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

const secondsOf = (ms: number): number => Math.floor(ms / 1000);

/* ---------- Telegram ---------- */

const tgReady = (env: Env): boolean => Boolean(env.TG_TOKEN && env.TG_CHAT_ID);

interface TgReply {
  ok: boolean;
  result?: { message_id?: number };
  description?: string;
}

/** Calls the Bot API; the reply when it says ok, else null (the reason is logged, the token never is). */
async function telegram(env: Env, method: string, params: Record<string, unknown>): Promise<TgReply | null> {
  if (!tgReady(env)) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN ?? ''}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, link_preview_options: { is_disabled: true }, ...params }),
      signal: AbortSignal.timeout(8000),
    });
    const json: TgReply = await res.json();
    if (json.ok) {
      const id = json.result?.message_id ?? params.message_id;
      console.log(`telegram ${method}: ok, message_id ${typeof id === 'number' ? String(id) : '?'}`);
      return json;
    }
    console.log(`telegram ${method}: ${String(res.status)} ${json.description ?? ''}`);
  } catch (e) {
    console.log(`telegram ${method}: ${e instanceof Error ? e.name : 'error'}`);
  }
  return null;
}

async function sendMessage(env: Env, text: string): Promise<number | null> {
  const id = (await telegram(env, 'sendMessage', { text }))?.result?.message_id;
  return typeof id === 'number' ? id : null;
}

/* ---------- POST /collect ---------- */

function cors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const reply = (status: number, headers: Record<string, string> = {}): Response =>
  new Response(null, { status, headers: { ...BASE_HEADERS, ...headers } });

/** The body as text, or null once it is over `max` bytes (whatever Content-Length says). */
async function readBody(req: Request, max: number): Promise<string | null> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = (await reader.read()) as { done: boolean; value?: Uint8Array };
    if (done || !value) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** Today's salt: random, made by the first request of the Phuket day. */
async function dailySalt(db: D1Database, day: string): Promise<string> {
  const row = await db
    .prepare('INSERT INTO salts (day, salt) VALUES (?1, ?2) ON CONFLICT (day) DO UPDATE SET day = day RETURNING salt')
    .bind(day, randomHex(32))
    .first<{ salt: string }>();
  return row?.salt ?? randomHex(32);
}

/** Counts `n` events for a visitor; false once it is over RATE_MAX in the window. */
async function rateOk(db: D1Database, visitor: string, n: number, nowS: number): Promise<boolean> {
  const row = await db
    .prepare(
      'INSERT INTO rate (visitor, win, n) VALUES (?1, ?2, ?3) ' +
        'ON CONFLICT (visitor, win) DO UPDATE SET n = n + excluded.n RETURNING n',
    )
    .bind(visitor, Math.floor(nowS / RATE_WINDOW), n)
    .first<{ n: number }>();
  return (row?.n ?? 0) <= RATE_MAX;
}

async function store(
  db: D1Database,
  batch: Batch,
  visitor: string,
  ua: string,
  now: number,
  day: string,
): Promise<void> {
  const { browser, os } = uaClass(ua);
  const insert = db.prepare(
    'INSERT INTO events (day, ts, session, visitor, event, ct, props, browser, os) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)',
  );
  const statements = batch.events.map((ev) =>
    insert.bind(day, now, batch.session, visitor, ev.n, ev.t, JSON.stringify(ev.p), browser, os),
  );
  const start = batch.events.find((ev) => ev.n === 'visit_start')?.p ?? {};
  const ends = batch.events.filter((ev) => ev.n === 'visit_end').map((ev) => ev.p);
  const most = (key: string): number => Math.max(0, ...ends.map((p) => (typeof p[key] === 'number' ? p[key] : 0)));
  const text = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  statements.push(
    db
      .prepare(
        'INSERT INTO sessions (session, visitor, day, started, updated, active_ms, total_ms, device, lang, referrer, utm) ' +
          'VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?6, ?7, ?8, ?9, ?10) ON CONFLICT (session) DO UPDATE SET ' +
          'updated = excluded.updated, active_ms = max(active_ms, excluded.active_ms), ' +
          'total_ms = max(total_ms, excluded.total_ms), device = coalesce(device, excluded.device), ' +
          'lang = coalesce(lang, excluded.lang), referrer = coalesce(referrer, excluded.referrer), ' +
          'utm = coalesce(utm, excluded.utm)',
      )
      .bind(
        batch.session,
        visitor,
        day,
        now,
        most('activeMs'),
        most('totalMs'),
        text(start.device),
        text(start.lang),
        text(start.ref),
        text(start.utm),
      ),
  );
  await db.batch(statements);
}

interface SessionRow {
  message_id: number | null;
  notified_at: number | null;
  edited_at: number | null;
  message_text: string | null;
}

/**
 * The visit's message: sent once (a conditional update claims it, so two beacons of one visit never send two), then
 * edited for a longer visit within EDIT_WINDOW of the sending, at most once per EDIT_EVERY.
 */
async function notifyVisit(env: Env, session: string, nowS: number): Promise<void> {
  if (env.NOTIFY === '0' || !tgReady(env)) return;
  const db = env.DB;
  const { results } = await db
    .prepare('SELECT event, props, browser, os FROM events WHERE session = ?1 ORDER BY id')
    .bind(session)
    .all<{ event: string; props: string; browser: string; os: string }>();
  const first = results[0];
  const visit = buildVisit(
    results.map((r) => ({ n: r.event, p: JSON.parse(r.props) as Record<string, unknown> })),
    first ? `${first.browser}/${first.os}` : undefined,
  );
  if ((visit.end?.activeMs ?? 0) < MIN_ACTIVE_MS) return;
  const text = visitText(visit);
  const s = await db
    .prepare('SELECT message_id, notified_at, edited_at, message_text FROM sessions WHERE session = ?1')
    .bind(session)
    .first<SessionRow>();
  if (!s) return;

  if (s.notified_at === null) {
    const claim = await db
      .prepare('UPDATE sessions SET notified_at = ?1 WHERE session = ?2 AND notified_at IS NULL')
      .bind(nowS, session)
      .run();
    if (claim.meta.changes !== 1) return;
    const id = await sendMessage(env, text);
    if (id === null) {
      await db.prepare('UPDATE sessions SET notified_at = NULL WHERE session = ?1').bind(session).run();
      return;
    }
    await db
      .prepare('UPDATE sessions SET message_id = ?1, message_text = ?2 WHERE session = ?3')
      .bind(id, text, session)
      .run();
    return;
  }

  if (s.message_id === null || text === s.message_text || nowS - s.notified_at > EDIT_WINDOW) return;
  const claim = await db
    .prepare(
      'UPDATE sessions SET edited_at = ?1 WHERE session = ?2 AND message_id IS NOT NULL ' +
        'AND coalesce(edited_at, notified_at) <= ?1 - ?3',
    )
    .bind(nowS, session, EDIT_EVERY)
    .run();
  if (claim.meta.changes !== 1) return;
  if (await telegram(env, 'editMessageText', { message_id: s.message_id, text }))
    await db.prepare('UPDATE sessions SET message_text = ?1 WHERE session = ?2').bind(text, session).run();
}

async function collect(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = requestOrigin(req.headers.get('Origin'), req.headers.get('Referer'));
  if (!originAllowed(origin, env.ALLOWED_ORIGINS, Boolean(env.DEV_ORIGINS))) return reply(403);
  const headers = cors(origin);
  if (req.method === 'OPTIONS') return reply(204, headers);
  if (req.method !== 'POST') return reply(405, { ...headers, Allow: 'POST, OPTIONS' });

  const ua = req.headers.get('User-Agent') ?? '';
  if (isBot(ua)) return reply(403, headers);
  if (Number(req.headers.get('Content-Length') ?? 0) > MAX_BYTES) return reply(413, headers);
  const body = await readBody(req, MAX_BYTES);
  if (body === null) return reply(413, headers);
  const batch = body ? parseBatch(body) : null;
  if (!batch) return reply(400, headers);

  const now = Date.now();
  const day = phuketDay(now);
  const ip = req.headers.get('CF-Connecting-IP') ?? '';
  const visitor = await visitorHash(await dailySalt(env.DB, day), ip, ua);
  if (!(await rateOk(env.DB, visitor, batch.events.length, secondsOf(now)))) return reply(429, headers);

  await store(env.DB, batch, visitor, ua, now, day);
  if (batch.events.some((ev) => ev.n === 'visit_end')) ctx.waitUntil(notifyVisit(env, batch.session, secondsOf(now)));
  return reply(204, headers);
}

/* ---------- the digest and the housekeeping ---------- */

/** Deletes events and visits older than KEEP_DAYS, past rate windows and the other days' salts. */
async function cleanup(env: Env, now: number): Promise<number> {
  const oldest = phuketDayBefore(now, KEEP_DAYS);
  const results = await env.DB.batch([
    env.DB.prepare('DELETE FROM events WHERE day < ?1').bind(oldest),
    env.DB.prepare('DELETE FROM sessions WHERE day < ?1').bind(oldest),
    env.DB.prepare('DELETE FROM rate WHERE win < ?1').bind(Math.floor(secondsOf(now) / RATE_WINDOW) - 1),
    env.DB.prepare('DELETE FROM salts WHERE day <> ?1').bind(phuketDay(now)),
  ]);
  return results.reduce((n, r) => n + r.meta.changes, 0);
}

interface DigestOpts {
  force: boolean;
  print: boolean;
  day?: string;
}

/** The daily digest: a status and the text to show. */
async function runDigest(env: Env, now: number, opts: DigestOpts): Promise<{ status: number; text: string }> {
  const day = opts.day ?? phuketDayBefore(now, 1);
  if (!isDay(day)) return { status: 400, text: 'day: YYYY-MM-DD' };
  const hour = Number.parseInt(env.DIGEST_HOUR ?? '9', 10);
  if (!opts.force && !opts.print) {
    const t = phuketTime(now);
    if (t.hour !== hour)
      return { status: 200, text: `not the hour: ${t.hhmm} in Phuket, the digest goes at ${String(hour)}:00` };
    const last = await env.DB.prepare("SELECT value FROM state WHERE key = 'digest_last'").first<{ value: string }>();
    if (last?.value === day) return { status: 200, text: `already sent for ${day}` };
  }
  const { results } = await env.DB.prepare(
    'SELECT session, visitor, event, props FROM events WHERE day = ?1 ORDER BY id',
  )
    .bind(day)
    .all<{ session: string; visitor: string; event: string; props: string }>();
  const rows: DigestRow[] = results.map((r) => ({ ...r, props: JSON.parse(r.props) as Record<string, unknown> }));
  const text = digestText(day, digest(rows));
  if (opts.print) return { status: 200, text };
  if (!tgReady(env)) return { status: 503, text: `no TG_TOKEN / TG_CHAT_ID secret\n\n${text}` };
  if ((await sendMessage(env, text)) === null)
    return { status: 502, text: `Telegram did not take the message\n\n${text}` };
  await env.DB.prepare(
    "INSERT INTO state (key, value) VALUES ('digest_last', ?1) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
  )
    .bind(day)
    .run();
  const removed = await cleanup(env, now);
  return { status: 200, text: `${text}\n\n(sent; ${String(removed)} old rows removed)` };
}

async function digestRoute(req: Request, env: Env): Promise<Response> {
  const text = (status: number, body: string): Response =>
    new Response(`${body}\n`, { status, headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' } });
  if (req.method !== 'GET') return text(405, 'GET only');
  const q = new URL(req.url).searchParams;
  if (!env.DIGEST_KEY || !sameSecret(env.DIGEST_KEY, q.get('key') ?? '')) return text(403, 'forbidden');
  const flag = (k: string): boolean => !['', '0', null].includes(q.get(k));
  const day = q.get('day');
  const r = await runDigest(env, Date.now(), {
    force: flag('force'),
    print: flag('print'),
    ...(day !== null && { day }),
  });
  return text(r.status, r.text);
}

export default {
  async fetch(req, env, ctx): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === '/collect') return collect(req, env, ctx);
    if (pathname === '/digest') return digestRoute(req, env);
    return new Response('donya.dev analytics\n', { status: 404, headers: BASE_HEADERS });
  },

  async scheduled(controller, env): Promise<void> {
    const r = await runDigest(env, controller.scheduledTime, { force: false, print: false });
    const removed = await cleanup(env, controller.scheduledTime);
    console.log(
      `cron: ${r.text.split('\n')[0] ?? ''} (status ${String(r.status)}); ${String(removed)} old rows removed`,
    );
  },
} satisfies ExportedHandler<Env>;
