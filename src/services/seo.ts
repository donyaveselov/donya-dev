// What crawlers and link previews read: the page's head in each language (title, description, Open Graph, canonical,
// hreflang, JSON-LD) and the sitemap. The build (vite.config.ts) writes a page per language and route with these; the
// page itself (panels.ts) swaps the title and the description when the visitor switches the language in place.
// Pure functions of strings: no DOM, so the build runs them in Node.
import type { Lang } from '../types';
import { pagePath } from './lang-url';

export const SITE = 'https://donya.dev';

/** The tab title per language; index.html carries the English one. */
export const PAGE_TITLE: Record<Lang, string> = {
  en: 'Daniil Ivanov | Fullstack Developer | Vue Django NodeJS',
  ru: 'Даниил Иванов | Fullstack-разработчик | Vue Django NodeJS',
};

/** The meta description per language; index.html carries the English one. */
export const PAGE_DESCRIPTION: Record<Lang, string> = {
  en: 'Portfolio of Daniil Ivanov, a fullstack developer: Vue 3 / Nuxt, Python / Django, Node.js. An interactive 3D room with projects, a resume and contacts.',
  ru: 'Портфолио Даниила Иванова, fullstack-разработчика: Vue 3 / Nuxt, Python / Django, Node.js. Интерактивная 3D-комната с проектами, резюме и контактами.',
};

const OG_DESCRIPTION: Record<Lang, string> = {
  en: 'An interactive 3D room: projects, resume and contacts. Vue 3 / Nuxt, Python / Django, Node.js.',
  ru: 'Интерактивная 3D-комната: проекты, резюме и контакты. Vue 3 / Nuxt, Python / Django, Node.js.',
};

const OG_IMAGE_ALT: Record<Lang, string> = {
  en: "An isometric 3D developer's room: a desk with monitors, a bed and a window onto the sea",
  ru: 'Изометрическая 3D-комната разработчика: стол с мониторами, кровать и окно на море',
};

const OG_LOCALE: Record<Lang, string> = { en: 'en_US', ru: 'ru_RU' };

const other = (lang: Lang): Lang => (lang === 'en' ? 'ru' : 'en');

/** The routes in the sitemap, after the plain room: the ones with content of their own. The others (/night, /work,
 *  /dota, ...) preview the same room in another light or status, and stay out of it. */
export const INDEXED_ROUTES = ['resume', 'pc', 'projects'] as const;

/** A route's page in a language as an absolute URL: https://donya.dev/ru/resume/. */
export const pageUrl = (name: string, lang: Lang): string => SITE + pagePath(name, lang);

/** The file of a route's page in a language, in dist/: index.html, resume/index.html, ru/resume/index.html. */
export const pageFile = (name: string, lang: Lang): string => `${pagePath(name, lang).slice(1)}index.html`;

/** The schema.org Person in the page's head; a Russian page names him in Russian first. */
export function personLd(lang: Lang): Record<string, unknown> {
  const [name, alternateName] = lang === 'ru' ? ['Даниил Иванов', 'Daniil Ivanov'] : ['Daniil Ivanov', 'Даниил Иванов'];
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    alternateName,
    jobTitle: 'Fullstack Developer',
    url: `${SITE}/`,
    sameAs: [
      'https://github.com/donyaveselov',
      'https://t.me/work_veselov',
      'https://www.linkedin.com/in/daniil-ivanov-bb9539451',
    ],
    knowsAbout: ['Vue.js', 'Nuxt', 'TypeScript', 'Python', 'Django', 'Node.js', 'three.js'],
  };
}

const escapeAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replaces the one match of `re`; a page without it fails the build rather than ship a half-translated head. */
type Edit = [re: RegExp, to: string | ((...groups: string[]) => string), what: string];

function swap(html: string, [re, to, what]: Edit): string {
  const hits = html.match(new RegExp(re.source, 'g'))?.length ?? 0;
  if (hits !== 1) throw new Error(`the page has ${String(hits)} ${what}, expected one`);
  return html.replace(re, typeof to === 'string' ? () => to : to);
}

