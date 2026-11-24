import type { Bilingual, Lang } from './types';

/** Picks the string for the language; the legacy code does the same inline as `o[lang]`. */
export function pick<T>(text: Bilingual<T>, lang: Lang): T {
  return lang === 'en' ? text.en : text.ru;
}

/** The starting language: the saved choice, else Russian for a Russian browser, else English (as the room does it). */
export function initialLang(saved: string | null, navigatorLanguage: string | undefined): Lang {
  if (saved === 'ru' || saved === 'en') return saved;
  return (navigatorLanguage ?? 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}
