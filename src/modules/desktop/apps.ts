// The app registry and app windows: an app registers once, opens into a window (singleton unless it says otherwise)
// and gets an XPAppApi for its window, language, sounds and dialogs.
import type { XPAppApi, XPAppDef, XPAppParams } from '../../types';
import { CAPTION_H } from './store/constants';
import { EASE_OUT, reduced } from './dom';
import { phuketTime, status } from './taskbar/clock';
import { dialog } from './windows/dialog';
import { showBalloon } from './taskbar/balloon';
import { work } from './windows/geometry';
import { ICON } from './glyphs';
import { requestedRect, type Rect } from './windows/layout';
import { sound, soundByName } from './sound';
import { S } from './store/state';
import { L, tr } from './strings';
import { ghost, growIn, startFlash, Win } from './windows/window';
import { track } from '../../services/analytics.service';

export const appTitle = (app: XPAppDef): string => tr(app.title) || app.id;

type SystemOpener = (id: string) => Win | null;
let openSystem: SystemOpener | null = null;
/** The built-in programs (system-apps.ts, a layer above) take the ids no app registered; desktop.ts connects them. */
export function setSystemOpener(fn: SystemOpener | null): void {
  openSystem = fn;
}

/** Apps register when their module is imported (src/modules/desktop/index.ts), before the desktop mounts. */
export function registerApp(def: XPAppDef): void {
  S.apps.set(def.id, def);
}

function makeApi(w: Win, params: XPAppParams | undefined): XPAppApi {
  return {
    win: {
      setTitle: (s) => {
        w.customTitle = s == null ? null : tr(s);
        w.renderTitle();
      },
      close: () => {
        w.close();
      },
      resize: (ww, hh) => {
        if (w.state !== 'normal') return;
        w.rect = requestedRect(w.rect, ww, hh, { w: w.minW, h: w.minH }, work());
        w.applyRect();
      },
    },
    params,
    openApp: (id, p) => openApp(id, p),
    lang: () => S.lang,
    t: (o) => tr(o),
    onLang: (cb) => {
      w.langCbs.push(cb);
      return () => {
        const i = w.langCbs.indexOf(cb);
        if (i >= 0) w.langCbs.splice(i, 1);
      };
    },
    sound: soundByName,
    balloon: (o) => {
      showBalloon(o);
      if (S.active !== w) startFlash(w);
    },
    dialog: (o) => dialog({ owner: w, ...o }),
    status,
    phuketTime,
    openResume: () => {
      S.opts?.onOpenResume?.();
    },
  };
}

function runRender(w: Win, app: XPAppDef, params: XPAppParams | undefined): void {
  const api = makeApi(w, params);
  try {
    const c = app.render(w.body, api);
    w.cleanup = typeof c === 'function' ? c : null;
  } catch (e) {
    console.error(e);
    w.body.innerHTML = '';
    const msg = e instanceof Error ? e.message : String(e);
    setTimeout(() => {
      dialog({
        owner: w,
        title: appTitle(app),
        icon: 'error',
        text: `${L('appCrashed', appTitle(app))}\n\n${msg}`,
        buttons: [
          {
            label: L('close'),
            primary: true,
            onClick: () => {
              setTimeout(() => {
                w.close(true);
              }, 0);
            },
          },
        ],
      });
    }, 50);
  }
}

function trackRecent(id: string): void {
  const a = S.apps.get(id);
  if (!a || a.startMenu === 'pinned') return;
  S.recent = [id, ...S.recent.filter((x) => x !== id)].slice(0, 4);
}

/** Opens (or focuses) an app; ids the registry does not know go to the built-in programs. Every launcher (icons, the
 *  Start menu, the Run box, the terminal, other apps, the room) comes through here, so this is where app_open is
 *  counted: a new window or a re-render with new params, not a mere focus. */
export function openApp(id: string, params?: XPAppParams, origin?: Rect | null): Win | null {
  const app = S.apps.get(id);
  if (!app) {
    const sys = openSystem?.(id) ?? null;
    if (sys) track('app_open', { app: id });
    return sys;
  }
  if (!S.open) return null;
  const ex = S.openApps.get(app.id);
  if (ex && !ex.closed && app.singleton !== false) {
    if (params !== undefined) {
      track('app_open', { app: app.id });
      // re-render with the new params
      try {
        ex.cleanup?.();
      } catch (e) {
        console.warn(`XP: cleanup of "${app.id}" failed before its re-render; rendering anew anyway`, e);
      }
      ex.body.innerHTML = '';
      ex.langCbs = [];
      runRender(ex, app, params);
    }
    ex.focus();
    if (ex.state === 'min') void ex.restore();
    return ex;
  }
  const w = new Win({
    app,
    title: app.title,
    icon: app.icon ?? ICON.window,
    w: app.defaultSize?.w ?? 560,
    h: app.defaultSize?.h ?? 400,
    minW: app.minSize?.w,
    minH: app.minSize?.h,
    resizable: app.resizable,
    maximizable: app.maximizable,
    maximized: app.maximized,
  });
  if (app.singleton !== false) S.openApps.set(app.id, w);
  trackRecent(app.id);
  track('app_open', { app: app.id });
  w.el.classList.add('xp--busy');
  runRender(w, app, params);
  setTimeout(() => {
    w.el.classList.remove('xp--busy');
  }, 350);
  // the opening animation: a caption ghost from the launcher, then fade and scale in
  const target: Rect =
    w.state === 'max'
      ? { x: 0, y: 0, w: work().w, h: CAPTION_H }
      : { x: w.rect.x, y: w.rect.y, w: w.rect.w, h: CAPTION_H };
  sound('open');
  w.focus();
  if (origin && !reduced()) {
    w.el.style.visibility = 'hidden';
    void ghost(origin, target, 180, { caption: w.titleText(), icon: w.icon, easing: EASE_OUT }).then(() => {
      w.el.style.visibility = '';
      growIn(w.el);
    });
  } else growIn(w.el);
  return w;
}
