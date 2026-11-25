// Weather in Phuket from Open-Meteo (free, no key, open CORS): clear / cloudy / drizzle / rain / storm from the WMO
// weather code. The last answer is remembered, so a repeat visit within three hours starts with it.

export type WeatherKind = 'clear' | 'cloud' | 'drizzle' | 'rain' | 'storm';

export interface Weather {
  kind: WeatherKind;
  code: number;
  precip: number;
  temp: number | null;
  /** When the reading arrived (ms); 0 = no reading yet (offline, blocked). */
  at: number;
  /** Set from the debug panel; overrides the reading. */
  forced: WeatherKind | null;
}

export const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=7.88&longitude=98.39&current=temperature_2m,weather_code,precipitation&timezone=Asia%2FBangkok';
const STORE_KEY = 'wx';
const STORE_TTL = 3 * 3600e3;

export function weatherKind(code: number): WeatherKind {
  if (code >= 95) return 'storm';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 1 && code <= 3) || code === 45 || code === 48) return 'cloud';
  return 'clear';
}

const OVERCAST: Record<WeatherKind, number> = { clear: 0, cloud: 0.45, drizzle: 0.7, rain: 0.85, storm: 1 };

export const effectiveKind = (wx: Weather): WeatherKind => wx.forced ?? wx.kind;

/** 0 clear .. 1 storm: how grey the sky goes and how much the coast darkens. */
export const overcast = (wx: Weather): number => OVERCAST[effectiveKind(wx)];

/** Rain density 0..1: a forced kind gets a fixed amount, a real one grows with the precipitation (mm/h). */
export function rainAmount(wx: Weather): number {
  const k = effectiveKind(wx);
  if (k === 'drizzle') return 0.25;
  if (k !== 'rain' && k !== 'storm') return 0;
  const r = wx.forced ? (k === 'storm' ? 1 : 0.6) : Math.min(1, 0.35 + wx.precip / 3);
  return k === 'storm' ? Math.max(0.8, r) : r;
}

/** Lightning: 1 for the first flash, a dim gap, the second flash, then a short fade (seconds since the strike). */
export function flashLevel(e: number): number {
  return e < 0.07 ? 1 : e < 0.13 ? 0.15 : e < 0.26 ? 0.8 : Math.max(0, 0.8 - (e - 0.26) * 4);
}

export function newWeather(): Weather {
  return { kind: 'clear', code: 0, precip: 0, temp: null, at: 0, forced: null };
}

/** Applies a remembered reading if it is fresh enough. */
export function restoreWeather(wx: Weather, now: number): void {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Weather> | null) : null;
    if (saved && typeof saved.at === 'number' && now - saved.at < STORE_TTL) {
      wx.kind = saved.kind ?? 'clear';
      wx.precip = saved.precip ?? 0;
      wx.code = saved.code ?? 0;
      wx.temp = saved.temp ?? null;
      wx.at = saved.at;
    }
  } catch {
    // no storage: start clear
  }
}

interface MeteoReply {
  current?: { weather_code?: number; precipitation?: number; temperature_2m?: number };
}

/**
 * Fetches the current weather into `wx`, remembers it and calls `changed`. A failed request, an error status or a
 * reply without a reading (offline, blocked, the API down) changes nothing: the window stays as it is and the last
 * good answer stays remembered.
 */
export async function fetchWeather(wx: Weather, changed: () => void): Promise<void> {
  let current: MeteoReply['current'];
  try {
    const r = await fetch(WEATHER_URL);
    if (!r.ok) return;
    current = ((await r.json()) as MeteoReply | null)?.current;
  } catch {
    return;
  }
  if (!current) return;
  const code = (current.weather_code ?? 0) | 0;
  wx.code = code;
  wx.precip = Number(current.precipitation) || 0;
  wx.temp = current.temperature_2m ?? null;
  wx.at = Date.now();
  wx.kind = weatherKind(code);
  try {
    const { at, kind, precip, temp } = wx;
    localStorage.setItem(STORE_KEY, JSON.stringify({ at, kind, precip, code, temp }));
  } catch {
    // storage full or blocked: only the repeat visit loses the head start
  }
  changed();
}
