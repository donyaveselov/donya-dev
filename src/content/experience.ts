// Years in development, counted from the first job (RANKS LLC, February 2022) in whole half-years, so "4,5 года" on the
// resume never goes stale. Every place that states the experience takes it from here.
import type { Bilingual } from '../types';
import { plural } from './text';

/** The first month of the first job. */
export const CAREER_START = { year: 2022, month: 2 };

/** Full years in development, rounded down to a half: 4.75 years is 4.5. */
export function experienceYears(now: Date = new Date()): number {
  const months = (now.getFullYear() - CAREER_START.year) * 12 + (now.getMonth() + 1 - CAREER_START.month);
  return Math.max(0, Math.floor(months / 6)) / 2;
}

/** "4,5 года" / "5 лет" / "21 год"; "4.5 years" / "1 year". */
export function yearsText(years: number): Bilingual {
  const whole = Number.isInteger(years);
  const n = Math.floor(years);
  const ru = whole ? plural(n, 'год', 'года', 'лет') : 'года';
  return {
    ru: `${String(years).replace('.', ',')} ${ru}`,
    en: `${String(years)} ${years === 1 ? 'year' : 'years'}`,
  };
}

/** The experience as of this visit. */
export const EXPERIENCE: Bilingual = yearsText(experienceYears());
