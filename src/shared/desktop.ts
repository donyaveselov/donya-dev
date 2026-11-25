// The room's side of its contract with the Windows XD desktop: the loaded desktop module, the part of the shell's
// public API the room calls, the bitmaps it borrows for its own monitors, and the desktop DOM its sit-down hand-off
// measures.
import type { XPDesktopApi } from './types';

/** What the room uses of the desktop shell. */
export type RoomDesktop = Pick<XPDesktopApi, 'mount' | 'open' | 'close' | 'isOpen' | 'setLang' | 'openApp'>;
export type RoomMountOptions = Parameters<RoomDesktop['mount']>[1];
export type RoomOpenOptions = NonNullable<Parameters<RoomDesktop['open']>[0]>;

/** What the desktop module (src/xp) exports for the room. */
export interface DesktopModule {
  api: RoomDesktop;
  /** Windows XP icon bitmaps as data: URLs; the room borrows the logo. */
  XP_ICO: { readonly logo: string };
  /** The default (Bliss) wallpaper as a data: URL. */
  XP_WALL: string;
}

let loaded: DesktopModule | null = null;

/** Registers the desktop module once it is loaded (src/room/desktop-loader.ts). */
export function setDesktop(mod: DesktopModule): void {
  loaded = mod;
}

/** The shell, or null while its module is not loaded. */
export function getDesktop(): RoomDesktop | null {
  return loaded?.api ?? null;
}

/** The Windows XD logo the room's screen saver floats, as the desktop's own saver does. */
export function desktopLogo(): string | undefined {
  return loaded?.XP_ICO.logo;
}

/** The default wallpaper, for a desktop whose wallpaper element has no picture yet. */
export function desktopWallpaper(): string | undefined {
  return loaded?.XP_WALL;
}

/** The element the desktop is mounted in (the room's CSS and the regression harness find the desktop under it). */
export const DESKTOP_ROOT_ID = 'xp-root';

/** Adds the desktop's (empty, unstyled) mount element to the page. */
export function createDesktopRoot(): HTMLElement {
  const el = document.createElement('div');
  el.id = DESKTOP_ROOT_ID;
  document.body.appendChild(el);
  return el;
}

/**
 * The desktop DOM the room paints onto the 3D monitor during the hand-off (handoff.ts reads layout, text, fonts and
 * pictures from these). Renaming one in the shell breaks the fly-in without any error.
 */
export const DESKTOP_DOM = {
  root: '.xp',
  wallpaper: '.xp-wall image',
  taskbar: '.xp-taskbar',
  startButton: '.xp-startbtn',
  startLabel: '.xp-startbtn__t',
  task: '.xp-task',
  tray: '.xp-tray',
  clock: '.xp-clock',
  lang: '.xp-lang',
  icon: '.xp-icon',
  iconImage: '.xp-icon__img',
  iconLabel: '.xp-icon__label',
} as const;
