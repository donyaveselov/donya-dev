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
  files only, so the build writes the page into a folder per route, taking the names from the route table.
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
public/            room.json, wallpapers, screenshots, music/ (the lofi loop, with its CREDITS.txt), .htaccess,
                   api/ (the analytics endpoint and the daily digest, PHP)
deploy/            analytics.sample.php: the template of the analytics' private config on the host
docs/              DEVELOPMENT.md
```

## Analytics and notifications

The site counts visits without personal data and tells me about them in Telegram. The page
(`src/services/analytics.service.ts`) sends a short list of events to `/api/collect.php` (`public/api/`, PHP on the
host), which logs them and sends one message per visit, for example:

```
👀 Визит 3 мин 12 с (активно 2:40) · телефон · RU · пришёл: hh.ru · Safari/iOS
экскурсия: да, до конца → компьютер → Проекты, Резюме → Компи (сайт)
```

and `/api/digest.php` sends a daily summary (visits, unique visitors, median and average active time, referrers, how
many took the tour, sat at the PC, opened the resume, the top apps).

**What is collected.** The events and their props are a fixed list (`SCHEMA` in the service, mirrored in
`public/api/analytics-lib.php`; anything else is dropped on both sides): the visit's start (the route, the page's and
the browser's language, the device class phone / tablet / desktop, the window size rounded to tens of pixels, the
referrer's host, `utm_source`), the tour (offered, accepted, declined, each step, skipped, completed), sitting down at
the PC and leaving it, the apps opened, the resume sheet, the diploma, projects and their site windows, a language
switch, and the visit's end: total time, active time (the tab visible and some input within the last minute) and the
milestones reached. The server adds the time, a browser and OS family ("Chrome/Android") and a visitor hash.

**What is not.** No cookies, no ids in localStorage, no fingerprinting: the visit's id is random and lives in the tab's
sessionStorage. No IP address and no User-Agent are stored: the visitor is `sha256(salt . ip . ua)[:16]` with a random
salt that is replaced every day, so a visitor counts once per day and cannot be followed from one day to the next. No
referrer paths or queries, no text typed anywhere. Nothing is sent with Do Not Track or Global Privacy Control on, from
bots, headless or automated browsers (`navigator.webdriver`), in `?debug` mode, or from `npm run dev` (unless it is
started with `VITE_ANALYTICS=1`).

**Setting it up on the host (once).** The config lives outside the site's folder, where the deploy never writes and
the web never serves it: `<home>/donya-private/analytics.php`, next to `www/` (the site is `<home>/www/donya.dev`;
another path can be given in the `DONYA_ANALYTICS_CONFIG` environment variable).

1. Create the bot with [@BotFather](https://t.me/BotFather) (`/newbot`) and keep its token.
2. Write anything to the bot, then open `https://api.telegram.org/bot<token>/getUpdates` in a browser: the chat id is
   `result[0].message.chat.id`.
3. In ISPmanager's file manager (or over FTP) create the folder `donya-private` in the home folder, next to `www`
   (permissions 700), and put [`deploy/analytics.sample.php`](deploy/analytics.sample.php) in it as `analytics.php`
   (permissions 600) with the real `tg_token`, `tg_chat_id` and a long random `digest_key`. The `logs/` and `state/`
   folders appear next to it with the first event. Never commit the real file.
4. Deploy (`npm run deploy` uploads `dist/api/` with the rest), open the site, leave it after a few seconds: a message
   arrives. Logs: `donya-private/logs/YYYY-MM-DD.jsonl`, one JSON line per event.

**The daily digest.** ISPmanager → _Scheduler_ (cron) → _Create_: run every hour (minute `5`, every hour, every day),
with the command

```sh
/usr/bin/wget -q -O - "https://donya.dev/api/digest.php?key=<digest_key>"
```

or, without the key in a URL, the host's PHP binary on the file (its path is in the hosting panel, e.g.
`/opt/php/8.3/bin/php`): `/opt/php/8.3/bin/php ~/www/donya.dev/api/digest.php`. It sends once a day, in the hour
`digest_hour` of the config (Phuket time), a summary of the previous day, and then deletes logs older than 180 days.
`?force=1` sends now, `?print=1` only shows the text, `?day=2026-11-24` picks the day.

**Turning it off.** Messages only: `'notify' => false` in the config (the log and the digest go on). Everything on the
server: `'enabled' => false`, or delete the config (collect.php then answers 503 and stores nothing). In the page:
build with `VITE_ANALYTICS=0`, and nothing is sent at all.

## Credits

Third-party assets (the XP wallpapers and icons, game screenshots, the music, fonts, three.js) are listed in
[CREDITS.md](CREDITS.md).

## License

The code is [MIT](LICENSE). The personal content (the résumé, the project descriptions and the other texts in
`src/content` and `index.html`) is the author's and is not covered by it, and neither are the third-party assets in
CREDITS.md, which keep their own terms.
