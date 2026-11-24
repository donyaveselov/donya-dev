// Keyboard and pointer input at the desktop's root: language switching, the Windows key and Ctrl+Esc (Start),
// Ctrl+Shift+Esc (Task Manager), Alt+F4, Escape, and keys for menus, the Start menu and the desktop.
import { deskKey } from './desktop-icons';
import { closest, now } from './dom';
import { changeLang } from './lang';
import { closeMenus, menuKey, menus } from './menu';
import { saverRunning } from './screensaver';
import { turnOffDialog } from './session';
import { closeStart, startKey, startOpen, toggleStart } from './start-menu';
import { dom, S } from './state';
import { sysApp } from './system-apps';
import { closeVol, volumeOpen } from './taskbar';
import { Tip } from './tooltip';

type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey' | 'repeat'>;

/**
 * Switches the input language the way the visitor's own computer does: Alt+Shift or Ctrl+Shift (Windows), Ctrl+Space
 * or Ctrl+Option+Space (macOS). Win+Space and Cmd+Space never reach a web page.
 */
export function langSwitchKey(e: KeyLike): 'combo' | 'space' | null {
  if (e.repeat) return null;
  if ((e.key === 'Shift' && (e.altKey || e.ctrlKey)) || ((e.key === 'Alt' || e.key === 'Control') && e.shiftKey))
    return 'combo';
  if (e.code === 'Space' && e.ctrlKey && !e.metaKey && !e.shiftKey) return 'space';
  return null;
}

export type ShellCommand = 'taskmgr' | 'start' | 'altF4' | null;
/** The shell's own shortcuts. */
export function shellCommand(e: KeyLike): ShellCommand {
  if (e.key === 'Escape' && (e.ctrlKey || e.metaKey)) return e.shiftKey ? 'taskmgr' : 'start';
  if (e.key === 'F4' && e.altKey) return 'altF4';
  return null;
}

export function onKey(e: KeyboardEvent): void {
  S.lastInput = now();
  S.metaAlone = e.key === 'Meta' && !e.repeat;
  const sw = langSwitchKey(e);
  if (sw) {
    if (sw === 'space') e.preventDefault();
    changeLang(S.lang === 'ru' ? 'en' : 'ru');
    return;
  }
  if (S.busy || saverRunning()) return;
  if (S.dlgKey?.(e)) {
    e.preventDefault();
    return;
  }
  if (menus.length && menuKey(e)) {
    e.preventDefault();
    return;
  }
  const cmd = shellCommand(e);
  if (cmd === 'taskmgr' || cmd === 'start') {
    e.preventDefault();
    if (cmd === 'taskmgr') sysApp('taskmgr');
    else toggleStart(true);
    return;
  }
  if (startOpen() && startKey(e)) {
    e.preventDefault();
    return;
  }
  if (cmd === 'altF4') {
    e.preventDefault();
    if (S.active) S.active.close();
    else turnOffDialog();
    return;
  }
  if (e.key === 'Escape') {
    const a = S.active;
    if (a?.hooks.onEsc) {
      e.preventDefault();
      a.hooks.onEsc();
      return;
    }
    if (a?.hooks.escClose) {
      e.preventDefault();
      a.close();
      return;
    }
    if (volumeOpen()) {
      closeVol();
      return;
    }
  }
  if (document.activeElement === dom().desk && deskKey(e)) e.preventDefault();
}

/** The Windows key pressed and released alone opens the Start menu. */
export function onKeyUp(e: KeyboardEvent): void {
  if (e.key === 'Meta' && S.metaAlone && !S.busy) {
    S.metaAlone = false;
    toggleStart(true);
  }
}

/** Any press on the desktop closes the pop-ups it is not inside. */
export function onRootDown(e: PointerEvent): void {
  S.lastInput = now();
  Tip.hide();
  if (!closest(e, '.xp-menu')) closeMenus(0);
  // a press inside the Start menu's own submenu must not close it: the click would never land
  if (startOpen() && !closest(e, '.xp-start') && !closest(e, '.xp-startbtn') && !closest(e, '.xp-menu')) closeStart();
  if (volumeOpen() && !closest(e, '.xp-vol')) closeVol();
}
