// The site as the build writes it (vite build into .work/): every page in both languages, as crawlers read it.
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROUTES } from './modules/room/routes';
import { personLd } from './services/seo';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, '.work', 'built-pages-test');

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );

let pages: { path: string; html: string }[] = [];
const out = (path: string): string => readFileSync(join(OUT, path), 'utf8');

beforeAll(async () => {
  rmSync(OUT, { recursive: true, force: true });
  await build({ root: ROOT, logLevel: 'silent', build: { outDir: OUT, emptyOutDir: true } });
  pages = files(OUT)
    .filter((f) => f.endsWith('index.html'))
    .map((f) => ({
      path: `/${relative(OUT, f)
        .split(sep)
        .join('/')
        .replace(/index\.html$/, '')}`,
      html: readFileSync(f, 'utf8'),
    }));
}, 120_000);

afterAll(() => {
  rmSync(OUT, { recursive: true, force: true });
});

const count = (s: string, re: RegExp): number => s.match(new RegExp(re.source, 'g'))?.length ?? 0;

describe('the built pages', () => {
  it('are every route in both languages', () => {
    const names = ['', ...Object.keys(ROUTES)];
    const want = names.flatMap((n) => [n ? `/${n}/` : '/', n ? `/ru/${n}/` : '/ru/']);
    expect(pages.map((p) => p.path).sort()).toEqual(want.sort());
  });
  it('each have one <h1>, the language of their address, and their own canonical and alternates', () => {
    for (const { path, html } of pages) {
      const lang = path.startsWith('/ru/') ? 'ru' : 'en';
      const bare = lang === 'ru' ? path.slice(3) : path;
      expect(count(html, /<h1[\s>]/), path).toBe(1);
      expect(html, path).toContain(`<html lang="${lang}">`);
      expect(html, path).toMatch(new RegExp(`<div class="cv-lang" lang="${lang}">[\\s\\S]*?<h1 `));
      expect(html, path).toContain(`<link rel="canonical" href="https://donya.dev${path}">`);
      expect(html, path).toContain(`<meta property="og:url" content="https://donya.dev${path}">`);
      expect(html, path).toContain(`<link rel="alternate" hreflang="en" href="https://donya.dev${bare}">`);
      expect(html, path).toContain(`<link rel="alternate" hreflang="ru" href="https://donya.dev/ru${bare}">`);
      expect(html, path).toContain(`<link rel="alternate" hreflang="x-default" href="https://donya.dev${bare}">`);
      const ld = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1] ?? '';
      expect(JSON.parse(ld), path).toEqual(personLd(lang));
    }
  });
  it('carry no phone number, and every image has an alt', () => {
    for (const { path, html } of pages) {
      expect(html, path).not.toMatch(/tel:|902|057-43/);
      for (const img of html.match(/<img\b[^>]*>/g) ?? []) expect(img, path).toMatch(/\salt="[^"]*"/);
    }
  });
  it('come with the sitemap and robots.txt', () => {
    expect(out('sitemap.xml')).toContain('<loc>https://donya.dev/ru/resume/</loc>');
    expect(out('robots.txt')).toMatch(/^User-agent: \*\nAllow: \/\n[\s\S]*Sitemap: https:\/\/donya\.dev\/sitemap\.xml/);
  });
});
