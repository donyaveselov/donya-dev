// The taskbar: Start button, Quick Launch, window buttons, and the notification area (status, language, volume,
// clock) with its pop-ups.
import { isMuted, onMutedChange, setMuted } from '../../shared/sound';
import { appTitle } from './apps';
import { showBalloon } from './balloon';
import { clockText, dateText, status } from './clock';
import { clamp, closest, css, esc, h, noop, qs } from './dom';
import { isTiny, localPt, localRect } from './geometry';
import { ICON, statusIcon } from './glyphs';
import { closeMenus, openMenu } from './menu';
import { setSoundLevel, sound, unlockSound } from './sound';
import { closeStart, toggleStart } from './start-menu';
import { appList, dom, domOrNull, type Refs, S, savePrefs } from './state';
import { L } from './strings';
import { sysApp } from './system-apps';
import { Tip } from './tooltip';
import { arrangeWindows, showDesktopToggle } from './window';
import { launch } from './desktop-icons';
import { changeLang } from './lang';

type TaskbarRefs = Pick<Refs, 'taskbar' | 'startBtn' | 'ql' | 'tasks' | 'tray' | 'clock' | 'lang' | 'vol' | 'statusIc'>;

const stop = (e: Event): void => {
  e.stopPropagation();
};

export function buildTaskbar(): TaskbarRefs {
  const tb = h('div', 'xp-taskbar');
  tb.innerHTML =
    `<button class="xp-startbtn" tabindex="-1"><span class="xp-startbtn__logo">${ICON.startFlag}</span><span class="xp-startbtn__t"></span></button>` +
    '<div class="xp-ql"></div><div class="xp-tasks"></div>' +
    '<div class="xp-tray"><button class="xp-trayic xp-tray-status" tabindex="-1"></button><button class="xp-lang" tabindex="-1"></button><button class="xp-trayic xp-tray-vol" tabindex="-1"></button><span class="xp-clock"></span></div>';
  const r: TaskbarRefs = {
    taskbar: tb,
    startBtn: qs(tb, '.xp-startbtn', HTMLButtonElement),
    ql: qs(tb, '.xp-ql', HTMLDivElement),
    tasks: qs(tb, '.xp-tasks', HTMLDivElement),
    tray: qs(tb, '.xp-tray', HTMLDivElement),
    clock: qs(tb, '.xp-clock', HTMLSpanElement),
    lang: qs(tb, '.xp-lang', HTMLButtonElement),
    vol: qs(tb, '.xp-tray-vol', HTMLButtonElement),
    statusIc: qs(tb, '.xp-tray-status', HTMLButtonElement),
  };
  r.startBtn.addEventListener('pointerdown', stop);
  r.startBtn.addEventListener('click', () => {
    toggleStart();
  });
  Tip.set(r.startBtn, () => L('startTip'));
  r.lang.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    closeMenus(0);
  });
  r.lang.addEventListener('click', () => {
    const rr = localRect(r.lang);
    openMenu(
      [
        {
          label: L('langRu'),
          check: S.lang === 'ru',
          icon: '',
          onClick: () => {
            changeLang('ru');
          },
        },
        {
          label: L('langEn'),
          check: S.lang === 'en',
          onClick: () => {
            changeLang('en');
          },
        },
      ],
      rr.x - 60,
      rr.y,
      { up: true },
    );
  });
  Tip.set(r.lang, () => L('langTip'));
  r.vol.addEventListener('pointerdown', stop);
  r.vol.addEventListener('click', volumePopup);
  r.vol.addEventListener('dblclick', () => {
    toggleMute();
  });
  Tip.set(r.vol, () => L('volumeTip', S.prefs.muted ? L('muted') : `${String(Math.round(S.prefs.volume * 100))}%`));
  Tip.set(r.clock, () => dateText() + L('clockTipPost'));
  r.clock.addEventListener('dblclick', () => {
    sysApp('about');
  });
  Tip.set(r.statusIc, () => `${L(`status_${status()}`)}\n${L('clockTipPre')}${clockText()}`);
  r.statusIc.addEventListener('click', () => {
    showBalloon({ title: L(`status_${status()}`), text: `${L('clockTipPre')}${clockText()} · ${dateText()}` });
  });
  tb.addEventListener('contextmenu', (e) => {
    if (closest(e, '.xp-task')) return;
    e.preventDefault();
    const p = localPt(e);
    openMenu(
      [
        { label: L('toolbars'), disabled: true },
        { sep: true },
        {
          label: L('cascade'),
          onClick: () => {
            arrangeWindows('cascade');
          },
        },
        {
          label: L('tileH'),
          onClick: () => {
            arrangeWindows('h');
          },
        },
        {
          label: L('tileV'),
          onClick: () => {
            arrangeWindows('v');
          },
        },
        { label: L('showDesktop'), onClick: showDesktopToggle },
        { sep: true },
        {
          label: L('taskMgr'),
          onClick: () => {
            sysApp('taskmgr');
          },
        },
        { sep: true },
        { label: L('lockTaskbar'), check: true, onClick: noop },
        {
          label: L('properties'),
          onClick: () => {
            sysApp('about');
          },
        },
      ],
      p.x,
      p.y,
      { up: true, bottomSheet: isTiny() },
    );
  });
  tb.addEventListener('pointerdown', (e) => {
    if (!closest(e, '.xp-startbtn')) closeStart();
  });
  return r;
}

