import { describe, expect, it } from 'vitest';
import { MOCKS } from '../modules/apps/projects/mocks';
import { ICONS } from '../components/kit/icons';
import { APP_ALIASES, APP_IDS, CONTACTS, OPENABLE } from './profile';
import { findProject, PROJECTS, siteApp, siteUrl } from './projects';
import { DESKTOP_README, PROJECTS_README } from './readme';

describe('content integrity', () => {
  it('has a picture for every shot of every project', () => {
    for (const p of PROJECTS) {
      expect(p.shots.length).toBeGreaterThan(0);
      for (const s of p.shots) expect(Object.keys(MOCKS), `${p.id}: ${s.kind}`).toContain(s.kind);
    }
  });

  it('has an icon for every project, and unique ids', () => {
    for (const p of PROJECTS) expect(ICONS[p.icon]).toBeTruthy();
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
  });

  it('writes every project in both languages', () => {
    for (const p of PROJECTS)
      for (const text of [p.name, p.tagline, p.type, p.period, p.role, p.summary, ...p.highlights])
        expect(text.ru && text.en, p.id).toBeTruthy();
  });

  it('aliases only known programs, and reaches each of them', () => {
    const ids: readonly string[] = APP_IDS;
    for (const [alias, id] of Object.entries(APP_ALIASES)) {
      expect(ids, alias).toContain(id);
      expect(alias).toBe(alias.toLowerCase());
    }
    // every program answers to its own id
    for (const id of APP_IDS) expect(APP_ALIASES[id]).toBe(id);
  });

  it('lets the terminal open exactly the programs the aliases reach', () => {
    expect([...OPENABLE].sort()).toEqual([...new Set(Object.values(APP_ALIASES))].sort());
    for (const id of OPENABLE) expect(Object.values(APP_ALIASES)).toContain(id);
    expect(new Set(OPENABLE).size).toBe(OPENABLE.length);
  });

  it('keeps project ids, site programs and app aliases apart', () => {
    const programs = PROJECTS.flatMap((p) => (p.site ? [p.site.app] : []));
    expect(new Set(programs).size).toBe(programs.length);
    for (const id of programs) expect((APP_IDS as readonly string[]).includes(id)).toBe(false);
    // `open <project>` wins over an alias, so a project id must not hide a program
    for (const p of PROJECTS) expect(APP_ALIASES[p.id]).toBeUndefined();
  });

  it('gives a project its site window and address', () => {
    const wax = findProject('wax');
    const verifikat = findProject('verifikat');
    if (!wax || !verifikat) throw new Error('projects are missing');
    expect(siteApp(wax)).toBe('wax');
    expect(siteUrl(wax, 'en')).toBe('https://wax.donya.dev/?lang=en');
    expect(siteApp(verifikat)).toBe('browser');
    expect(siteUrl(verifikat, 'ru')).toBe('https://verifikat.ru/');
    for (const p of PROJECTS) {
      expect(p.url).toMatch(/^https:\/\/[a-z0-9.-]+$/);
      if (p.repo) expect(p.repo).toMatch(/^https:\/\/github\.com\//);
    }
  });

  it('links every contact that is a page, under one GitHub profile', () => {
    for (const c of CONTACTS) if (c.href) expect(c.href).toBe(`https://${c.value}`);
    const github = CONTACTS.find((c) => c.id === 'github');
    for (const p of PROJECTS) if (p.repo) expect(p.repo.startsWith(`${github?.href ?? ''}/`)).toBe(true);
  });

  it('has both READMEs in both languages, with Windows line ends', () => {
    for (const text of [DESKTOP_README, PROJECTS_README])
      for (const s of [text.ru, text.en]) {
        expect(s.length).toBeGreaterThan(100);
        expect(s.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
      }
  });
});
