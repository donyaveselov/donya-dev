// Clock arithmetic of the shell, without the DOM (unit-tested in time.test.ts).
import type { Lang, PhuketTime, Status } from '../../shared/types';

/** The owner's status by the hour alone: asleep before 8 and after 23, playing in the evening. */
export function statusAt(hour: number): Status {
  return hour < 8 ? 'sleep' : hour < 19 ? 'work' : hour < 23 ? 'play' : 'sleep';
}

/** The taskbar clock: 24-hour in Russian, 12-hour with AM/PM in English. */
export function formatClock(t: PhuketTime, lang: Lang): string {
  const mm = (t.m < 10 ? '0' : '') + String(t.m);
  if (lang === 'en') return `${String(t.h % 12 || 12)}:${mm} ${t.h < 12 ? 'AM' : 'PM'}`;
  return `${String(t.h)}:${mm}`;
}

export type TimeOfDay = 'day' | 'dusk' | 'night';

/** Day 6:30–17:30, dusk until 19:15 and 5:30–6:30, night otherwise. */
export function timeOfDayAt(t: PhuketTime): TimeOfDay {
  const m = t.h * 60 + t.m;
  if (m >= 6 * 60 + 30 && m < 17 * 60 + 30) return 'day';
  if ((m >= 17 * 60 + 30 && m < 19 * 60 + 15) || (m >= 5 * 60 + 30 && m < 6 * 60 + 30)) return 'dusk';
  return 'night';
}
