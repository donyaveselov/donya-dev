#!/usr/bin/env node
// Regression capture: drives the site through a fixed list of deterministic states and saves one PNG per state.
//
//   node scripts/regress.mjs <url> <outDir> [--only=name,name] [--headed]
//
// <url> is the page itself (e.g. http://127.0.0.1:8123/local.html for the old site, http://127.0.0.1:4173/ for a
// `vite preview`). Compare two captures with scripts/compare.mjs.
//
// Determinism:
//  - Playwright's fake clock is installed and paused BEFORE the page loads, so Date, performance.now, timers and
//    requestAnimationFrame only move when the harness calls advance(); every capture happens at the same fake time.
//    The fixed start is 2026-11-24 13:00 in Phuket (status "work").
//  - Math.random is a seeded PRNG (mulberry32), installed through addInitScript.
//  - The weather API answers with a fixed clear-sky reply; every other outside request is aborted, except Google
//    Fonts, which are cached on disk in .work/font-cache so repeat runs get the same bytes.
//  - All web fonts are loaded before the first capture; screenshots use animations: 'disabled' (CSS transitions and
//    animations jump to their end, infinite ones to their start) and hide the caret.
// Console errors, page errors and failed requests go to <outDir>/errors.json, the state list to <outDir>/states.json.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FALLBACK_PW = '/Users/donya/.npm/_npx/9833c18b2d85bc59/node_modules/playwright';

