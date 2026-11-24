// The room's side of its contract with the Windows XD desktop: the part of the shell's public API the room calls, the
// bitmaps it borrows for its own monitors, and the desktop DOM its sit-down hand-off measures.
import type { XPDesktopApi } from './types';

/** What the room uses of the desktop shell. */
export type RoomDesktop = Pick<XPDesktopApi, 'mount' | 'open' | 'close' | 'isOpen' | 'setLang'>;
export type RoomMountOptions = Parameters<RoomDesktop['mount']>[1];
export type RoomOpenOptions = NonNullable<Parameters<RoomDesktop['open']>[0]>;

/** The shell, when its script is on the page (without it the room falls back to its projects drawer). */
export function getDesktop(): RoomDesktop | null {
  return window.XPDesktop ?? null;
}

/** The Windows XD logo the room's screen saver floats, as the desktop's own saver does. */
export function desktopLogo(): string | undefined {
  return window.XP_ICO?.logo;
}

/** The default wallpaper, for a desktop whose wallpaper element has no picture yet. */
export function desktopWallpaper(): string | undefined {
  return window.XP_WALL;
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
