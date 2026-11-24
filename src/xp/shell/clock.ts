// Phuket time and the owner's status, from the host when it provides them.
import type { Lang, PhuketTime, Status } from '../../shared/types';
import { S } from './state';

const PHUKET_MS = 7 * 3600e3;

export function phuketTime(): PhuketTime {
  try {
    const t = S.opts?.phuketTime();
    if (t) return { h: t.h, m: t.m || 0 };
  } catch {
    /* fall back to the computer's own clock */
  }
  const d = new Date(Date.now() + PHUKET_MS);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

/** The owner's status by the hour alone: asleep before 8 and after 23, playing in the evening. */
export function statusAt(hour: number): Status {
  return hour < 8 ? 'sleep' : hour < 19 ? 'work' : hour < 23 ? 'play' : 'sleep';
}

export function status(): Status {
  try {
    if (S.opts) return S.opts.status();
  } catch {
    /* fall back to the hour */
  }
  return statusAt(phuketTime().h);
}

/** The taskbar clock: 24-hour in Russian, 12-hour with AM/PM in English. */
export function formatClock(t: PhuketTime, lang: Lang): string {
  const mm = (t.m < 10 ? '0' : '') + String(t.m);
  if (lang === 'en') return `${String(t.h % 12 || 12)}:${mm} ${t.h < 12 ? 'AM' : 'PM'}`;
  return `${String(t.h)}:${mm}`;
}

export const clockText = (): string => formatClock(phuketTime(), S.lang);

export function dateText(): string {
  const d = new Date(Date.now() + PHUKET_MS);
  try {
    return d.toLocaleDateString(S.lang === 'en' ? 'en-GB' : 'ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return d.toUTCString().slice(0, 16);
  }
}

export type TimeOfDay = 'day' | 'dusk' | 'night';
/** Day 6:30–17:30, dusk until 19:15 and 5:30–6:30, night otherwise. */
export function timeOfDayAt(t: PhuketTime): TimeOfDay {
  const m = t.h * 60 + t.m;
  if (m >= 6 * 60 + 30 && m < 17 * 60 + 30) return 'day';
  if ((m >= 17 * 60 + 30 && m < 19 * 60 + 15) || (m >= 5 * 60 + 30 && m < 6 * 60 + 30)) return 'dusk';
  return 'night';
}
export const timeOfDay = (): TimeOfDay => (S.prefs.tint ? timeOfDayAt(phuketTime()) : 'day');
