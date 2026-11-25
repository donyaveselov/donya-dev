// Contact me without the DOM (unit-tested in contact.test.ts).
import type { Contact } from '../content/profile';

/** The contact `dir` steps from the current one of `n`, wrapping around (or stopping at the ends). */
export function stepContact(i: number, dir: 1 | -1, wrap: boolean, n: number): number {
  return wrap ? (i + dir + n) % n : Math.max(0, Math.min(n - 1, i + dir));
}

/** Where Send goes for a recipient: its own link (Telegram, GitHub, the site), or a mailto: with the subject. */
export function sendUrl(c: Pick<Contact, 'id' | 'value' | 'href'>, subject: string): string {
  if (c.href) return c.href;
  const s = subject.trim();
  return `mailto:${c.value}${s ? `?subject=${encodeURIComponent(s)}` : ''}`;
}
