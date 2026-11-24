// Navigator's address bar and search, without the DOM (unit-tested in browser.test.ts).
import { APP_ALIASES } from '../content/profile';
import { PROJECTS } from '../content/projects';

export const HOME = 'about:start';

/** What the address bar makes of a typed text: about: pages, a URL, a bare domain, or a search on this computer. */
export function normalize(input: unknown): string {
  const s = (typeof input === 'string' ? input : '').trim();
  if (!s) return HOME;
  if (/^about:/i.test(s)) return s.toLowerCase();
  if (/^(home|start|старт)$/i.test(s)) return HOME;
  if (/^[a-z]+:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return `https://${s}`;
  return `about:search?q=${encodeURIComponent(s)}`;
}

/** My own sites, which open inside the window. */
export const isOwnSite = (u: string): boolean => /^https:\/\/([a-z0-9-]+\.)*donya\.dev(\/|$)/i.test(u);

/** This very site: inside its own window it would load the whole room again, and the desktop in it, and so on. */
export const isThisSite = (u: string): boolean => /^https:\/\/(www\.)?donya\.dev(\/|[?#]|$)/i.test(u);

/** Search on this computer: app ids (through their aliases) and then projects ('project:<id>'). */
export function searchHits(q: string): string[] {
  const ql = q.toLowerCase();
  if (!ql) return [];
  const hits: string[] = [];
  for (const [k, id] of Object.entries(APP_ALIASES))
    if ((k.includes(ql) || ql.includes(k)) && !hits.includes(id)) hits.push(id);
  for (const p of PROJECTS)
    if (`${p.id} ${p.name.ru} ${p.name.en} ${p.stack.join(' ')}`.toLowerCase().includes(ql))
      hits.push(`project:${p.id}`);
  return hits;
}
