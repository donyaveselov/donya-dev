# Development notes

What the top-level [README](../README.md) leaves out: the regression harness, re-packing the model, deploying, and
the traps.

## Builds

`npm run build` makes the site (`dist/`). It fetches `room.json`, `games/*.jpg` and `wall/*.jpg` from the site's root
at runtime. three.js is bundled
from npm (`three@0.128.0`, pinned exactly: another version renders differently), no CDN.

The model is cache-busted by the build: `vite.config.ts` defines `__ROOM_VERSION__` (the first 10 hex digits of the
md5 of `public/room.json`) and the page fetches `room.json?v=<that>`. The build fails if the built scripts contain no
`room.json?v=`.

**Routes are paths** (`/resume`, `/pc`, `/night`, ...; the list is at the top of `src/modules/room/routes.ts`). The
host has no fallback to `index.html`, so `vite build` also writes a copy of the page into a folder per route
(`dist/resume/index.html`, ...); the names come from the route table (`ROUTES` in `routes.ts`, loaded by the
`route-pages` plugin in `vite.config.ts`), so a new route gets its page without a second list. That is why the site
is built with `base: '/'` (absolute URLs, the same HTML works one folder down) and the files of `public/` are fetched
by absolute paths (`/room.json`). `/resume/` (how the host serves the folder) becomes `/resume` on load. An unknown
path (`/nonsense`) is the host's 404 on donya.dev; `vite dev` and `vite preview` fall back to the page for any path,
so there it is the plain room. The router is `src/services/router.service.ts`.

## Regression harness

```sh
npm run build && npx vite preview --port 4173 --strictPort --host 127.0.0.1 &
node scripts/regress.mjs http://127.0.0.1:4173/ .work/candidate

# against a baseline capture (of main, of the previous commit...)
node scripts/compare.mjs .work/baseline .work/candidate .work/diff     # exit 1 on any regression
```

The usual baseline is a capture of the build before the change (any URL that serves a page with the same debug panel
works as `<url>`).

Playwright comes from `playwright-core` (a dev dependency) and drives an installed Chrome with `--use-gl=angle`. The
binary is `$CHROME_PATH`, else Google Chrome on macOS, else the usual Linux paths (`google-chrome`, `chromium`).

`regress.mjs` opens the page with `?debug` (it drives the debug panel) and captures 42 states in about 50 s: the
talkie tour (hello, first step, last step), the room after the tour, day / sunset / night, every status (work, Dota,
CS, sleep, outside), cloud / rain / storm, the `/night`, `/play` and `/resume` routes, the room in English, the
desktop after sitting down, every app opened once, the Start menu, the desktop in English, standing up, and a 390x844
phone (tour, room, desktop, projects). `--only=name,name` limits the shots. Console errors, page errors and failed
requests go to `errors.json`, the list of states to `states.json`.

It is deterministic: Playwright's fake clock is paused before the page loads (2026-11-24 13:00 in Phuket) and only the
harness moves it, `Math.random` is seeded, the weather API gets a fixed reply, every other outside request except
Google Fonts is blocked, and fonts are cached in `.work/font-cache`.

**Noise threshold.** `compare.mjs` fails an image above `--max=0.002` % (about 20 px of a 1280x800 frame).

## Re-packing the room model

```sh
npm run pack:room -- path/to/room.glb
```

Without an argument it looks for `../resume/portfolio/blender/room.glb` next to this repository (where the Blender
project lives on the author's machine) and stops with an error if it is not there.

It runs `gltfpack -kn -km -kv -vpf -vtf` (a dev dependency pinned at 0.24.0, since its output is the model's bytes),
gzips the GLB and writes `{"gz": base64}`. If gltfpack cannot run, the script exits with an error. The build cache-busts the fetch with the file's md5, so a re-pack
needs a rebuild and nothing else. Keep object names in Blender: the code finds meshes by name (`Screen_L`,
`Poster_0`, `WallN`, `Anchor_projects`, ...).

## Deploying (REG.RU shared hosting)

The host has no SSH, so `scripts/deploy.mjs` uploads `dist/` over FTP with TLS.

```sh
npm run deploy                 # check, build, upload
npm run deploy -- --dry-run    # check, build, print the plan, change nothing
node scripts/deploy.mjs --ls   # list the login's home folder (to find the site's folder)
```

- **Account.** Nothing about it is in the repository. The login and password come from `~/.netrc` (chmod 600):
  `machine <server>.hosting.reg.ru login <login> password <password>`. The host is `$FTP_HOST`, else the only
  `*.hosting.reg.ru` machine in `~/.netrc`. The site's folder is `$FTP_DIR`, by default `www/donya.dev`.
- **What is uploaded.** The site's folder keeps `.deploy-manifest.json` with the sha256 of every file of the last
  deploy. A file is uploaded when its hash differs (or it is missing on the host, or its size there is wrong).
- **Order.** Assets first, then the route pages (`resume/index.html`, ...), `index.html` last, then the manifest: a
  visitor never gets a page whose scripts are not there yet.
- **What is removed.** Only files that are in neither this build nor the previous manifest. The previous deploy's
  files stay for one more deploy, because a tab opened before it still has the old `index.html` and loads its desktop
  chunk lazily. `.well-known/` (Let's Encrypt) and `cgi-bin/` are never touched.
- The first deploy with this script finds no manifest, uploads everything and removes nothing.

`dist/.htaccess` (from `public/`) sets compression, caching (hashed assets and `room.json?v=` for a year,
`index.html` and a plain `room.json` revalidated) and the www → apex redirect. The hosting puts nginx in front of
Apache, and nginx may serve static files itself; then the panel's cache settings apply instead (check with
`curl -I`). `.dev` is HTTPS-only in every browser (HSTS preload), so the site opens only once the hosting has a
certificate for the domain (a free Let's Encrypt one in the panel).

## Traps

- CSS is minified with esbuild, not Vite's default Lightning CSS: Lightning drops `backdrop-filter` when
  `-webkit-backdrop-filter` is next to it, and the blur is lost in Chrome.
- The sit-down hand-off paints the desktop onto the 3D monitor by reading the desktop's DOM (`.xp`, `.xp-wall image`,
  `.xp-taskbar`, `.xp-startbtn`, `.xp-task`, `.xp-tray`, `.xp-clock`, `.xp-lang`, `.xp-icon`, ...): renaming those
  classes breaks the fly-in without any error. The list is `DESKTOP_DOM` in `src/services/desktop-registry.ts`.
- three gives every geometry, material, texture and object a uuid drawn from `Math.random`, which the harness seeds.
  The rain's particles, the minesweeper layout, Task Manager's graphs and the starfield use the same stream, so
  anything that changes how many three objects exist before them (a removed mesh, three's module-level objects dropped
  by tree shaking) moves them without any change in behaviour. Giving the rain its own seeded random would fix that
  for the harness.
- The harness finds the debug panel's buttons by their Russian labels: renaming a label in `debug-panel.ts` needs the
  same change in `scripts/regress.mjs`.
- The desktop shows work done under an NDA only in general terms: it must never name that employer or its
  repositories. `src/nda.test.ts` checks all of `src` for the names. The resume sheet in `index.html` names the
  employer; its job is marked `data-nda`, and the DocPad leaves those out when it copies the sheet.
