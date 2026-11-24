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

/** A dictionary of user-visible strings, each in both languages. */
export type Dict = Readonly<Record<string, Bilingual>>;

/** Text that is either already final or still bilingual. */
export type Text = string | Bilingual;

export function isBilingual(v: unknown): v is Bilingual {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !('nodeType' in v) && ('ru' in v || 'en' in v);
}

/** Resolves text for the language; plain strings pass through, null and undefined become ''. */
export function tr(text: Text | null | undefined, lang: Lang): string {
  if (text == null) return '';
  return typeof text === 'string' ? text : pick(text, lang);
}

/** Replaces the first `%s` with the argument, as the desktop's strings use it. */
export function format(s: string, arg?: string | number | null): string {
  return arg == null ? s : s.replace('%s', String(arg));
}

/** A typed translator over a dictionary: `t('key')`, or `t('key', arg)` for a string with a `%s`. */
export function translator<D extends Dict>(
  dict: D,
  lang: () => Lang,
): (key: keyof D & string, arg?: string | number) => string {
  return (key, arg) => format(pick(dict[key] as Bilingual, lang()), arg);
}

/** Both languages of a string with a `%s`, filled with the same argument. */
export function fill(text: Bilingual, arg: string | number): Bilingual {
  return { ru: format(text.ru, arg), en: format(text.en, arg) };
}
