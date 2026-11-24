// The shell's state, the visitor's saved preferences, and the DOM it builds on mount.
import type { Lang, XPAppDef, XPMountOptions } from '../../shared/types';
import { sessGet, storeGet, storeSet } from './dom';
import type { Cell } from './layout';
import type { Win } from './window';

export type SaverKind = 'none' | 'logo' | 'stars';
export type SizeClass = 'phone' | 'compact' | 'desk';

export interface Prefs {
  muted: boolean;
  volume: number;
  wall: string;
  tint: boolean;
  crt: boolean;
  saver: SaverKind;
  saverMin: number;
  icons: Record<string, Cell>;
  autoArrange: boolean;
}

function savedPrefs(): object {
  const v = storeGet('prefs');
  return typeof v === 'object' && v !== null ? v : {};
}

const DEFAULT_PREFS: Prefs = {
  muted: false,
  volume: 0.8,
  wall: 'bliss',
  tint: true,
  crt: true,
  saver: 'logo',
  saverMin: 3,
  icons: {},
  autoArrange: false,
};

export const S = {
  mounted: false,
  open: false,
  lang: 'ru' as Lang,
  opts: null as XPMountOptions | null,
  apps: new Map<string, XPAppDef>(),
  wins: [] as Win[],
  active: null as Win | null,
  /** Open app windows by app id (and 'sys:<id>' for the built-in programs). */
  openApps: new Map<string, Win>(),
  game: null as Win | null,
  /** A desktop-wide modal dialog (one without an owner window). */
  modalBlock: null as Win | null,
  /** Keyboard handler of the shutdown dialog while it is up. */
  dlgKey: null as ((e: KeyboardEvent) => boolean) | null,
  loginEl: null as HTMLElement | null,
  recent: [] as string[],
  trash: [] as string[],
  booted: sessGet('booted') === '1',
  /** A boot / shutdown overlay is in progress. */
  busy: false,
  size: 'desk' as SizeClass,
  touch: false,
  w: 0,
  h: 0,
  tbH: 30,
  lastW: 0,
  lastH: 0,
  lastInput: 0,
  metaAlone: false,
  prefs: { ...DEFAULT_PREFS, ...savedPrefs() },
};

export function savePrefs(): void {
  storeSet('prefs', S.prefs);
}
// the default wallpaper changed: move earlier visitors to it once
if (!storeGet('wall3')) {
  S.prefs.wall = 'bliss';
  S.prefs.saver = 'logo';
  storeSet('wall3', 1);
  savePrefs();
}

/** The registered apps in registration order (the desktop's icon order). */
export const appList = (): XPAppDef[] => [...S.apps.values()];

/** DOM the shell builds on mount. */
export interface Refs {
  root: HTMLDivElement;
  screen: HTMLDivElement;
  wall: HTMLDivElement;
  desk: HTMLDivElement;
  icons: HTMLDivElement;
  wins: HTMLDivElement;
  crt: HTMLDivElement;
  taskbar: HTMLDivElement;
  startBtn: HTMLButtonElement;
  ql: HTMLDivElement;
  tasks: HTMLDivElement;
  tray: HTMLDivElement;
  clock: HTMLSpanElement;
  lang: HTMLButtonElement;
  vol: HTMLButtonElement;
  statusIc: HTMLButtonElement;
}

let refs: Refs | null = null;
/** The shell's DOM; only called on paths that need a mounted desktop. */
export function dom(): Refs {
  if (!refs) throw new Error('XPDesktop: not mounted');
  return refs;
}
/** The shell's DOM, or null before mount and after unmount. */
export const domOrNull = (): Refs | null => refs;
export function setDom(r: Refs | null): void {
  refs = r;
}
