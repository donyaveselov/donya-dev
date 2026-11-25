// The analytics' event list, shared by the page (analytics.service.ts) and the server (worker/, the Cloudflare Worker
// that collects the events): an event or a prop missing here is dropped on both sides. Pure: no DOM, no Worker APIs.
/** How far the visit got, in the order it is usually reached; visit_end lists the ones reached. */
export const MILESTONES = ['tour', 'tour_done', 'pc', 'app', 'resume', 'project', 'site'] as const;
export type Milestone = (typeof MILESTONES)[number];

/** the page's languages (analytics.service.ts checks them against its Lang) */
export const LANGS = ['ru', 'en'] as const;

/** A prop's kind: a slug (lowercase id), a short text, a whole number, a flag, one of a list, or a list of those. */
export type Spec = 'id' | 'text' | 'int' | 'bool' | readonly string[] | { readonly list: readonly string[] };

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

/** The server refuses a bigger body. */
export const MAX_BYTES = 4096;
export const ID_MAX = 32;
export const TEXT_MAX = 64;

/** Crawlers, link previews, headless and scripted browsers. */
export const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender|phantom|selenium|puppeteer|playwright|preview|facebookexternalhit|embedly|curl|wget|python|go-http|java\//i;

export const isEventName = (name: unknown): name is EventName =>
  typeof name === 'string' && Object.hasOwn(SCHEMA, name);

function clean(spec: Spec, v: unknown): unknown {
  if (spec === 'id')
    return typeof v === 'string'
      ? v
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, '')
          .slice(0, ID_MAX)
      : undefined;
  if (spec === 'text')
    // cut by code points, so an emoji is never split
    return typeof v === 'string'
      ? Array.from(v.replace(/[\p{Cc}\p{Cf}]/gu, '').trim())
          .slice(0, TEXT_MAX)
          .join('')
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
export function sanitize(event: string, props: unknown = {}): Record<string, unknown> | null {
  if (!isEventName(event)) return null;
  const given: Readonly<Record<string, unknown>> =
    typeof props === 'object' && props !== null && !Array.isArray(props) ? (props as Record<string, unknown>) : {};
  const specs: Readonly<Record<string, Spec>> = SCHEMA[event];
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(specs)) {
    if (!Object.hasOwn(given, key)) continue;
    const v = clean(spec, given[key]);
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    out[key] = v;
  }
  return out;
}
