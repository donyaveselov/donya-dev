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
  /** The visitor left the desktop ('off' after Turn Off Computer). */
  onExit: (how?: string) => void;
  onOpenResume?: () => void;
  onLangChange?: (lang: Lang) => void;
  /** Where the host's own copy of the floating-logo saver is: 0..1 of its free travel. */
  saverPos?: () => XPSaverPos | null | undefined;
  /** The width the host draws its saver at; with saverPos the desktop's saver matches it in place and size. */
  saverBase?: number;
  /** The tray's volume slider moved (0..1): the host's own audio (the room's music) follows it. Mute is not here: it is
   *  the page's one switch, src/shared/sound.ts, shared by the room and the desktop. */
  onVolumeChange?: (volume: number) => void;
  /** Where the wallpaper JPEGs are (default 'wall/'). */
  wallBase?: string;
}

export interface XPSaverPos {
  u: number;
  v: number;
}

/** A full-screen picture the desktop opens with: the host monitor's game, code or screen saver. */
export interface XPGame {
  name?: string;
  /** 'dota' | 'cs' | 'other' show a fps counter; 'term' is the code editor; 'saver' the screen saver. */
  kind?: string;
  image?: string | HTMLCanvasElement | HTMLImageElement | null;
  /** The image is a canvas the host keeps drawing: mirror it every frame. */
  live?: boolean;
  /** Shown instead once the hand-off is over: the host's copy in the window's own shape. */
  after?: HTMLCanvasElement | null;
  /** Aspect ratio of the host's glass the image is stretched over. */
  frame?: number;
  /** How long the picture stays up before it minimizes, in ms. */
  hold?: number;
  /** 'close' makes the picture go away (a screen saver); anything else minimizes it to the taskbar. */
  dismiss?: string;
}

export interface XPOpenOptions {
  game?: XPGame | null;
  instant?: boolean;
  noBoot?: boolean;
}

export type XPIconKind = 'info' | 'warn' | 'error' | 'question' | 'none';

export interface XPDialogButton {
  label: string | Bilingual;
  primary?: boolean;
  /** The button Escape presses. */
  cancel?: boolean;
  /** Return false to keep the dialog open. */
  onClick?: () => unknown;
}

export interface XPDialogOptions {
  title?: string | Bilingual;
  text?: string | Bilingual;
  /** Trusted markup instead of text. */
  html?: string;
  icon?: XPIconKind;
  buttons?: XPDialogButton[];
  sound?: string;
}

export interface XPDialogHandle {
  close(): void;
  el: HTMLElement;
}

export interface XPBalloonOptions {
  title?: string | Bilingual;
  text?: string | Bilingual;
  icon?: XPIconKind;
  timeout?: number;
  onClick?: () => void;
}

/** What an app's window offers the app. */
export interface XPAppWindow {
  el: HTMLElement;
  body: HTMLElement;
  setTitle(title: string | Bilingual | null): void;
  close(): void;
  minimize(): void;
  maximize(): void;
  restore(): void;
  focus(): void;
  flash(): void;
  isActive(): boolean;
  state(): 'normal' | 'max' | 'min';
  resize(w: number, h: number): void;
}

/** Open parameters an app may receive (each app reads its own). */
export type XPAppParams = Readonly<Record<string, unknown>>;

/** What the shell hands an app's render function. */
export interface XPAppApi {
  win: XPAppWindow;
  params: XPAppParams | undefined;
  openApp(id: string, params?: XPAppParams): unknown;
  lang(): Lang;
  t(text: string | Bilingual | null | undefined): string;
  /** Called after the language changes; returns its remover. */
  onLang(cb: (lang: Lang) => void): () => void;
  sound(name: string): void;
  balloon(opts?: XPBalloonOptions): void;
  dialog(opts?: XPDialogOptions): XPDialogHandle;
  status(): Status;
  phuketTime(): PhuketTime;
  openResume(): void;
}

/** A desktop app as it registers with the shell. */
export interface XPAppDef {
  id: string;
  title: Bilingual;
  /** Icon markup (an <svg>). */
  icon?: string;
  subtitle?: Bilingual;
  desktop?: boolean;
  /** 'pinned' (left column of Start), 'programs' (All Programs); true only counts it as a Start menu app. */
  startMenu?: 'pinned' | 'programs' | boolean;
  quickLaunch?: boolean;
  /** false: every open makes a new window. */
  singleton?: boolean;
  defaultSize?: { w?: number; h?: number };
  minSize?: { w?: number; h?: number };
  resizable?: boolean;
  maximizable?: boolean;
  maximized?: boolean;
  /** Builds the app into its window body; may return a cleanup. */
  render(body: HTMLElement, api: XPAppApi): (() => void) | undefined;
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
  registerApp(def: XPAppDef): void;
  openApp(id: string, params?: XPAppParams): unknown;
  dialog(opts?: XPDialogOptions): XPDialogHandle;
  balloon(opts?: XPBalloonOptions): void;
  sound(name: string): void;
  bsod(): void;
  screensaver(kind?: 'logo' | 'stars'): void;
  stopScreensaver(): void;
  unmount(): void;
}

declare global {
  interface Window {
    XPDesktop?: XPDesktopApi;
    /** Windows XP icon bitmaps as data: URLs, by name. */
    XP_ICO?: Record<string, string>;
    /** The default (Bliss) wallpaper as a data: URL. */
    XP_WALL?: string;
    /** Debug handle the room exposes for screenshots and the regression harness. */
    __psx?: Record<string, unknown>;
  }
}
