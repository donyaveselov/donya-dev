import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '../modules/room/routes';
import { INDEXED_ROUTES, PAGE_TITLE, localizePage, pageUrl, personLd, sitemap } from './seo';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const count = (s: string, re: RegExp): number => s.match(new RegExp(re.source, 'g'))?.length ?? 0;

describe('the page in a language', () => {
  it('has its head, canonical and alternates in that language', () => {
    const ru = localizePage(html, 'ru', 'resume');
    expect(ru).toContain('<html lang="ru">');
    expect(ru).toContain(`<title>${PAGE_TITLE.ru}</title>`);
    expect(ru).toContain('<link rel="canonical" href="https://donya.dev/ru/resume/">');
    expect(ru).toContain('<meta property="og:url" content="https://donya.dev/ru/resume/">');
    expect(ru).toContain('<meta property="og:locale" content="ru_RU">');
    expect(ru).toContain('<meta property="og:locale:alternate" content="en_US">');
    expect(ru).toContain('<link rel="alternate" hreflang="en" href="https://donya.dev/resume/">');
    expect(ru).toContain('<link rel="alternate" hreflang="x-default" href="https://donya.dev/resume/">');
    const en = localizePage(html, 'en', '');
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('<link rel="canonical" href="https://donya.dev/">');
    expect(en).toContain('<link rel="alternate" hreflang="ru" href="https://donya.dev/ru/">');
  });
  it('has one <h1>, in the shown block of its language', () => {
    for (const lang of ['ru', 'en'] as const) {
      const page = localizePage(html, lang, '');
      expect(count(page, /<h1[\s>]/)).toBe(1);
      const shown = new RegExp(`<div class="cv-lang" lang="${lang}">[\\s\\S]*?<h1 class="cv-name"`);
      expect(page).toMatch(shown);
      expect(page).toMatch(new RegExp(`<div class="cv-lang" lang="${lang === 'ru' ? 'en' : 'ru'}" hidden>`));
    }
  });
  it('fails on a page without the piece it rewrites', () => {
    expect(() => localizePage(html.replace(/<title>.*<\/title>/, ''), 'ru', '')).toThrow(/<title>/);
  });
  it('names the person first in its language', () => {
    expect(personLd('en')).toMatchObject({ name: 'Daniil Ivanov', alternateName: 'Даниил Иванов' });
    expect(personLd('ru')).toMatchObject({ name: 'Даниил Иванов', alternateName: 'Daniil Ivanov' });
    expect(JSON.stringify(personLd('en'))).not.toMatch(/hh\.ru/);
  });
});

describe('the sitemap', () => {
  const xml = sitemap('2026-11-26');
  it('lists the plain room and the indexed routes in both languages', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const names = ['', ...INDEXED_ROUTES];
    expect(locs).toEqual(names.flatMap((n) => [pageUrl(n, 'en'), pageUrl(n, 'ru')]));
    expect(locs).toContain('https://donya.dev/ru/resume/');
    for (const n of INDEXED_ROUTES) expect(Object.keys(ROUTES)).toContain(n);
  });
  it('gives each its alternates and the build date', () => {
    expect(count(xml, /<lastmod>2026-11-26<\/lastmod>/)).toBe(2 * (1 + INDEXED_ROUTES.length));
    expect(count(xml, /hreflang="x-default"/)).toBe(2 * (1 + INDEXED_ROUTES.length));
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ru" href="https://donya.dev/ru/pc/"/>');
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset /);
  });
  it('leaves out the previews and the debug mode', () => {
    for (const n of ['night', 'work', 'dota', 'debug']) expect(xml).not.toContain(`/${n}/`);
  });
});
