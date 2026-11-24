// The built-in programs: Run, About, Task Manager and Display Properties (wallpaper, CRT effect, screen saver).
import type { Bilingual, XPAppParams } from '../../shared/types';
import { openApp } from './apps';
import { bsod, turnOffDialog } from './session';
import { clamp, esc, h, qs, storeGet, storeSet } from './dom';
import { dialog } from './dialog';
import { isPhone } from './geometry';
import { ICON, wordmark } from './glyphs';
import { startSaver } from './screensaver';
import { sound } from './sound';
import { appList, domOrNull, type Prefs, type SaverKind, S, savePrefs } from './state';
import { L, PC_NAME, T, VERSION } from './strings';
import { paintWall, WALLS, wallLabel, wallSVG } from './wallpaper';
import { growIn, Win } from './window';
import { findApp } from './find-app';

interface SysDef {
  title: Bilingual;
  icon: string;
  w: number;
  h: number;
  resizable?: boolean;
  /** Opens cascaded like an app window instead of centred. */
  cascade?: boolean;
  minW?: number;
  minH?: number;
  render(body: HTMLElement, w: Win, params: XPAppParams | undefined): (() => void) | undefined;
}

/** Run box commands that are not app names. */
const RUN_SPECIAL: Readonly<Record<string, string>> = {
  bsod: 'bsod',
  crash: 'bsod',
  winver: 'about',
  ver: 'about',
  about: 'about',
  taskmgr: 'taskmgr',
  control: 'display',
  'desk.cpl': 'display',
  display: 'display',
};

const run: SysDef = {
  title: T.runTitle,
  icon: ICON.run,
  w: 360,
  h: 176,
  render(body, w) {
    const box = h('div', 'xp-sys xp-run');
    box.innerHTML =
      `<div class="xp-sys__row xp-run__top"><span class="xp-run__ic">${ICON.run}</span><span>${esc(L('runText'))}</span></div>` +
      `<div class="xp-sys__row"><label>${esc(L('runOpen'))}</label><input class="xp-field xp-run__in" list="xp-run-list" autocomplete="off" spellcheck="false"></div>` +
      `<div class="xp-sys__btns"><button class="xp-btn xp-btn--default xp-run__ok">${esc(L('ok'))}</button><button class="xp-btn xp-run__cancel">${esc(L('cancel'))}</button><button class="xp-btn" disabled>${esc(L('browse'))}</button></div>`;
    const inp = qs(box, '.xp-run__in', HTMLInputElement);
    const last = storeGet('lastRun');
    inp.value = typeof last === 'string' ? last : '';
    const go = (): void => {
      const v = inp.value.trim();
      if (!v) return;
      storeSet('lastRun', v);
      const lq = v.toLowerCase().replace(/\.exe$/, '');
      const special = RUN_SPECIAL[lq];
      if (special) {
        w.close(true);
        sysApp(special);
        return;
      }
      if (lq === 'shutdown' || lq === 'shutdown -s') {
        w.close(true);
        turnOffDialog();
        return;
      }
      if (/^https?:\/\//.test(v)) {
        w.close(true);
        window.open(v, '_blank', 'noopener');
        return;
      }
      const id = findApp(lq, appList());
      if (id) {
        w.close(true);
        openApp(id);
        return;
      }
      dialog({ owner: w, title: v, icon: 'error', text: L('runNotFound', v) });
    };
    qs(box, '.xp-run__ok').addEventListener('click', go);
    qs(box, '.xp-run__cancel').addEventListener('click', () => {
      w.close();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    });
    body.appendChild(box);
    setTimeout(() => {
      inp.focus();
      inp.select();
    }, 30);
    return undefined;
  },
};

const about: SysDef = {
  title: T.about,
  icon: ICON.logo,
  w: 420,
  h: 330,
  render(body, w) {
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const mem = dm ? `${String(dm * 1024 * 1024)} KB` : '524 288 KB';
    const box = h('div', 'xp-about');
    box.innerHTML =
      `<div class="xp-about__band"><div class="xp-boot__mark">${ICON.logo}</div>${wordmark(true)}</div>` +
      `<div class="xp-about__txt"><b>${esc(VERSION)}</b><br>${esc(L('aboutText'))}<hr>${esc(L('aboutLicensed'))}<br>&nbsp;&nbsp;${esc(L('aboutVisitor'))}<br>&nbsp;&nbsp;${PC_NAME}<hr>${esc(L('aboutMem', mem))}<br>${esc(L('appsCount', S.apps.size))}</div>` +
      `<div class="xp-sys__btns xp-about__btns"><button class="xp-btn xp-btn--default">${esc(L('ok'))}</button></div>`;
    qs(box, '.xp-btn').addEventListener('click', () => {
      w.close();
    });
    body.appendChild(box);
    return undefined;
  },
};

