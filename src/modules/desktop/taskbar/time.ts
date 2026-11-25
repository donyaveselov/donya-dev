// Clock arithmetic of the shell, without the DOM (unit-tested in time.test.ts).
import type { Lang, PhuketTime, Status } from '../../../types';

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