/** Quick Launch: Show Desktop, then the first two pinned (or quickLaunch) apps. */
export function buildQuickLaunch(): void {
  const ql = domOrNull()?.ql;
  if (!ql) return;
  ql.innerHTML = '';
  const b = h('button', 'xp-qlbtn', ICON.showDesktop);
  b.tabIndex = -1;
  Tip.set(b, () => L('showDesktopQL'));
  b.addEventListener('click', () => {
    sound('click');
    showDesktopToggle();
  });
  ql.appendChild(b);
  for (const a of appList()
    .filter((x) => x.quickLaunch === true || x.startMenu === 'pinned')
    .slice(0, 2)) {
    const qb = h('button', 'xp-qlbtn', a.icon ?? ICON.window);
    qb.tabIndex = -1;
    Tip.set(qb, () => appTitle(a));
    qb.addEventListener('click', () => {
      launch(a.id, localRect(qb));
    });
    ql.appendChild(qb);
  }
}

export function updateTray(): void {
  const R = domOrNull();
  if (!R) return;
  const ct = clockText();
  if (R.clock.textContent !== ct) R.clock.textContent = ct;
  R.lang.textContent = S.lang === 'en' ? 'EN' : 'RU';
  const st = status();
  if (R.statusIc.dataset.st !== st) {
    R.statusIc.dataset.st = st;
    R.statusIc.innerHTML = statusIcon(st);
  }
  R.vol.innerHTML = S.prefs.muted ? ICON.mute : ICON.volume;
  const t = R.startBtn.querySelector('.xp-startbtn__t');
  if (t) t.textContent = L('start');
}

/** The tray's Mute: the page's one sound switch (src/shared/sound.ts), the same one as the room's speaker button. */
function toggleMute(v?: boolean): void {
  setMuted(v ?? !isMuted());
  if (!isMuted()) {
    unlockSound();
    sound('click');
  }
}

// the switch flipped (here, or by the room's button): the desktop's sounds, its tray icon and an open volume popup
onMutedChange((m) => {
  S.prefs.muted = m;
  savePrefs();
  setSoundLevel();
  updateTray();
  const box = volPop?.querySelector<HTMLInputElement>('.xp-vol__m');
  if (box) box.checked = m;
});

let volPop: HTMLDivElement | null = null;
export const volumeOpen = (): boolean => !!volPop;
export function closeVol(): void {
  volPop?.remove();
  volPop = null;
}

function volumePopup(): void {
  if (volPop) {
    closeVol();
    return;
  }
  const R = dom();
  const p = (volPop = h(
    'div',
    'xp-pop xp-vol',
    `<b>${esc(L('volume'))}</b><input type="range" min="0" max="100" step="5" class="xp-vol__r"><label class="xp-check"><input type="checkbox" class="xp-vol__m"><span>${esc(L('mute'))}</span></label>`,
  ));
  const r = qs(p, '.xp-vol__r', HTMLInputElement);
  const m = qs(p, '.xp-vol__m', HTMLInputElement);
  r.value = String(Math.round(S.prefs.volume * 100));
  m.checked = S.prefs.muted;
  r.addEventListener('input', () => {
    S.prefs.volume = Number(r.value) / 100;
    if (isMuted() && Number(r.value) > 0) setMuted(false); // turning it up unmutes, as in XP
    savePrefs();
    setSoundLevel();
    updateTray();
  });
  r.addEventListener('change', () => {
    unlockSound();
    sound('click');
  });
  m.addEventListener('change', () => {
    toggleMute(m.checked);
  });
  p.addEventListener('pointerdown', stop);
  R.root.appendChild(p);
  const vr = localRect(R.vol);
  const W = R.root.clientWidth;
  css(p, {
    left: clamp(vr.x + vr.w / 2 - p.offsetWidth / 2, 4, W - p.offsetWidth - 4),
    top: localRect(R.taskbar).y - p.offsetHeight - 2,
  });
  sound('click');
}
