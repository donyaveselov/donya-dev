// Phuket time and the owner's status, from the host when it provides them.
import type { PhuketTime, Status } from '../../../types';
import { S } from '../store/state';
import { formatClock, statusAt } from './time';

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

export function status(): Status {
  try {
    if (S.opts) return S.opts.status();
  } catch {
    /* fall back to the hour */
  }
  return statusAt(phuketTime().h);
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
