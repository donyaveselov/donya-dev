// Types shared by the room and the desktop. The legacy modules still talk through these window globals (see
// xp/CONTRACT.md in the old site); a port removes its global once nothing reads it any more.

export type Lang = 'ru' | 'en';
export type Status = 'work' | 'play' | 'sleep' | 'outside';
export type GameKind = 'dota' | 'cs' | 'other';

/** A user-visible string in both languages. */
export interface Bilingual<T = string> {
  ru: T;
  en: T;
}

export interface PhuketTime {
  h: number;
  m: number;
}

export interface XPMountOptions {
  lang: Lang;
  phuketTime: () => PhuketTime;
  status: () => Status;
  onExit: (how?: string) => void;
  onOpenResume?: () => void;
  onLangChange?: (lang: Lang) => void;
  saverPos?: () => unknown;
  saverBase?: number;
  wallBase?: string;
}

export interface XPOpenOptions {
  game?: unknown;
  instant?: boolean;
  noBoot?: boolean;
}

export interface XPDesktopApi {
  readonly __shell: true;
  readonly version: string;
  mount(root: HTMLElement, opts: XPMountOptions): void;
  open(opts?: XPOpenOptions): void;
  close(opts?: { instant?: boolean }): void;
  isOpen(): boolean;
  setLang(lang: Lang): void;
  lang(): Lang;
  registerApp(def: unknown): void;
  openApp(id: string, params?: unknown): unknown;
  dialog(opts: unknown): unknown;
  balloon(opts: unknown): void;
  sound(name: string): void;
  bsod(): void;
  screensaver(kind?: string): void;
  stopScreensaver(): void;
  unmount(): void;
}

declare global {
  interface Window {
    XPDesktop?: XPDesktopApi;
    /** Helpers and content shared by the desktop apps (xp/apps/common.js and friends). */
    XPApps?: Record<string, unknown>;
    /** Windows XP icon bitmaps as data: URLs, by name. */
    XP_ICO?: Record<string, string>;
    /** The default (Bliss) wallpaper as a data: URL. */
    XP_WALL?: string;
    /** Debug handle the room exposes for screenshots and the regression harness. */
    __psx?: Record<string, unknown>;
  }
}