interface TaskRow {
  w: Win | null;
  t: string;
  ic: string;
}

const taskmgr: SysDef = {
  title: T.taskMgr,
  icon: ICON.taskmgr,
  w: 400,
  h: 420,
  resizable: true,
  cascade: true,
  minW: 300,
  minH: 320,
  render(body, w) {
    let tab = w.tab ?? 'apps';
    let sel: number | null = null;
    const box = h('div', 'xp-sys xp-tm');
    box.innerHTML =
      `<div class="xp-tabs"><button class="xp-tab" data-t="apps">${esc(L('tmApps'))}</button><button class="xp-tab" data-t="perf">${esc(L('tmPerf'))}</button></div>` +
      '<div class="xp-tabpane"></div><div class="xp-statusbar"><span class="xp-tm__p"></span><span class="xp-tm__c"></span><span class="xp-tm__m"></span></div>';
    const pane = qs(box, '.xp-tabpane');
    body.appendChild(box);
    const cpu: number[] = [];
    let coffee = 72;
    const list = (): TaskRow[] => [
      ...S.wins.filter((x) => x.kind !== 'dialog' && x !== w).map((x) => ({ w: x, t: x.titleText(), ic: x.icon })),
      { w: null, t: L('tmShell'), ic: ICON.computer },
    ];
    const paintApps = (): void => {
      pane.innerHTML = `<div class="xp-list xp-tm__list" tabindex="0"><div class="xp-tm__hd"><span>${esc(L('tmTask'))}</span><span>${esc(L('tmStatus'))}</span></div></div><div class="xp-sys__btns"><button class="xp-btn" data-a="end">${esc(L('tmEnd'))}</button><button class="xp-btn" data-a="sw">${esc(L('tmSwitch'))}</button><button class="xp-btn" data-a="new">${esc(L('tmNew'))}</button></div>`;
      const l = qs(pane, '.xp-tm__list');
      list().forEach((it, i) => {
        const r = h(
          'div',
          `xp-list__i${sel === i ? ' xp--on' : ''}`,
          `${it.ic}<span class="xp-tm__n"></span><span class="xp-tm__s">${esc(L('tmRunning'))}</span>`,
        );
        qs(r, '.xp-tm__n').textContent = it.t;
        r.addEventListener('pointerdown', () => {
          sel = i;
          l.querySelectorAll('.xp-list__i').forEach((x, j) => x.classList.toggle('xp--on', j === i));
        });
        r.addEventListener('dblclick', () => {
          it.w?.focus();
        });
        l.appendChild(r);
      });
      qs(pane, '[data-a="end"]').addEventListener('click', () => {
        const it = sel == null ? undefined : list()[sel];
        if (!it) return;
        if (!it.w) {
          dialog({
            owner: w,
            title: L('taskMgr'),
            icon: 'warn',
            text: L('endTaskQ', it.t),
            buttons: [
              { label: L('yes'), onClick: () => setTimeout(bsod, 300) },
              { label: L('no'), primary: true, cancel: true },
            ],
          });
          return;
        }
        it.w.close();
        sel = null;
        setTimeout(paintApps, 150);
      });
      qs(pane, '[data-a="sw"]').addEventListener('click', () => {
        if (sel != null) list()[sel]?.w?.focus();
      });
      qs(pane, '[data-a="new"]').addEventListener('click', () => {
        sysApp('run');
      });
    };
    const paintPerf = (): void => {
      pane.innerHTML = `<div class="xp-group"><span class="xp-group__t">${esc(L('tmCpuGraph'))}</span><canvas class="xp-graph" width="300" height="90"></canvas></div><div class="xp-group"><span class="xp-group__t">${esc(L('tmCoffee'))}</span><div class="xp-progress"><i></i></div></div>`;
    };
    const tick = (): void => {
      const load = Math.round(
        clamp((cpu[cpu.length - 1] ?? 8) + (Math.random() - 0.5) * 18 + (S.wins.length * 1.5 - 4) * 0.2, 2, 96),
      );
      cpu.push(load);
      if (cpu.length > 60) cpu.shift();
      coffee = Math.max(4, coffee - 0.15);
      qs(box, '.xp-tm__p').textContent = L('tmProc', 18 + S.wins.length * 2);
      qs(box, '.xp-tm__c').textContent = L('tmCpu', load);
      qs(box, '.xp-tm__m').textContent = L('tmMem', `${String(180 + S.wins.length * 23)}M / 1024M`);
      const c = pane.querySelector('canvas')?.getContext('2d');
      if (c) {
        const W = c.canvas.width;
        const H = c.canvas.height;
        c.fillStyle = '#000';
        c.fillRect(0, 0, W, H);
        c.strokeStyle = '#0a5e1e';
        c.lineWidth = 1;
        // the grid scrolls left with the graph, half a cell per sample
        for (let x = (W - (cpu.length % 2) * 6) % 12; x < W; x += 12) {
          c.beginPath();
          c.moveTo(x + 0.5, 0);
          c.lineTo(x + 0.5, H);
          c.stroke();
        }
        for (let y = 0; y < H; y += 12) {
          c.beginPath();
          c.moveTo(0, y + 0.5);
          c.lineTo(W, y + 0.5);
          c.stroke();
        }
        c.strokeStyle = '#3cff3c';
        c.lineWidth = 1.5;
        c.beginPath();
        cpu.forEach((v, i) => {
          const px = W - (cpu.length - 1 - i) * 5;
          const py = H - (v / 100) * H;
          if (i) c.lineTo(px, py);
          else c.moveTo(px, py);
        });
        c.stroke();
      }
      const bar = pane.querySelector<HTMLElement>('.xp-progress i');
      if (bar) bar.style.width = `${String(coffee)}%`;
      if (
        tab === 'apps' &&
        pane.querySelector('.xp-tm__list') &&
        pane.querySelectorAll('.xp-list__i').length !== list().length
      )
        paintApps();
    };
    const setTab = (t: string): void => {
      tab = w.tab = t;
      box.querySelectorAll<HTMLElement>('.xp-tab').forEach((b) => b.classList.toggle('xp--on', b.dataset.t === t));
      if (t === 'apps') paintApps();
      else paintPerf();
      tick();
    };
    box.querySelectorAll<HTMLElement>('.xp-tab').forEach((b) => {
      b.addEventListener('click', () => {
        sound('click');
        setTab(b.dataset.t ?? 'apps');
      });
    });
    setTab(tab);
    const timer = window.setInterval(tick, 1000);
    return () => {
      clearInterval(timer);
    };
  },
};