function loadPlaywright() {
  try {
    return require('playwright-core');
  } catch {
    return require(FALLBACK_PW);
  }
}

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [pageUrl, outArg] = args.filter((a) => !a.startsWith('--'));
if (!pageUrl || !outArg) {
  console.error('usage: node scripts/regress.mjs <url> <outDir> [--only=a,b] [--headed]');
  process.exit(2);
}
// the debug panel (which the harness drives) is only on the page with ?debug
const url = /[?&]debug\b/.test(pageUrl) ? pageUrl : pageUrl + (pageUrl.includes('?') ? '&' : '?') + 'debug';
const OUT = resolve(outArg);
const ONLY = flags.only ? new Set(String(flags.only).split(',')) : null;
const START = new Date('2026-11-24T06:00:00Z'); // 13:00 in Phuket (UTC+7): the "work" hours
const FONT_CACHE = join(ROOT, '.work', 'font-cache');
const WEATHER = { current: { time: '2026-11-24T13:00', temperature_2m: 30.4, weather_code: 0, precipitation: 0 } };
const FONTS = [
  ['Golos Text', [400, 500, 600, 700]],
  ['Unbounded', [500, 700]],
  ['Nunito', [400, 700, 800, 900]],
  ['Source Sans 3', [300, 400, 500, 600, 700]],
  ['Tiny5', [400]],
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(FONT_CACHE, { recursive: true });

const errors = [];
const states = [];
let current = 'load';
let seq = 0;

// -------------------------------------------------------------------------------------------------- page setup

const SEED_SCRIPT = `(() => {
  let a = 0x2f6b1d3c;
  Math.random = function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

async function routeOutside(context, origin) {
  await context.route('**/*', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.origin === origin || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    if (u.hostname === 'api.open-meteo.com') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(WEATHER),
      });
    }
    if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
      const key = createHash('sha1').update(req.url()).digest('hex');
      const file = join(FONT_CACHE, key);
      if (existsSync(file + '.json')) {
        const meta = JSON.parse(readFileSync(file + '.json', 'utf8'));
        return route.fulfill({ status: 200, headers: meta.headers, body: readFileSync(file) });
      }
      try {
        const res = await route.fetch();
        const body = await res.body();
        const h = res.headers();
        const headers = {
          'content-type': h['content-type'] ?? 'application/octet-stream',
          'access-control-allow-origin': '*',
        };
        if (res.ok()) {
          writeFileSync(file, body);
          writeFileSync(file + '.json', JSON.stringify({ url: req.url(), headers }));
        }
        return route.fulfill({ status: res.status(), headers, body });
      } catch {
        return route.abort();
      }
    }
    return route.abort('blockedbyclient');
  });
}

async function newPage(browser, { viewport, mobile = false }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'ru-RU',
    timezoneId: 'UTC',
    reducedMotion: 'no-preference',
    colorScheme: 'dark',
  });
  await routeOutside(context, new URL(url).origin);
  await context.addInitScript(SEED_SCRIPT);
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      errors.push({ state: current, kind: 'console.' + m.type(), text: m.text() });
  });
  page.on('pageerror', (e) =>
    errors.push({ state: current, kind: 'pageerror', text: String(e && e.stack ? e.stack : e) }),
  );
  page.on('requestfailed', (r) => {
    const f = r.failure();
    if (f && f.errorText.includes('BLOCKED_BY_CLIENT')) return; // our own outside-request block
    errors.push({ state: current, kind: 'requestfailed', text: r.url() + ' ' + (f ? f.errorText : '') });
  });
  await page.clock.install({ time: START });
  await page.clock.pauseAt(START.getTime() + 1);
  return { context, page };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Polls a page predicate in real time (the page's own timers are frozen). */
async function until(page, fn, arg, what, timeout = 30000) {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(fn, arg).catch(() => false)) return;
    if (Date.now() - t0 > timeout) throw new Error('timed out waiting for ' + what);
    await sleep(100);
  }
}

/** Moves the fake clock: timers and animation frames for `ms` of page time, then lets real-time work settle. */
async function advance(page, ms) {
  for (let left = ms; left > 0; left -= 500) await page.clock.runFor(Math.min(500, left));
  await sleep(120);
}

async function loadRoom(page, hash = '') {
  current = 'load';
  await page.goto(url + hash, { waitUntil: 'domcontentloaded' });
  await until(
    page,
    () => !!window.__psx && document.getElementById('loading').style.opacity === '0',
    null,
    'the room to load',
    60000,
  );
  await page.evaluate(async (fonts) => {
    await Promise.all(
      fonts.flatMap(([f, ws]) => ws.map((w) => document.fonts.load(`${w} 16px "${f}"`).catch(() => null))),
    );
    await document.fonts.ready;
  }, FONTS);
  await sleep(300); // the weather reply and the model's images are real-time work
}

async function shot(page, name) {
  if (ONLY && !ONLY.has(name)) return;
  current = name;
  const file = `${String(++seq).padStart(2, '0')}-${name}.png`;
  await sleep(450); // CSS transitions run on the real clock (the labels fade in .25 s): let them land, not jump
  // The floating labels move every frame; Chrome keeps the raster offset a moving layer had in whichever frame it
  // happened to composite, so their text lands a pixel left or right from run to run. Re-creating their boxes right
  // before the shot rasterises them at their final position.
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('.tag, .pin')];
    const was = els.map((e) => e.style.display);
    els.forEach((e) => {
      e.style.display = 'none';
    });
    void document.body.offsetWidth;
    els.forEach((e, i) => {
      e.style.display = was[i];
    });
  });
  await sleep(150);
  await page.screenshot({ path: join(OUT, file), animations: 'disabled', caret: 'hide' });
  // a few layout numbers next to each picture: a moved chip shows up here before anyone squints at a diff
  const layout = await page.evaluate(() =>
    Object.fromEntries(
      ['time', 'open-resume', 'lang-ru', 'lang-en']
        .map((id) => {
          const r = document.getElementById(id)?.getBoundingClientRect();
          return [id, r ? [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(3)) : null];
        })
        .concat([
          [
            'labels',
            [...document.querySelectorAll('.tag, .pin')].map((e) => `${e.textContent}@${e.style.left},${e.style.top}`),
          ],
        ]),
    ),
  );
  states.push({ name, file, viewport: page.viewportSize(), layout });
  process.stdout.write(`  ${file}\n`);
}

// -------------------------------------------------------------------------------------------------- page actions

const click = (page, sel) => page.$eval(sel, (el) => el.click());
/** Clicks a debug panel button: row by its label (debug, время, погода, полёт, ps1), button by its text. */
const dbg = (page, row, btn) =>
  page.evaluate(
    ([row, btn]) => {
      const line = [...document.querySelectorAll('.dbg > div')].find((d) => d.querySelector('b')?.textContent === row);
      const b = line && [...line.querySelectorAll('button')].find((x) => x.textContent === btn);
      if (!b) throw new Error('no debug button ' + row + '/' + btn);
      b.click();
    },
    [row, btn],
  );
const setHash = (page, h) =>
  page.evaluate((h) => {
    location.hash = h;
  }, h);
const tourNext = (page) => click(page, '.talkie .tbtn:not(.tbtn--ghost)');
const tourNo = (page) => click(page, '.talkie .tbtn--ghost');

async function sitDown(page) {
  await page.evaluate(() => window.__psx.sitDown('L'));
  await advance(page, 3000);
  await until(
    page,
    () => document.body.classList.contains('at-pc') && !!document.querySelector('#xp-root .xp'),
    null,
    'the desktop',
  );
  await advance(page, 2500);
  // windows open at this point (the minimised status app) stay for the whole session
  await page.evaluate(() =>
    document.querySelectorAll('#xp-root .xp-win').forEach((w) => w.setAttribute('data-regress-keep', '')),
  );
}

async function closeNew(page) {
  await page.evaluate(() => {
    document.querySelectorAll('#xp-root .xp-win:not([data-regress-keep]) .xp-tbtn--close').forEach((b) => b.click());
  });
  await advance(page, 1200);
  await page.evaluate(() => {
    document.querySelector('#xp-root .xp-startbtn.xp--on')?.click();
  });
  await advance(page, 600);
}

async function openApp(page, id, params) {
  await page.evaluate(([id, params]) => window.XPDesktop.openApp(id, params), [id, params]);
  await advance(page, 1800);
}

// -------------------------------------------------------------------------------------------------- the states

async function desktopSession(browser) {
  const { context, page } = await newPage(browser, { viewport: { width: 1280, height: 800 } });
  await loadRoom(page);

  // the talkie: hello, the first tour step, the last one, then the room with every label on
  await advance(page, 1000);
  await advance(page, 6000);
  await shot(page, 'tour-hello');
  await tourNext(page); // "Да"
  await advance(page, 6000);
  await shot(page, 'tour-work');
  for (let i = 0; i < 9; i++) {
    await tourNext(page);
    await advance(page, 100);
    await click(page, '.talkie .tbub'); // finishes the line
    await advance(page, 1500);
  }
  await advance(page, 2000);
  await shot(page, 'tour-end');
  await tourNext(page);
  await advance(page, 3000);
  await shot(page, 'room-default');

  // time of day (the status follows the hour)
  for (const [label, name] of [
    ['день', 'day'],
    ['закат', 'sunset'],
    ['ночь', 'night'],
  ]) {
    await dbg(page, 'время', label);
    await advance(page, 3000);
    await shot(page, 'time-' + name);
  }
  await dbg(page, 'время', 'auto');
  // statuses
  for (const [label, name] of [
    ['работаю', 'work'],
    ['Dota', 'play-dota'],
    ['CS', 'play-cs'],
    ['сплю', 'sleep'],
    ['на улице', 'outside'],
  ]) {
    await dbg(page, 'debug', label);
    await advance(page, 3000);
    await shot(page, 'status-' + name);
  }
  await dbg(page, 'debug', 'auto');
  // weather
  for (const [label, name] of [
    ['облачно', 'cloud'],
    ['дождь', 'rain'],
    ['гроза', 'storm'],
  ]) {
    await dbg(page, 'погода', label);
    await advance(page, 3000);
    if (name === 'storm') {
      await page.evaluate(() => window.__psx.strike());
      await advance(page, 120);
    }
    await shot(page, 'wx-' + name);
  }
  await dbg(page, 'погода', 'auto');
  await advance(page, 2000);
  // hash routes
  await setHash(page, 'night');
  await advance(page, 3000);
  await shot(page, 'hash-night');
  await setHash(page, 'play');
  await advance(page, 3000);
  await shot(page, 'hash-play');
  await setHash(page, 'resume');
  await advance(page, 1500);
  await shot(page, 'hash-resume');
  await setHash(page, '');
  await advance(page, 3000);
  // language
  await click(page, '#lang-en');
  await advance(page, 1500);
  await shot(page, 'room-en');
  await click(page, '#lang-ru');
  await advance(page, 1500);

  // at the computer
  await sitDown(page);
  await shot(page, 'pc-desktop');
  const apps = [
    ['projects'],
    ['project', { id: 'verifikat' }, 'project-verifikat'],
    ['project', { id: 'kompy' }, 'project-kompy'],
    ['project', { id: 'wax' }, 'project-wax'],
    ['resume'],
    ['about'],
    ['contact'],
    ['terminal'],
    ['minesweeper'],
    ['paint'],
    ['recycle'],
    ['browser'],
    ['notepad'],
    ['calc'],
    ['display', undefined, 'display-properties'],
  ];
  for (const [id, params, name] of apps) {
    await openApp(page, id, params);
    if (id === 'terminal') {
      await page.evaluate(() => document.querySelector('#xp-root .xpa-term-in')?.focus());
      await page.keyboard.type('help');
      await page.keyboard.press('Enter');
      await advance(page, 2500);
    }
    await shot(page, 'app-' + (name ?? id));
    await closeNew(page);
  }
  await click(page, '#xp-root .xp-startbtn');
  await advance(page, 1200);
  await shot(page, 'pc-start-menu');
  await closeNew(page);
  // the desktop in English, with a window open
  await page.evaluate(() => document.getElementById('lang-en').click());
  await advance(page, 1000);
  await openApp(page, 'projects');
  await shot(page, 'pc-en-projects');
  await closeNew(page);
  await page.evaluate(() => document.getElementById('lang-ru').click());
  await advance(page, 1000);
  // back to the room
  await page.evaluate(() => window.__psx.standUp());
  await advance(page, 4000);
  await shot(page, 'room-standup');
  await context.close();
}

async function mobileSession(browser) {
  const { context, page } = await newPage(browser, { viewport: { width: 390, height: 844 }, mobile: true });
  await loadRoom(page);
  await advance(page, 7000);
  await shot(page, 'mobile-tour-hello');
  await tourNo(page);
  await advance(page, 3000);
  await shot(page, 'mobile-room');
  await sitDown(page);
  await shot(page, 'mobile-pc-desktop');
  await openApp(page, 'projects');
  await shot(page, 'mobile-app-projects');
  await context.close();
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', ...(process.env.REGRESS_CHROME_ARGS ? process.env.REGRESS_CHROME_ARGS.split(' ') : [])],
  headless: !flags.headed,
});
const t0 = Date.now();
try {
  console.log(`capturing ${url} -> ${OUT}`);
  await desktopSession(browser);
  await mobileSession(browser);
} catch (e) {
  errors.push({ state: current, kind: 'harness', text: String(e && e.stack ? e.stack : e) });
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(join(OUT, 'states.json'), JSON.stringify({ url, start: START.toISOString(), states }, null, 2));
  writeFileSync(join(OUT, 'errors.json'), JSON.stringify(errors, null, 2));
  console.log(`${states.length} states, ${errors.length} errors/warnings, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
