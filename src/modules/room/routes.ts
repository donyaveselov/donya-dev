// The room's routes: what each address opens. donya.dev/<name> for every name below, donya.dev/ is the plain room.
// The router (src/services/router.service.ts) reads the address; the build writes a page per route (vite.config.ts),
// since the host serves files only.
import type { Status } from '../../types';
import { PREVIEW_HOURS } from './store/clock';

/** Where the camera starts: the default corner, or one of the extra ones. */
export type CameraStart = 'southeast' | 'southwest' | 'northeast' | 'low';

export interface Route {
  /** a previewed hour, or null for the clock */
  preview: number | null;
  /** a previewed status, or null for the schedule */
  forced: Status | null;
  /** a game to show */
  game: 'dota' | 'cs' | null;
  /** the resume sheet is open */
  resume: boolean;
  /** sit down at the PC once the room is up: at the bare desktop, or with My Projects open */
  sit: 'desktop' | 'projects' | null;
  ps1: boolean;
  camera: CameraStart;
  /** keep the loading screen up: the room is never loaded (to look at the loader) */
  holdLoader: boolean;
}

/** The plain room (donya.dev/, or an unknown address). */
export const DEFAULT_ROUTE: Route = {
  preview: null,
  forced: null,
  game: null,
  resume: false,
  sit: null,
  ps1: true,
  camera: 'southeast',
  holdLoader: false,
};

export const ROUTES = {
  resume: { resume: true },
  // a previewed time of day
  day: { preview: PREVIEW_HOURS.day },
  sunset: { preview: PREVIEW_HOURS.sunset },
  night: { preview: PREVIEW_HOURS.night },
  // a previewed status, at the real hour
  work: { forced: 'work' },
  play: { forced: 'play' },
  sleep: { forced: 'sleep' },
  outside: { forced: 'outside' },
  dota: { forced: 'play', game: 'dota' },
  cs: { forced: 'play', game: 'cs' },
  // straight to the desktop (with a game on the monitor, with My Projects open)
  pc: { sit: 'desktop' },
  pcdota: { sit: 'desktop', forced: 'play', game: 'dota' },
  projects: { sit: 'projects' },
  nops1: { ps1: false },
  loader: { holdLoader: true },
  // another camera start (handy for checking the window portal from outside)
  southwest: { camera: 'southwest' },
  northeast: { camera: 'northeast' },
  low: { camera: 'low' },
  // the plain room in debug mode (src/utils/debug.ts reads the address itself)
  debug: {},
} as const satisfies Record<string, Partial<Route>>;

export type RouteName = keyof typeof ROUTES;
