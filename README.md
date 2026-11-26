# donya.dev

**Live: <https://donya.dev>**

A portfolio as a place instead of a page: an isometric three.js room (PS1-style rendering, local time and weather in
Phuket, a talkie that gives a short tour) with a working Windows-XP-style desktop, "Windows XD", inside its monitor.
Sit down at the desk and the camera flies into the screen, which becomes a real DOM desktop with a window manager, a
Start menu and a dozen apps: projects, resume, Minesweeper, Paint, a browser.

![The room](public/og.jpg)

This repository is a TypeScript port of my earlier version of the same site, which was a set of classic scripts glued
into one HTML file. That is why the history starts with an import and not with a first sketch.

## Decisions

- **No UI framework.** Plain TypeScript and a small DOM kit (`src/components/kit/kit.ts`). The desktop is a window manager
  and a set of small apps: a virtual DOM would add weight and a second source of truth for layout that the 3D hand-off
  reads straight from the DOM. Strict TypeScript (`noUncheckedIndexedAccess`, type-checked ESLint) does the job a
  framework's structure would.
- **three.js pinned at 0.128.** The look (materials, lights, the PS1 post pass with vertex snapping and dithering) is
  tuned to that version's renderer, and later versions changed colour management and lighting units. An upgrade means
  re-tuning every preset against the pixel harness, so it is deferred on purpose and the version is pinned exactly.
- **The model is one JSON request.** `public/room.json` is the Blender export quantized by gltfpack, gzipped and
  base64-encoded, inflated in the browser with `DecompressionStream`. One file that any static host can serve, fetched as `room.json?v=<content hash>` and cached for good.
- **The desktop loads after the room.** The room is the first paint; the desktop (about as much code again, mostly
  XP icon bitmaps) is a separate chunk fetched once the room is up, so it never delays the first frame.
- **A pixel-exact 3D → DOM hand-off.** The monitor in the scene shows a snapshot painted from the real desktop's DOM.
  At the end of the fly-in the canvas is swapped for the DOM desktop at the same pixels, so there is no visible cut.
- **A deterministic pixel regression harness.** The port had to keep every pixel, so `scripts/regress.mjs` freezes the
  clock, seeds `Math.random`, stubs the weather and captures 42 states in Chrome; `scripts/compare.mjs` diffs two
  captures. It caught, for example, a CSS minifier silently dropping `backdrop-filter`.
- **Routes are paths, pages are copies.** `/resume`, `/pc`, `/night` and the rest are real addresses: the host serves
  files only, so the build writes the page into a folder per route, taking the names from the route table, once in
  English and once in Russian under `/ru/` (each with its own head, hreflang and JSON-LD), plus `sitemap.xml`.
- **Fallbacks.** Without WebGL the page keeps its top bar and a plain projects button instead of an empty canvas
  (the desktop is DOM and still works); without JavaScript a `<noscript>` style makes the resume sheet the page.
- **One resume.** The resume sheet in `index.html` (Russian and English) is its only source: the desktop's DocPad
  shows the same markup, and `npm run resume:pdf` prints it to one-page PDFs.
- **One mute switch.** The room's music and the desktop's sounds share one setting (`src/store/sound.ts`), so
  muting in either place mutes both.

## Running

Node 24 (`nvm use` reads `.nvmrc`), then `npm ci`.

