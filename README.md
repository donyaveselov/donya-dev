# donya.dev

The isometric three.js room with the "Windows XD" desktop inside its monitor, ported from
`resume/portfolio/site` (a `build.py` that glued classic scripts into one HTML file) to Vite + strict TypeScript.

The first commit is a **faithful mechanical import**: the old code lives on, verbatim, in `legacy` modules marked
`// @ts-nocheck`, and both builds render pixel-identically to the old `local.html` on every state of the regression
harness. Ports replace the legacy modules one at a time, and the harness checks each step.

## Layout

```
index.html                 page head (fonts, title) and the room's markup (top bar, drawer, resume sheet)
src/main.ts                entry: CSS, then XP icons, XP shell, XP apps (old manifest order), then the room
src/room/                  the room (old parts/app.js), typed modules: room.ts boots and wires them (see its header)
src/xp/legacy/             the desktop shell (core.ts) and the XP icon bitmaps (icons-xp.ts)
src/xp/legacy/apps/        the desktop apps (old xp/apps/*.js)
src/xp/apps/               ported apps go here
src/shared/                types (window globals, the XPDesktop contract), i18n helpers
src/styles/                xp.css, apps.css, mocks-*.css (the room's own CSS is src/room/room.css)
public/room.json           the packed model ({"gz": base64(gzip(GLB))}), fetched at runtime with ?v=<md5>
public/games, public/wall  splash screens and wallpapers the page loads by relative URL
scripts/pack-room.mjs      blender/room.glb -> public/room.json (gltfpack 0.24.0, as build.py did)
scripts/regress.mjs        regression capture (Playwright)
scripts/compare.mjs        pixel comparison of two captures
```

## Commands

Node 24 (`source ~/.nvm/nvm.sh && nvm use 24`).

| Command                    | What                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`              | dev server                                                                     |
| `npm run build`            | multi-file site for donya.dev in `dist/`                                       |
| `npm run build:artifact`   | one self-contained `dist-artifact/index.html` (+ room.json, games/, wall/)     |
| `npm run preview`          | serve `dist/` (port 4173)                                                      |
| `npm run preview:artifact` | serve `dist-artifact/`                                                         |
| `npm run typecheck`        | `tsc --noEmit` (strict, noUncheckedIndexedAccess, noImplicitOverride)          |
| `npm run lint`             | ESLint (typescript-eslint strict + stylistic, type-checked); legacy is ignored |
| `npm run format`           | Prettier                                                                       |
| `npm test`                 | Vitest                                                                         |
| `npm run pack:room`        | re-pack `public/room.json` from `../resume/portfolio/blender/room.glb`         |

The artifact page fetches `room.json`, `games/*.jpg` and `wall/*.jpg` next to itself, as the old page did: publish
them as supporting files.

## Regression

```sh
# the old site (its local.html maps the three.js CDN scripts to _vendor/)
(cd ../resume/portfolio/site && python3 -m http.server 8123 --bind 127.0.0.1) &
node scripts/regress.mjs http://127.0.0.1:8123/local.html .work/baseline

# this project
npm run build && npx vite preview --port 4173 --strictPort --host 127.0.0.1 &
node scripts/regress.mjs http://127.0.0.1:4173/ .work/candidate
node scripts/compare.mjs .work/baseline .work/candidate .work/diff     # exit 1 on any regression
```

`regress.mjs` captures 42 states (about 50 s): the talkie tour (hello, first step, last step), the room after the
tour, day/sunset/night, every status (work, Dota, CS, sleep, outside), cloud/rain/storm, the `#night`, `#play` and
`#resume` routes, the room in English, the desktop after sitting down, every app opened once (projects, the three
project documents, resume, about, contact, terminal running `help`, minesweeper, paint, recycle bin, browser,
notepad, calculator, display properties), the start menu, the desktop in English, standing up, and a 390x844 phone
(tour, room, desktop, projects). `--only=name,name` limits the shots. Console errors, page errors and failed
requests go to `errors.json`; each state's chip and label positions go to `states.json`.

It is deterministic: Playwright's fake clock is paused before the page loads (2026-11-24 13:00 in Phuket) and only
the harness moves it, `Math.random` is seeded, the weather API gets a fixed reply, every other outside request
except Google Fonts is blocked, and fonts are cached in `.work/font-cache`.

**Noise threshold.** Two captures of the same build are pixel-identical on 41 of 42 states and differ by 2 px
(0.0002 %) on one. `compare.mjs` fails an image above `--max=0.002` % (about 20 px of a 1280x800 frame), well below
the smallest real regression seen so far (0.017 %: the top bar losing its backdrop blur). `--noise=dirA,dirB`
additionally ignores pixels that differ between the baseline and re-runs of it.

## Traps

- Keep `build.cssMinify: false` while the legacy CSS is in use: Lightning CSS drops `backdrop-filter` when
  `-webkit-backdrop-filter` is next to it, and the room's chips lose their blur in Chrome.
- The room's sit-down hand-off paints the desktop onto the 3D monitor by reading the desktop's DOM (`.xp`,
  `.xp-wall image`, `.xp-taskbar`, `.xp-startbtn`, `.xp-task`, `.xp-tray`, `.xp-clock`, `.xp-lang`, `.xp-icon`, ...):
  renaming those classes breaks the fly-in without any error. The list is `DESKTOP_DOM` in `src/shared/desktop.ts`.
- `room.json` is cache-busted by a Vite plugin that rewrites the literal `fetch('room.json')` in `src/room/loader.ts`;
  keep that spelling (or move the URL into a constant and update the plugin).
- three gives every geometry, material, texture and object a uuid drawn from `Math.random`, which the harness seeds.
  The rain's particles use the same stream, so anything that changes how many three objects exist before them (a
  removed mesh, three's own module-level objects dropped by tree shaking) moves the drops in `wx-rain` and `wx-storm`
  (about 0.02-0.04 %) without any change in behaviour.
- The XP desktop must never mention the NDA employer or its repository; `src/xp/nda.test.ts` checks `src/xp` and
  `src/styles`. The room's own resume sheet in `index.html` is a separate, public document.
