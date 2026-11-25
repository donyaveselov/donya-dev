// What the room is showing: the page language, the Phuket clock, the owner's status and game, the weather.
import { initialLang } from '../../../i18n/i18n';
import type { GameKind, Lang, Status } from '../../../types';
import { phuketTime, statusAt } from './clock';
import type { Presence } from '../../../services/presence.service';
import { newWeather } from '../../../services/weather.service';

function savedLang(): string | null {
  try {
    return localStorage.getItem('lang');
  } catch {
    return null;
  }
}

export const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const live = {
  lang: initialLang(savedLang(), navigator.language),
  /** the Phuket clock as last read (every 5 s) */
  time: { h: 12, m: 0 },
  /** a previewed hour (#day, the debug panel, the tour) instead of the clock */
  preview: null as number | null,
  /** a previewed status (#work, the debug panel, the tour) instead of the schedule */
  forced: null as Status | null,
  /** my Discord presence as last read; null before the first reading and after a failed one */
  presence: null as Presence | null,
  game: { kind: 'other' as GameKind, name: null as string | null },
  wx: newWeather(),
};

export const status = (): Status => statusAt(live.time, live.forced, live.presence);

/** The hour as a number, 13.5 = 13:30. */
export const hourOfDay = (): number => live.time.h + live.time.m / 60;

/** Reads the clock (or the preview); true when the minute changed. */
export function readClock(): boolean {
  const c = phuketTime(new Date(), live.preview);
  const changed = c.h !== live.time.h || c.m !== live.time.m;
  live.time.h = c.h;
  live.time.m = c.m;
  return changed;
}

export function saveLang(lang: Lang): void {
  live.lang = lang;
  try {
    localStorage.setItem('lang', lang);
  } catch {
    // private mode: the choice lasts for the visit
  }
}