| Command              | What                                                                            |
| -------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`        | dev server with hot reload                                                      |
| `npm run build`      | the multi-file site in `dist/`                                                  |
| `npm run preview`    | serve `dist/` (port 4173)                                                       |
| `npm run check`      | everything CI runs before the build: typecheck, lint, format check, tests       |
| `npm run typecheck`  | `tsc --noEmit`, strict, for the app and the typed scripts                       |
| `npm run lint`       | ESLint (typescript-eslint strict + stylistic, type-checked)                     |
| `npm run format`     | Prettier (`format:check` only checks)                                           |
| `npm test`           | Vitest: the DOM-free logic of the room, the desktop and the deploy              |
| `npm run regress`    | pixel regression capture; `npm run compare` diffs two captures                  |
| `npm run pack:room`  | re-pack `public/room.json` from a Blender export                                |
| `npm run deploy`     | check, build, upload `dist/` over FTP with TLS (`-- --dry-run` shows the plan)  |
| `npm run resume:pdf` | the resume as PDF (RU, EN) from a running `npm run preview`, into `resume-pdf/` |

The harness, re-packing the model, deploying and the traps worth knowing are in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Layout

```
index.html             page head and the room's markup (top bar, resume sheet)
src/
  main.ts              entry: the room first; the desktop is loaded once the room is up
  modules/             one folder per feature
    room/              the 3D room: scene/ (lights, weather, PS1 post pass), screens/, tour/, handoff/ (the
                       fly-in to the desktop), components/ (top bar, resume sheet, labels), store/, routes.ts
    desktop/           the Windows XD shell: windows/, taskbar/ (Start menu, tray), session/ (boot, sleep, shut
                       down), store/ (state, prefs, constants)
    apps/<name>/       the desktop's programs: projects, resume, about, contact, terminal, browser, notepad,
                       calculator, paint, minesweeper, recycle
    music/             the background lofi loop
  services/            *.service.ts: the room model, weather, Discord presence, the lazily loaded desktop, analytics
  store/               page-wide state: the one mute switch
  content/             texts: projects, resume, profile, stack
  components/kit/      the apps' small DOM kit (h(), menus, bindings)
  i18n/  types/  enums/  utils/  assets/
scripts/           deploy.mjs (FTP deploy), pack-room.mjs (Blender export -> room.json), regress.mjs + compare.mjs
public/            room.json, wallpapers, screenshots, music/ (the lofi loop, with its CREDITS.txt), .htaccess
worker/            the analytics: a Cloudflare Worker with D1 (src/index.ts, migrations/, wrangler.toml)
deploy/            analytics.sample.php: the template of the private copy of the analytics' Telegram settings
docs/              DEVELOPMENT.md
```

## Analytics and notifications

The site counts visits without personal data and tells me about them in Telegram. The page
(`src/services/analytics.service.ts`) sends a short list of events with `sendBeacon` to a Cloudflare Worker
([`worker/`](worker/), `POST https://donya-analytics.donya-analytics.workers.dev/collect`; the static host runs no
server code), which stores them in a D1 database and sends one message per visit, for example:

```
👀 Визит 3 мин 12 с (активно 2:40) · телефон · RU · пришёл: hh.ru · Safari/iOS
экскурсия: да, до конца → компьютер → Проекты, Резюме → Компи (сайт)
```

The message is edited while the visit goes on (later `visit_end` beacons), for half an hour and at most once a minute;
visits with under 3 s of active time get none. Every morning at 9:00 Phuket time an hourly cron trigger sends a summary
of the previous day (visits, unique visitors, median and average active time, referrers, how many took the tour, sat at
the PC, opened the resume, the top apps), and deletes data older than 180 days.

**What is collected.** The events and their props are a fixed list (`SCHEMA` in
`src/services/analytics.schema.ts`, which the page and the Worker both import; anything else is dropped on both sides):
the visit's start (the route, the page's and the browser's language, the device class phone / tablet / desktop, the
window size rounded to tens of pixels, the referrer's host, `utm_source`), the tour (offered, accepted, declined, each
step, skipped, completed), sitting down at the PC and leaving it, the apps opened, the resume sheet, the diploma,
projects and their site windows, a language switch, and the visit's end: total time, active time (the tab visible and
some input within the last minute) and the milestones reached. The Worker adds the time, a browser and OS family
("Chrome", "Android") and a visitor hash.

**What is not.** No cookies, no ids in localStorage, no fingerprinting: the visit's id is random and lives in the tab's
sessionStorage. No IP address and no User-Agent are stored: the visitor is `sha256(salt + ip + ua)[:16]` with a random
salt that is replaced every day (Phuket time), so a visitor counts once per day and cannot be followed from one day to
the next. No referrer paths or queries, no text typed anywhere. Nothing is sent with Do Not Track or Global Privacy
Control on, from bots, headless or automated browsers (`navigator.webdriver`), in `?debug` mode, or from `npm run dev`
(unless it is started with `VITE_ANALYTICS=1`). The Worker also refuses other origins, bodies over 4 KB, bot
User-Agents and more than 120 events per visitor in 10 minutes.

