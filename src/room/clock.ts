// Phuket time drives the owner's status, the light and the sky. Four states: sleep, work, play, outside. They follow a
// daily schedule; 'play' can also come from my Discord presence (see presence.ts).
import type { PhuketTime, Status } from '../shared/types';
import type { Presence } from './presence';

export const STATUSES: readonly Status[] = ['work', 'play', 'sleep', 'outside'];

export function isStatus(s: string): s is Status {
  return (STATUSES as readonly string[]).includes(s);
}

let fmt: Intl.DateTimeFormat | null = null;

/** The wall-clock time in Phuket (UTC+7), or the previewed hour (e.g. 18.2 = 18:12) when one is set. */
export function phuketTime(now: Date, preview: number | null): PhuketTime {
  let h = 0;
  let m = 0;
  try {
    fmt ??= new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    for (const p of fmt.formatToParts(now)) {
      if (p.type === 'hour') h = +p.value % 24;
      if (p.type === 'minute') m = +p.value;
    }
  } catch {
    h = (now.getUTCHours() + 7) % 24;
    m = now.getUTCMinutes();
  }
  if (preview != null) {
    h = Math.floor(preview);
    m = Math.round((preview % 1) * 60);
  }
  return { h, m };
}

/**
 * The status for a time of day; a forced one (preview, tour) wins, then a game being played. `presence` is null while
 * there is no reading (not polled yet, or the request failed).
 */
export function statusAt(time: PhuketTime, forced: Status | null, presence: Presence | null): Status {
  if (forced) return forced;
  if (presence?.playing) return 'play';
  const h = time.h + time.m / 60;
  if (h < 8 || h >= 23.5) return 'sleep';
  if (h >= 10 && h < 19) return 'work';
  if (h >= 20.5) return presence ? 'outside' : 'play'; // with a presence reading, 'play' only ever comes from it
  return 'outside'; // mornings and the hour around sunset
}
