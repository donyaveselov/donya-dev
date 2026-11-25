// My Computer's uptime and focus graph, without the DOM (unit-tested in about.test.ts).
import { pad } from '../../../content/text';

/** hh:mm:ss of a duration in seconds. */
export const hms = (s: number): string => `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;

/** The next sample of the focus graph: a random walk inside the status's load range. */
export function nextLoad(last: number | undefined, [lo, hi]: [number, number], rnd: number): number {
  const prev = last ?? (lo + hi) / 2;
  return Math.max(lo, Math.min(hi, prev + (rnd - 0.5) * (hi - lo) * 0.6));
}
