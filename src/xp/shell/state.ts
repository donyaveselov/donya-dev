// The shell's state, the visitor's saved preferences, and the DOM it builds on mount.
import { muteChosen, setMuted } from '../../shared/sound';
import type { Lang, XPAppDef, XPMountOptions } from '../../shared/types';
import { TASKBAR_H } from './constants';
import { sessGet, storeGet, storeSet } from './dom';
import { defaultPrefs, legacyMuted, parsePrefs } from './prefs';
import type { Win } from './window';

export type { Prefs, SaverKind } from './prefs';
export type SizeClass = 'phone' | 'compact' | 'desk';

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
  /** The boot screen has been shown in this browser tab. */
  booted: false,
  /** A boot / shutdown overlay is in progress. */
  busy: false,
  size: 'desk' as SizeClass,
  touch: false,
  w: 0,
  h: 0,
  tbH: TASKBAR_H.desk as number,
  lastW: 0,
  lastH: 0,
  lastInput: 0,
  metaAlone: false,
  prefs: defaultPrefs(),
};

/** Reads what the visitor's browser remembers; called on mount, so that importing the shell touches no storage. */
export function loadSaved(): void {
  const saved = storeGet('prefs');
  S.prefs = parsePrefs(saved);
  S.booted = sessGet('booted') === '1';
  // mute is the page's one switch (src/shared/sound.ts): a desktop muted before that existed moves it over once
  if (!muteChosen() && legacyMuted(saved)) setMuted(true);
}

export function savePrefs(): void {
  storeSet('prefs', S.prefs);
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
