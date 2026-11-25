// The shell's icons: Windows XP bitmaps, plus the one drawn icon the set has no bitmap for (Task Manager).
import type { Status, XPIconKind } from '../../types';
import { bmp, bmpHot, svg } from './icons';

const computer = bmp('computer');
const gamepad = bmp('gamepad');

export const ICON = {
  logo: bmp('logo'),
  avatar: bmp('avatar'),
  computer,
  display: computer,
  folder: bmp('folder'),
  doc: bmp('rtf'),
  help: bmp('help'),
  run: bmp('run'),
  settings: bmp('settings'),
  programs: bmp('programs'),
  info: bmp('info'),
  warn: bmp('warn'),
  error: bmp('error'),
  question: bmp('question'),
  window: bmp('window'),
  showDesktop: bmp('showdesk'),
  laptop: bmp('laptop'),
  gamepad,
  moon: bmp('ginaStandby'),
  sun: bmp('tree'),
  cmd: bmp('cmd', true),
  startFlag: bmp('startFlag'),
  volume: bmp('volume'),
  mute: bmp('mute'),
  // log-on screen and shutdown dialog buttons (normal / hot)
  standby: bmpHot('ginaStandby'),
  restart: bmpHot('ginaRestart'),
  ginaOff: bmpHot('ginaOff'),
  ginaLogoff: bmpHot('ginaLogoff'),
  ginaSwitch: bmpHot('ginaSwitch'),
  smLogoff: bmpHot('smLogoff'),
  smOff: bmpHot('smOff'),
  taskmgr: svg(
    '<rect x="4.5" y="5.5" width="23" height="20" rx="1.5" fill="#101418" stroke="#6C7684"/><path d="M5 11h22M5 16h22M5 21h22M11 6v19M17 6v19M23 6v19" stroke="#1E6E2A" stroke-width=".7"/>' +
      '<path d="M5 20l4-4 3 2 4-7 3 5 3-3 5 2" fill="none" stroke="#5DD35A" stroke-width="1.8" stroke-linejoin="round"/>',
  ),
} as const;

/** Message icons for dialogs and balloons; 'info' is the default. */
export function messageIcon(kind: XPIconKind | undefined): string {
  switch (kind) {
    case 'warn':
      return ICON.warn;
    case 'error':
      return ICON.error;
    case 'question':
      return ICON.question;
    case 'none':
      return '';
    default:
      return ICON.info;
  }
}

export function gameIcon(kind: string | undefined): string {
  if (kind === 'saver') return ICON.logo;
  if (kind === 'term') return ICON.cmd;
  return gamepad;
}

const STATUS_ICON: Record<Status, string> = { work: ICON.laptop, play: gamepad, sleep: ICON.moon, outside: ICON.sun };
export const statusIcon = (st: Status): string => STATUS_ICON[st];
export const STATUS_DOT: Record<Status, string> = {
  work: '#5DD35A',
  play: '#FFB81C',
  sleep: '#8FA6E4',
  outside: '#4FC0FA',
};

export const WORDMARK = '<div class="xp-word">Windows<sup>XD</sup></div>';
