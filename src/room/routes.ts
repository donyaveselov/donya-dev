// The page's addresses: everything is a hash on the one page, and this module is the only place that reads it.
//   #resume                           the resume sheet
//   #day #sunset #night               a previewed time of day
//   #work #play #sleep #outside       a previewed status, at the real hour
//   #dota #cs                         playing that game
//   #pc #pcdota #projects             straight to the desktop (with a game on the monitor, with My Projects open)
//   #nops1                            without the PS1 look
//   #southwest #northeast #low        another camera start (handy for checking the window portal from outside)
// (#debug is not a route: debug mode is remembered for the tab and the desktop needs it too, see src/shared/debug.ts.)
import type { Status } from '../shared/types';
import { PREVIEW_HOURS, isStatus } from './clock';
import { GAME_NAMES } from './presence';

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
}

const GAMES: Readonly<Record<string, 'dota' | 'cs'>> = { dota: 'dota', cs: 'cs', pcdota: 'dota' };
const SITS: Readonly<Record<string, Route['sit']>> = { pc: 'desktop', pcdota: 'desktop', projects: 'projects' };
const CAMERAS: Readonly<Record<string, CameraStart>> = { southwest: 'southwest', northeast: 'northeast', low: 'low' };

/** A table's own entry: a hash is whatever the visitor typed, 'constructor' included. */
const lookup = <T>(table: Readonly<Record<string, T>>, key: string): T | null =>
  Object.hasOwn(table, key) ? (table[key] ?? null) : null;

/** What a hash (without the #) asks for; an unknown one is the plain room. */
export function parseRoute(hash: string): Route {
  const game = lookup(GAMES, hash);
  return {
    preview: lookup<number>(PREVIEW_HOURS, hash),
    forced: game ? 'play' : isStatus(hash) ? hash : null,
    game: game ? { kind: game, name: GAME_NAMES[game] } : null,
    resume: hash === 'resume',
    sit: lookup(SITS, hash),
    ps1: hash !== 'nops1',
    camera: lookup(CAMERAS, hash) ?? 'southeast',
  };
}

export const currentHash = (): string => location.hash.replace('#', '');

export const currentRoute = (): Route => parseRoute(currentHash());

export function setHash(hash: string): void {
  if (currentHash() !== hash) location.hash = hash;
}