**The Worker.** `worker/` is an npm workspace (`npm install` at the root installs it). From the repository root:

```sh
npm run deploy -w worker            # wrangler deploy (the site's npm run deploy does not touch the Worker)
npm run migrate -w worker           # apply worker/migrations to the remote D1 database
npm run tail -w worker              # live logs (wrangler tail): requests, "telegram sendMessage: ok, message_id …"
npm run dev -w worker               # wrangler dev on localhost, with localhost origins allowed (DEV_ORIGINS)
```

`worker/wrangler.toml` holds the D1 binding, the hourly cron and the vars: `ALLOWED_ORIGINS`, `DEV_ORIGINS` (empty in
production), `DIGEST_HOUR` (9) and `NOTIFY` (`"0"` turns the per-visit messages off). The secrets are set once with
wrangler, never in a file of the repository (it reads the value from stdin):

```sh
cd worker
npx wrangler secret put TG_TOKEN      # the bot's token from @BotFather
npx wrangler secret put TG_CHAT_ID    # write to the bot, then https://api.telegram.org/bot<token>/getUpdates:
                                      #   result[0].message.chat.id
npx wrangler secret put DIGEST_KEY    # a long random string (openssl rand -hex 24), for GET /digest
```

A private copy of the Telegram values stays on the host outside the web root, `<home>/donya-private/analytics.php`
([`deploy/analytics.sample.php`](deploy/analytics.sample.php) is its template); nothing reads it at run time.

**The digest by hand.** `https://donya-analytics.donya-analytics.workers.dev/digest?key=<DIGEST_KEY>` answers in plain
text: `&print=1` only shows the text, `&force=1` sends it now (even outside the hour, or a second time),
`&day=2026-11-24` picks the day (default: yesterday).

**Reading the data.** From `worker/`, `npx wrangler d1 execute donya-analytics --remote --command "<SQL>"`, e.g.

```sql
-- the latest visits and their messages
SELECT session, datetime(started / 1000, 'unixepoch', '+7 hours') AS started, active_ms, device, lang, referrer, utm,
       message_id IS NOT NULL AS notified FROM sessions ORDER BY started DESC LIMIT 20;
-- visits and visitors per day
SELECT day, count(DISTINCT session) AS visits, count(DISTINCT visitor) AS visitors FROM events GROUP BY day
ORDER BY day DESC LIMIT 14;
-- one visit's events
SELECT ct, event, props FROM events WHERE session = '<session>' ORDER BY id;
-- the most opened apps
SELECT json_extract(props, '$.app') AS app, count(*) AS n FROM events WHERE event = 'app_open' GROUP BY app
ORDER BY n DESC;
```

The tables: `events` (day, ts, session, visitor, event, ct, props JSON, browser, os), `sessions` (one row per visit,
with its Telegram `message_id`, `notified_at`, `edited_at`), `salts` (today's), `rate` (the rate counters), `state`
(`digest_last`).

**Turning it off.** Messages only: set `NOTIFY = "0"` in `worker/wrangler.toml` and deploy the Worker (the data and the
digest go on). In the page: build with `VITE_ANALYTICS=0`, and nothing is sent at all. `VITE_ANALYTICS_URL` points
the page at another endpoint (e.g. `http://127.0.0.1:8787/collect` for `npm run dev -w worker`).

## Credits

Third-party assets (the XP wallpapers and icons, game screenshots, the music, fonts, three.js) are listed in
[CREDITS.md](CREDITS.md).

## License

The code is [MIT](LICENSE). The personal content (the résumé, the project descriptions and the other texts in
`src/content` and `index.html`) is the author's and is not covered by it, and neither are the third-party assets in
CREDITS.md, which keep their own terms.
