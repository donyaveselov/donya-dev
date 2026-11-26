// The language in the address: donya.dev/<route> is English, donya.dev/ru/<route> is Russian. Pure functions of the
// path, shared by the router (the page) and the build (vite.config.ts writes a page per language and route).
import type { Lang } from '../types';

/** The prefix of the Russian pages. */
export const RU_PREFIX = '/ru';

/** The language a path is in: /ru, /ru/, /ru/... are Russian, everything else English. */
export const langOfPath = (path: string): Lang => (path.split('/')[1] === 'ru' ? 'ru' : 'en');

/** The path without its language: /ru/resume/ is /resume/, /ru is /. */
export function barePath(path: string): string {
  if (langOfPath(path) === 'en') return path;
  const rest = path.slice(RU_PREFIX.length);
  return rest === '' ? '/' : rest;
}

/** The same bare path in a language: /resume/ is /ru/resume/ in Russian, / is /ru/. */
export function inLang(bare: string, lang: Lang): string {
  return lang === 'ru' ? RU_PREFIX + bare : bare;
}

/** A path in the other language, everything after the prefix kept as it is: /resume/ ↔ /ru/resume/, / ↔ /ru/. */
export const counterpartPath = (path: string, lang: Lang): string => inLang(barePath(path), lang);

/** The address (path, query, hash) in a language: what the language switch replaces the address with. */
export function counterpartUrl(loc: { pathname: string; search: string; hash: string }, lang: Lang): string {
  return counterpartPath(loc.pathname, lang) + loc.search + loc.hash;
}

/** A route's page in a language, as the host serves its folder: '' is / or /ru/, resume is /resume/ or /ru/resume/. */
export const pagePath = (name: string, lang: Lang): string => inLang(name ? `/${name}/` : '/', lang);
