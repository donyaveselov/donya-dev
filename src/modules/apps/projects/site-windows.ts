// My live sites as desktop programs: the site in a window, like a game in its own exe. Which projects get one, and
// under which program id, is in content/projects.ts (Project.site).
import type { Bilingual, Lang, XPAppApi } from '../../../types';
import { type Project, PROJECTS, siteUrl } from '../../../content/projects';
import { ui } from '../../../components/kit/kit';
import { siteFrame } from './site-frame';
import { APP } from '../../../components/kit/strings';
import { track } from '../../../services/analytics.service';

const T = {
  newTab: { ru: 'Открыть в новой вкладке', en: 'Open in a new tab' },
} as const satisfies Record<string, Bilingual>;

export type SiteProject = Project & { site: NonNullable<Project['site']> };

/** The projects that have a program of their own. */
export const SITES: readonly SiteProject[] = PROJECTS.filter((p): p is SiteProject => p.site !== undefined);

export function siteWindow(p: SiteProject) {
  return (content: HTMLElement, api: XPAppApi): (() => void) => {
    const U = ui(api);
    const { h } = U;
    const root = U.root(content, 'xpa-site', 320);
    track('site_window_open', { site: p.id });
    // the site opens in the page's language, as it was when the window opened
    const lang: Lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
    const url = siteUrl(p, lang);
    const links = [h('a.xpa-br-out', { href: url, target: '_blank', rel: 'noopener noreferrer' }, T.newTab)];
    if (p.repo)
      links.push(h('a.xpa-br-out', { href: p.repo, target: '_blank', rel: 'noopener noreferrer' }, APP.github));
    root.append(
      h('div.xpa-site-bar', links),
      siteFrame(U, { src: url, probe: `${p.url}/`, overview: () => api.openApp('project', { id: p.id }) }),
    );
    return U.destroy;
  };
}