type Draft = Pick<Prefs, 'wall' | 'tint' | 'crt' | 'saver' | 'saverMin'>;

const display: SysDef = {
  title: T.display,
  icon: ICON.display,
  w: 400,
  h: 450,
  render(body, w) {
    const draft: Draft = {
      wall: S.prefs.wall,
      tint: S.prefs.tint,
      crt: S.prefs.crt,
      saver: S.prefs.saver,
      saverMin: S.prefs.saverMin,
    };
    let tab = w.tab ?? 'desk';
    const box = h('div', 'xp-sys xp-disp');
    box.innerHTML =
      `<div class="xp-tabs"><button class="xp-tab" data-t="desk">${esc(L('desktopTab'))}</button><button class="xp-tab" data-t="saver">${esc(L('saverTab'))}</button></div><div class="xp-tabpane"></div>` +
      `<div class="xp-sys__btns"><button class="xp-btn xp-btn--default" data-a="ok">${esc(L('ok'))}</button><button class="xp-btn" data-a="cancel">${esc(L('cancel'))}</button><button class="xp-btn" data-a="apply" disabled>${esc(L('apply'))}</button></div>`;
    const pane = qs(box, '.xp-tabpane');
    const applyB = qs(box, '[data-a="apply"]', HTMLButtonElement);
    body.appendChild(box);
    const dirty = (): void => {
      applyB.disabled = false;
    };
    const monitor = (inner: string): string =>
      `<div class="xp-mon"><div class="xp-mon__case"></div><div class="xp-mon__screen">${inner}</div><div class="xp-mon__stand"></div></div>`;
    const paint = (): void => {
      box.querySelectorAll<HTMLElement>('.xp-tab').forEach((b) => b.classList.toggle('xp--on', b.dataset.t === tab));
      if (tab === 'desk') {
        pane.innerHTML =
          monitor(wallSVG(draft.wall)) +
          `<div>${esc(L('background'))}</div><div class="xp-list xp-disp__list" tabindex="0"></div>` +
          `<label class="xp-check"><input type="checkbox" data-k="crt"><span>${esc(L('crt'))}</span></label>`;
        const l = qs(pane, '.xp-disp__list');
        for (const k of ['none', ...WALLS.map((x) => x[0])]) {
          const r = h(
            'div',
            `xp-list__i${draft.wall === k ? ' xp--on' : ''}`,
            `${k === 'none' ? ICON.window : ICON.display}<span>${esc(wallLabel(k))}</span>`,
          );
          r.addEventListener('pointerdown', () => {
            draft.wall = k;
            dirty();
            paint();
          });
          l.appendChild(r);
        }
        const crt = qs(pane, '[data-k="crt"]', HTMLInputElement);
        crt.checked = draft.crt;
        crt.addEventListener('change', () => {
          draft.crt = crt.checked;
          dirty();
        });
      } else {
        pane.innerHTML =
          monitor('<div class="xp-mon__saver"></div>') +
          `<div class="xp-group"><span class="xp-group__t">${esc(L('saver'))}</span><div class="xp-sys__row"><select class="xp-field xp-disp__sel"></select><button class="xp-btn" data-a="prev">${esc(L('preview'))}</button></div>` +
          `<div class="xp-sys__row"><span>${esc(L('wait'))}</span><input class="xp-field xp-disp__min" type="number" min="1" max="60"><span>${esc(L('minutes'))}</span></div></div>`;
        const sel = qs(pane, 'select', HTMLSelectElement);
        for (const k of ['none', 'logo', 'stars'] as const) {
          const o = document.createElement('option');
          o.value = k;
          o.textContent = L(`saver_${k}`);
          sel.appendChild(o);
        }
        sel.value = draft.saver;
        sel.addEventListener('change', () => {
          draft.saver = sel.value as SaverKind;
          dirty();
          paint();
        });
        const mi = qs(pane, '.xp-disp__min', HTMLInputElement);
        mi.value = String(draft.saverMin);
        mi.addEventListener('change', () => {
          draft.saverMin = clamp(parseInt(mi.value, 10) || 3, 1, 60);
          dirty();
        });
        qs(pane, '[data-a="prev"]').addEventListener('click', () => {
          startSaver(draft.saver === 'none' ? 'logo' : draft.saver);
        });
        const ms = qs(pane, '.xp-mon__saver');
        if (draft.saver === 'logo') ms.innerHTML = `<div class="xp-mon__mini">${ICON.logo}</div>`;
        else if (draft.saver === 'stars') ms.innerHTML = '<div class="xp-mon__stars"><i></i><i></i><i></i></div>';
      }
    };
    const apply = (): void => {
      Object.assign(S.prefs, draft);
      savePrefs();
      paintWall(true);
      applyCrt();
      applyB.disabled = true;
    };
    box.querySelectorAll<HTMLElement>('.xp-tab').forEach((b) => {
      b.addEventListener('click', () => {
        sound('click');
        tab = w.tab = b.dataset.t ?? 'desk';
        paint();
      });
    });
    qs(box, '[data-a="ok"]').addEventListener('click', () => {
      apply();
      w.close();
    });
    qs(box, '[data-a="cancel"]').addEventListener('click', () => {
      w.close();
    });
    applyB.addEventListener('click', apply);
    paint();
    return undefined;
  },
};

