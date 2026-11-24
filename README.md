# donya.dev

The isometric three.js room with the "Windows XD" desktop inside its monitor. It is a port of
`resume/portfolio/site` (a `build.py` that glued classic scripts into one HTML file) to Vite + strict TypeScript, with
the same behaviour and the same pixels: both builds match the old site on every state of the regression harness (see
[Regression](#regression) for the two known exceptions).

## Running

Node 24 (`source ~/.nvm/nvm.sh && nvm use 24`), then `npm ci`.

| Command                    | What                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`              | dev server with hot reload                                                 |
| `npm run build`            | multi-file site for donya.dev in `dist/`                                   |
| `npm run build:artifact`   | one self-contained `dist-artifact/index.html` (+ room.json, games/, wall/) |
| `npm run preview`          | serve `dist/` (port 4173)                                                  |
| `npm run preview:artifact` | serve `dist-artifact/`                                                     |
| `npm run typecheck`        | `tsc --noEmit` (strict, noUncheckedIndexedAccess, noImplicitOverride)      |
| `npm run lint`             | ESLint (typescript-eslint strict + stylistic, type-checked)                |
| `npm run format`           | Prettier (`format:check` to only check)                                    |
| `npm test`                 | Vitest: the DOM-free logic of the room and the desktop                     |
| `npm run pack:room`        | re-pack `public/room.json` from the Blender export (see below)             |
| `npm run regress`          | regression capture (see below)                                             |

Both builds fetch `room.json`, `games/*.jpg` and `wall/*.jpg` next to the page, as the old site did. For the claude.ai
artifact, publish `dist-artifact/index.html` with those files as supporting files. three.js is bundled from npm
(`three@0.128.0`, pinned exactly: a different version renders differently), no CDN.

### Re-packing the room model

```sh
npm run pack:room                       # ../resume/portfolio/blender/room.glb -> public/room.json
npm run pack:room -- path/to/room.glb   # or another export ($ROOM_GLB works too)
```

It runs `gltfpack@0.24.0 -kn -km -kv -vpf -vtf` (via npx, as `build.py` did), gzips the GLB and writes
`{"gz": base64}`. The build cache-busts the fetch with the file's md5, so a re-pack needs a rebuild, nothing else.
Keep object names in Blender: the code finds meshes by name (`Screen_L`, `Poster_0`, `WallN`, `Anchor_projects`, ...).

## Layout

```
index.html              page head (title, description, Open Graph) and the room's markup (top bar, drawer, resume sheet)
src/main.ts             entry: the room's CSS, then the room; desktop-loader.ts loads src/xp once the room is up
src/room/               the room: room.ts boots and wires the modules (see its header)
  handoff.ts            sitting down at the monitor and standing up (the fly-in)
  tour.ts               the talkie tour;   panels.ts  top bar, drawer, resume sheet, hash routes
  psx.ts, materials.ts  the PS1 post pass and material hooks;   light-rig.ts, lighting.ts  lights and presets
  weather*.ts           weather codes and the rain / lightning effects;   outdoor.ts  sea, sky, coast
  monitors.ts, live-screens.ts, desk-snapshot.ts, textures.ts   the screens
  i18n.ts               the room's strings (typed ru/en dictionaries)
  debug-panel.ts        the debug buttons (status, time, weather, fly-in speed, ps1); only with ?debug or #debug
src/xp/                 the Windows XD desktop: index.ts imports its CSS, install.ts sets up window.XPDesktop
  shell/                window manager (window.ts, layout.ts), taskbar, Start menu, menus, dialogs, desktop icons,
                        session (boot / shutdown), screen savers, system apps, sounds, hotkeys, strings;
                        desktop.ts is the public API
  apps/                 the apps; kit.ts is their UI kit; DOM-free logic (*-board, *-parse, *-raster, ...) is tested
  content/              projects, profile and contacts, the tech stack, the resume
  assets/, styles/      the XP bitmaps (xp-icons.json), Bliss, the Wax screenshots; xp.css, apps.css, mocks-*.css
src/shared/             window globals and the XPDesktop contract (types.ts), i18n helpers, desktop.ts (the only
                        place the room touches window.XPDesktop / XP_ICO / XP_WALL)
public/                 room.json (the packed model), games/ and wall/ images
scripts/pack-room.mjs   Blender export -> public/room.json
scripts/regress.mjs     regression capture (Playwright);   scripts/compare.mjs  pixel comparison of two captures
```

## Regression

```sh
# the old site (its local.html maps the three.js CDN scripts to _vendor/)
(cd ../resume/portfolio/site && python3 -m http.server 8123 --bind 127.0.0.1) &
node scripts/regress.mjs http://127.0.0.1:8123/local.html .work/baseline

# this project, both builds
npm run build && npx vite preview --port 4173 --strictPort --host 127.0.0.1 &
node scripts/regress.mjs http://127.0.0.1:4173/ .work/candidate
node scripts/compare.mjs .work/baseline .work/candidate .work/diff     # exit 1 on any regression

npm run build:artifact && npx vite preview --outDir dist-artifact --port 4174 --strictPort --host 127.0.0.1 &
node scripts/regress.mjs http://127.0.0.1:4174/ .work/candidate-artifact
node scripts/compare.mjs .work/baseline .work/candidate-artifact .work/diff-artifact
```

Playwright comes from `playwright-core` (a dev dependency) and drives the installed Google Chrome with
`--use-gl=angle`; set `CHROME_PATH` for another binary.

`regress.mjs` opens the page with `?debug` (it drives the debug panel) and captures 42 states (about 50 s): the talkie tour (hello, first step, last step), the room after the
tour, day/sunset/night, every status (work, Dota, CS, sleep, outside), cloud/rain/storm, the `#night`, `#play` and
`#resume` routes, the room in English, the desktop after sitting down, every app opened once, the Start menu, the
desktop in English, standing up, and a 390x844 phone (tour, room, desktop, projects). `--only=name,name` limits the
shots. Console errors, page errors and failed requests go to `errors.json`; each state's chip and label positions go to
`states.json`.

It is deterministic: Playwright's fake clock is paused before the page loads (2026-11-24 13:00 in Phuket) and only the
harness moves it, `Math.random` is seeded, the weather API gets a fixed reply, every other outside request except
Google Fonts is blocked, and fonts are cached in `.work/font-cache`.

**Noise threshold.** `compare.mjs` fails an image above `--max=0.002` % (about 20 px of a 1280x800 frame).
`--noise=dirA,dirB` additionally ignores pixels that differ between the baseline and re-runs of it. Frames in the
middle of the slow (x20) fly-in are not reproducible even on the old site (pointer timing), so compare those by eye.

**Known diffs.** `14-wx-rain` and `15-wx-storm` differ by 0.02-0.04 %: the rain drops sit elsewhere (see Traps,
`Math.random`). Everything else is identical.

## Traps

- Keep `build.cssMinify: false`: Lightning CSS drops `backdrop-filter` when `-webkit-backdrop-filter` is next to it,
  and the room's chips lose their blur in Chrome.
- The sit-down hand-off paints the desktop onto the 3D monitor by reading the desktop's DOM (`.xp`, `.xp-wall image`,
  `.xp-taskbar`, `.xp-startbtn`, `.xp-task`, `.xp-tray`, `.xp-clock`, `.xp-lang`, `.xp-icon`, ...): renaming those
  classes breaks the fly-in without any error. The list is `DESKTOP_DOM` in `src/shared/desktop.ts`.
- `room.json` is cache-busted by a Vite plugin that rewrites the literal `fetch('room.json')` in `src/room/loader.ts`;
  keep that spelling (or move the URL into a constant and update the plugin).
- three gives every geometry, material, texture and object a uuid drawn from `Math.random`, which the harness seeds.
  The rain's particles, the minesweeper layout, Task Manager's graphs and the starfield use the same stream, so
  anything that changes how many three objects exist before them (a removed mesh, three's module-level objects dropped
  by tree shaking) moves them without any change in behaviour. That is why `wx-rain` and `wx-storm` differ from the old
  site. Giving the rain its own seeded random would fix the harness but move the drops relative to the old site.
- The XP desktop must never mention the NDA employer or its repository; `src/xp/nda.test.ts` checks all of `src/xp`.
  The room's own resume sheet in `index.html` is a separate, public document.
