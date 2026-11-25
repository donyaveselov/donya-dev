// One of my own sites inside a window: the site windows and Navigator both show it this way. A no-cors probe resolves
// for any reachable site and rejects when it is down or offline: only then is the frame shown, so a site that is not
// deployed yet gets a Windows-style page instead of the browser's broken-page icon.
import { fill } from '../../../i18n/i18n';
import type { Bilingual } from '../../../types';
import type { Builders } from '../../../components/kit/kit';

const T = {
  opening: { ru: 'Открывается ', en: 'Opening ' },
  down: { ru: 'Сайт %s сейчас недоступен', en: '%s is not reachable right now' },
  downWhy: {
    ru: 'Возможно, его ещё не выложили или нет интернета. В папке «Мои проекты» есть описание и скриншоты.',
    en: 'It may not be deployed yet, or the internet is off. My Projects has the overview and screenshots.',
  },
  openOverview: { ru: 'Открыть описание', en: 'Open the overview' },
} as const satisfies Record<string, Bilingual>;

export interface SiteFrameOptions {
  /** The address the frame loads. */
  src: string;
  /** The address probed first (the frame's own by default). */
  probe?: string;
  /** Opens the project's overview from the "not reachable" page. */
  overview?: () => void;
}

/** A placeholder that becomes the site's frame, or a "not reachable" page; it stops caring once its scope is gone. */
export function siteFrame(K: Builders, o: SiteFrameOptions): HTMLElement {
  const { h } = K;
  const probe = o.probe ?? o.src;
  const host = probe.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const wait = h('div.xpa-site-msg', [T.opening, `${host}…`]);
  let alive = true;
  K.onCleanup(() => {
    alive = false;
  });
  fetch(probe, { mode: 'no-cors', cache: 'no-store' }).then(
    () => {
      if (!alive) return;
      wait.replaceWith(
        h('iframe.xpa-site-frame', { src: o.src, title: host, allow: 'fullscreen', referrerpolicy: 'no-referrer' }),
      );
    },
    () => {
      if (!alive) return;
      wait.replaceWith(
        h('div.xpa-site-msg', [
          h('b', fill(T.down, host)),
          h('p', T.downWhy),
          o.overview ? K.button(T.openOverview, o.overview, { primary: true }) : null,
        ]),
      );
    },
  );
  return wait;
}