const SYS: Readonly<Record<string, SysDef>> = { run, about, taskmgr, display };

export function applyCrt(): void {
  const crt = domOrNull()?.crt;
  if (crt) crt.hidden = !S.prefs.crt;
}

/** Opens a built-in program ('run', 'about', 'taskmgr', 'display'; 'bsod' crashes on purpose). */
export function sysApp(rawId: string, params?: XPAppParams): Win | null {
  const id = rawId.replace(/^sys[:-]/, '');
  if (id === 'bsod') {
    bsod();
    return null;
  }
  const def = SYS[id];
  if (!def || !S.open) return null;
  const key = `sys:${id}`;
  const ex = S.openApps.get(key);
  if (ex && !ex.closed) {
    ex.focus();
    return ex;
  }
  const w = new Win({
    kind: 'app',
    title: def.title,
    icon: def.icon,
    w: def.w,
    h: def.h,
    resizable: def.resizable ?? false,
    maximizable: !!def.resizable,
    minW: def.minW,
    minH: def.minH,
    center: !def.cascade,
  });
  S.openApps.set(key, w);
  w.hooks.escClose = true;
  // the program repaints itself in the new language
  const paint = (): void => {
    w.body.innerHTML = '';
    w.cleanup?.();
    w.cleanup = def.render(w.body, w, params) ?? null;
    w.renderTitle();
  };
  w.langCbs.push(paint);
  paint();
  sound('open');
  w.focus();
  growIn(w.el);
  if (isPhone()) w.state = 'normal';
  return w;
}
