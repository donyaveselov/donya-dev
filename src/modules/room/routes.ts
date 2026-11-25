// The page's addresses: a path per route on the one page, and this module is the only place that reads or writes it.
//   /resume                           the resume sheet
//   /day /sunset /night               a previewed time of day
//   /work /play /sleep /outside       a previewed status, at the real hour
//   /dota /cs                         playing that game
//   /pc /pcdota /projects             straight to the desktop (with a game on the monitor, with My Projects open)
//   /nops1                            without the PS1 look
//   /loader                           the loading screen for good: the room is never loaded (to look at the loader)
//   /southwest /northeast /low        another camera start (handy for checking the window portal from outside)
// (/debug is not a route: debug mode is remembered for the tab and the desktop needs it too, see src/utils/debug.ts.)
//
// The host serves files only, with no fallback to index.html, so the build writes a copy of the page into a folder
// per name in PAGES (dist/resume/index.html, ...; see vite.config.ts). Old links (/#resume) become the path on load.
// The single-file artifact build keeps hash routes (#resume): its page is not at the root of a site of its own.
// The build loads this module for PAGES outside a browser, so nothing here may touch one until a function is called.
import type { Status } from '../../types';
import { PREVIEW_HOURS, STATUSES, isStatus } from './store/clock';
import { GAME_NAMES } from '../../services/presence.service';

/** Where the camera starts: the default corner, or one of the extra ones. */
export type CameraStart = 'southeast' | 'southwest' | 'northeast' | 'low';

export interface Route {
  /** a previewed hour, or null for the clock */
  preview: number | null;
  /** a previewed status, or null for the schedule */
  forced: Status | null;
  /** a game to show */
  game: { kind: 'dota' | 'cs'; name: string } | null;
  /** the resume sheet is open */
  resume: boolean;
  /** sit down at the PC once the room is up: at the bare desktop, or with My Projects open */
  sit: 'desktop' | 'projects' | null;
  ps1: boolean;
  camera: CameraStart;
  /** keep the loading screen up: the room is never loaded */
  holdLoader: boolean;
}

const GAMES: Readonly<Record<string, 'dota' | 'cs'>> = { dota: 'dota', cs: 'cs', pcdota: 'dota' };
const SITS: Readonly<Record<string, Route['sit']>> = { pc: 'desktop', pcdota: 'desktop', projects: 'projects' };
const CAMERAS: Readonly<Record<string, CameraStart>> = { southwest: 'southwest', northeast: 'northeast', low: 'low' };
/** the routes that are a switch of their own */
const FLAGS = ['resume', 'nops1', 'loader'] as const;
type Flag = (typeof FLAGS)[number];

/** Every route's name, from the tables above. */
export const ROUTES: readonly string[] = [
  ...new Set([
    ...Object.keys(PREVIEW_HOURS),
    ...STATUSES,
    ...Object.keys(GAMES),
    ...Object.keys(SITS),
    ...Object.keys(CAMERAS),
    ...FLAGS,
  ]),
];

/** Every name the page answers to, the routes and debug mode: the build writes a page for each. */
export const PAGES: readonly string[] = [...ROUTES, 'debug'];

/** A table's own entry: a name is whatever the visitor typed, 'constructor' included. */
const lookup = <T>(table: Readonly<Record<string, T>>, key: string): T | null =>
  Object.hasOwn(table, key) ? (table[key] ?? null) : null;

const is = (name: string, flag: Flag): boolean => name === flag;

/** What a route name asks for; an unknown one is the plain room. */
export function parseRoute(name: string): Route {
  const game = lookup(GAMES, name);
  return {
    preview: lookup<number>(PREVIEW_HOURS, name),
    forced: game ? 'play' : isStatus(name) ? name : null,
    game: game ? { kind: game, name: GAME_NAMES[game] } : null,
    resume: is(name, 'resume'),
    sit: lookup(SITS, name),
    ps1: !is(name, 'nops1'),
    camera: lookup(CAMERAS, name) ?? 'southeast',
    holdLoader: is(name, 'loader'),
  };
}

/**
 * The route name in an address: a hash (an old link, #resume) wins, else the one folder of the path (/resume,
 * /resume/, /resume/index.html). The root, /index.html and deeper paths are ''. index.html's sky script has a copy.
 */
export function routeName(pathname: string, hash: string): string {
  if (hash.length > 1) return hash.slice(1);
  const name = /^\/([^/]+)(?:\/(?:index\.html)?)?$/.exec(pathname)?.[1] ?? '';
  return name === 'index.html' ? '' : name;
}

/** Whether the page routes by the hash (the artifact build) instead of the path. */
const hashRoutes = (): boolean => __HASH_ROUTES__;

/** A route's address, keeping the query (?debug). */
const href = (name: string): string => `/${name}${location.search}`;

export const currentName = (): string => routeName(hashRoutes() ? '' : location.pathname, location.hash);

export const currentRoute = (): Route => parseRoute(currentName());

/** The history state of an entry this page pushed: leaving its route can then go back instead of adding another. */
const PUSHED = 'donya-route';

/** Goes to a route as a new history entry, so that Back leaves it. Nothing happens when the page is there already. */
export function goTo(name: string): void {
  if (currentName() === name) return;
  if (hashRoutes()) location.hash = name;
  else history.pushState(PUSHED, '', href(name));
}

/** leave() went back: the next popstate only returns to where the visitor was */
let goingBack = false;

/**
 * Leaves the route the page is on (the resume sheet closed): back to the entry it came from when this page pushed
 * it, else (the visitor came straight to /resume) the plain room in its place, so the address never keeps junk.
 */
export function leave(name: string): void {
  if (currentName() !== name) return;
  if (hashRoutes()) location.hash = '';
  else if (history.state === PUSHED) {
    goingBack = true;
    history.back();
  } else history.replaceState(null, '', href(''));
}

/** Whether this address change is leave() going back (asked once per change). */
export function leftByPage(): boolean {
  const was = goingBack;
  goingBack = false;
  return was;
}

/** The event that says the address changed under the page (Back, Forward, a hash typed into the address bar). */
export const addressEvent = (): 'popstate' | 'hashchange' => (hashRoutes() ? 'hashchange' : 'popstate');

/**
 * Puts the address in its one form, in place (no history entry): an old link's hash (/#resume) becomes its path and
 * any other hash is dropped; /resume/ and /index.html (how the host serves the folders) lose the tail. An unknown
 * path is left as it is. Nothing to do with hash routes.
 */
export function tidyAddress(): void {
  if (hashRoutes()) return;
  const fromHash = location.hash.slice(1);
  const fromPath = routeName(location.pathname, '');
  let path = location.pathname;
  if (PAGES.includes(fromHash)) path = `/${fromHash}`;
  else if (fromPath) path = `/${fromPath}`;
  else if (path === '/index.html') path = '/';
  const next = path + location.search;
  if (next !== location.pathname + location.search || location.href.includes('#'))
    history.replaceState(history.state, '', next);
}
