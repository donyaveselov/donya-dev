// Helpers for the desktop's bilingual strings.
import type { Bilingual } from '../../shared/types';

/** A string in both languages. */
export const d = (ru: string, en: string): Bilingual => ({ ru, en });

/** The Russian form of a noun after a number: plural(3, 'объект', 'объекта', 'объектов') is 'объекта'. */
export function plural(n: number, one: string, few: string, many: string): string {
  const k = Math.abs(n) % 100;
  const u = k % 10;
  if (k > 10 && k < 20) return many;
  if (u === 1) return one;
  if (u >= 2 && u <= 4) return few;
  return many;
}
