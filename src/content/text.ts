// Helpers for the desktop's bilingual strings.
import type { Bilingual } from '../types';

/** A string in both languages. */
export const d = (ru: string, en: string): Bilingual => ({ ru, en });

/** A number padded with zeros: pad(7) is '07'. */
export const pad = (n: number | string, w = 2): string => String(n).padStart(w, '0');

/** The Russian form of a noun after a number: plural(3, 'объект', 'объекта', 'объектов') is 'объекта'. */
export function plural(n: number, one: string, few: string, many: string): string {
  const k = Math.abs(n) % 100;
  const u = k % 10;
  if (k > 10 && k < 20) return many;
  if (u === 1) return one;
  if (u >= 2 && u <= 4) return few;
  return many;
}

/** A number with its noun in both languages: counted(4, ['объект', 'объекта', 'объектов'], ['object', 'objects']). */
export function counted(
  n: number,
  ru: readonly [one: string, few: string, many: string],
  en: readonly [one: string, many: string],
): Bilingual {
  return { ru: `${String(n)} ${plural(n, ...ru)}`, en: `${String(n)} ${n === 1 ? en[0] : en[1]}` };
}

/** Fills the `%s` of each language with that language's text. */
export function fillEach(text: Bilingual, arg: Bilingual): Bilingual {
  return { ru: text.ru.replace('%s', arg.ru), en: text.en.replace('%s', arg.en) };
}
