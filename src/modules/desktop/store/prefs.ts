// The visitor's saved preferences. They come back from localStorage, which anything may have written: every field is
// checked on its own and falls back to its default (unit-tested in prefs.test.ts).
import type { Cell } from '../windows/layout';

export const SAVER_KINDS = ['none', 'logo', 'stars'] as const;
export type SaverKind = (typeof SAVER_KINDS)[number];

export interface Prefs {
  /** 0..1; mute is not a preference of the desktop but the page's one switch (src/store/sound.ts). */
  volume: number;
  /** A wallpaper id from wallpaper.ts, or 'none'. */
  wall: string;
  /** The wallpaper follows the time of day. */
  tint: boolean;
  crt: boolean;
  saver: SaverKind;
  /** Idle minutes before the screen saver, 1..60. */
  saverMin: number;
  /** Where the visitor left the desktop icons, by app id. */
  icons: Record<string, Cell>;
  autoArrange: boolean;
}

export const defaultPrefs = (): Prefs => ({
  volume: 0.8,
  wall: 'bliss',
  tint: true,
  crt: true,
  saver: 'logo',
  saverMin: 3,
  icons: {},
  autoArrange: false,
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const numberIn = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const isCellIndex = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function parseIcons(raw: unknown): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  if (!isRecord(raw)) return out;
  for (const [id, cell] of Object.entries(raw)) {
    if (!Array.isArray(cell) || cell.length !== 2) continue;
    const [col, row] = cell as unknown[];
    if (isCellIndex(col) && isCellIndex(row)) out[id] = [col, row];
  }
  return out;
}

/** Preferences from whatever was stored: unknown keys are dropped, a missing or malformed field gets its default. */
export function parsePrefs(raw: unknown): Prefs {
  const d = defaultPrefs();
  if (!isRecord(raw)) return d;
  return {
    volume: numberIn(raw.volume, 0, 1, d.volume),
    wall: typeof raw.wall === 'string' && raw.wall ? raw.wall : d.wall,
    tint: bool(raw.tint, d.tint),
    crt: bool(raw.crt, d.crt),
    saver: SAVER_KINDS.find((k) => k === raw.saver) ?? d.saver,
    saverMin: Math.round(numberIn(raw.saverMin, 1, 60, d.saverMin)),
    icons: parseIcons(raw.icons),
    autoArrange: bool(raw.autoArrange, d.autoArrange),
  };
}

/** Prefs saved before mute became the page's one switch carried their own `muted`. */
export const legacyMuted = (raw: unknown): boolean => isRecord(raw) && raw.muted === true;