const meta = (attr: 'name' | 'property', key: string, value: string): Edit => [
  new RegExp(`<meta ${attr}="${key.replace(/[.:]/g, '\\$&')}" content="[^"]*">`),
  `<meta ${attr}="${key}" content="${escapeAttr(value)}">`,
  `${key} meta`,
];

/**
 * The built English page (index.html) as the page of a route in a language: the head in that language, its canonical
 * and hreflang alternates, the JSON-LD, and the resume sheet showing that language with the one <h1> in it.
 */
export function localizePage(html: string, lang: Lang, name: string): string {
  const url = pageUrl(name, lang);
  const links = [
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="en" href="${pageUrl(name, 'en')}">`,
    `<link rel="alternate" hreflang="ru" href="${pageUrl(name, 'ru')}">`,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(name, 'en')}">`,
    `<script type="application/ld+json">${JSON.stringify(personLd(lang)).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
  const edits: Edit[] = [
    [/<html lang="[a-z]+">/, `<html lang="${lang}">`, '<html lang>'],
    [/<title>[^<]*<\/title>/, `<title>${escapeText(PAGE_TITLE[lang])}</title>`, '<title>'],
    [/<link rel="canonical" href="[^"]*">/, links, 'canonical link'],
    meta('name', 'description', PAGE_DESCRIPTION[lang]),
    meta('property', 'og:locale', OG_LOCALE[lang]),
    meta('property', 'og:locale:alternate', OG_LOCALE[other(lang)]),
    meta('property', 'og:url', url),
    meta('property', 'og:title', PAGE_TITLE[lang]),
    meta('property', 'og:description', OG_DESCRIPTION[lang]),
    meta('property', 'og:image:alt', OG_IMAGE_ALT[lang]),
  ];
  // the resume sheet: the page's language shows and holds the <h1>, the other is hidden with its name in a <p>
  for (const l of ['ru', 'en'] satisfies Lang[]) {
    const id = l === 'ru' ? 'cv-name' : 'cv-name-en';
    edits.push(
      [new RegExp(`<div class="cv-lang" lang="${l}"( hidden)?>`), cvBlock(l, l !== lang), `${l} resume block`],
      [nameRe(id), nameTag(id, l === lang), `${l} resume name`],
    );
  }
  edits.push([
    /aria-labelledby="cv-name(-en)?"/,
    `aria-labelledby="${lang === 'ru' ? 'cv-name' : 'cv-name-en'}"`,
    'sheet label',
  ]);
  return edits.reduce(swap, html);
}

const cvBlock = (lang: Lang, hidden: boolean): string =>
  `<div class="cv-lang" lang="${lang}"${hidden ? ' hidden' : ''}>`;

const nameRe = (id: string): RegExp => new RegExp(`<(h1|p) class="cv-name" id="${id}">([^<]*)</(h1|p)>`);

/** The resume's name line, matched and rewritten with the tag for its block: h1 in the page's language, p otherwise. */
function nameTag(id: string, heading: boolean): (m: string, open: string, text: string) => string {
  const tag = heading ? 'h1' : 'p';
  return (_m, _open, text) => `<${tag} class="cv-name" id="${id}">${text}</${tag}>`;
}

/** sitemap.xml: the plain room and the indexed routes in both languages, each with its hreflang alternates. */
export function sitemap(lastmod: string, names: readonly string[] = INDEXED_ROUTES): string {
  const pages = ['', ...names];
  const alternates = (name: string): string =>
    (['en', 'ru', 'x-default'] as const)
      .map((h) => `    <xhtml:link rel="alternate" hreflang="${h}" href="${pageUrl(name, h === 'ru' ? 'ru' : 'en')}"/>`)
      .join('\n');
  const urls = pages.flatMap((name) =>
    (['en', 'ru'] satisfies Lang[]).map(
      (lang) =>
        `  <url>\n    <loc>${pageUrl(name, lang)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alternates(name)}\n  </url>`,
    ),
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${urls.join('\n')}\n</urlset>\n`
  );
}
