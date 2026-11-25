// Who the desktop belongs to, how to reach him, and the names the terminal and the browser accept for the apps.
import type { Bilingual } from '../types';

export const PERSON = {
  name: { ru: 'Даниил Иванов', en: 'Daniil Ivanov' },
  role: { ru: 'Fullstack-разработчик', en: 'Fullstack developer' },
  city: { ru: 'Пхукет, Таиланд', en: 'Phuket, Thailand' },
} as const satisfies Record<string, Bilingual>;

/** The positioning line next to the role: "Vue 3 · Python / Django" (or joined with " + "). */
export const HEADLINE = ['Vue 3', 'Python / Django'] as const;

/** The desktop's own OS. */
export const OS = {
  name: 'Windows XD',
  edition: { ru: 'Professional', en: 'Professional' } as Bilingual,
  version: 'Windows XD 5.1 (build 2026.11, Phuket)',
  pcName: 'PHUKET-PC',
} as const;

export interface Contact {
  id: 'telegram' | 'email' | 'github' | 'site';
  label: string | Bilingual;
  value: string;
  /** null: shown with a copy button instead of a link. */
  href: string | null;
  note: Bilingual;
  color: string;
}

export const CONTACTS: readonly [Contact, ...Contact[]] = [
  {
    id: 'telegram',
    label: 'Telegram',
    value: 't.me/work_veselov',
    href: 'https://t.me/work_veselov',
    note: { ru: 'быстрее всего', en: 'fastest' },
    color: '#2aa3df',
  },
  {
    id: 'email',
    label: 'E-mail',
    value: 'donya.withlove@gmail.com',
    href: null,
    note: { ru: 'для длинных писем', en: 'for longer letters' },
    color: '#d9534f',
  },
  {
    id: 'github',
    label: 'GitHub',
    value: 'github.com/donyaveselov',
    href: 'https://github.com/donyaveselov',
    note: { ru: 'код и пет-проекты', en: 'code and side projects' },
    color: '#333',
  },
  {
    id: 'site',
    label: { ru: 'Сайт', en: 'Website' },
    value: 'donya.dev',
    href: 'https://donya.dev',
    note: { ru: 'вы здесь', en: 'you are here' },
    color: '#2f9e5b',
  },
];

/** The desktop's programs that can be opened by name, in the order of their icons. */
export const APP_IDS = [
  'projects',
  'resume',
  'about',
  'contact',
  'terminal',
  'minesweeper',
  'paint',
  'recycle',
  'browser',
  'notepad',
  'calc',
] as const;
export type AppId = (typeof APP_IDS)[number];

/** App ids the terminal and the browser open, with friendly aliases. */
export const APP_ALIASES: Readonly<Record<string, AppId>> = {
  projects: 'projects',
  project: 'projects',
  explorer: 'projects',
  resume: 'resume',
  cv: 'resume',
  wordpad: 'resume',
  about: 'about',
  computer: 'about',
  mycomputer: 'about',
  sysinfo: 'about',
  contact: 'contact',
  mail: 'contact',
  contacts: 'contact',
  terminal: 'terminal',
  cmd: 'terminal',
  minesweeper: 'minesweeper',
  mines: 'minesweeper',
  winmine: 'minesweeper',
  paint: 'paint',
  brush: 'paint',
  mspaint: 'paint',
  recycle: 'recycle',
  bin: 'recycle',
  trash: 'recycle',
  browser: 'browser',
  navigator: 'browser',
  ie: 'browser',
  iexplore: 'browser',
  internet: 'browser',
  notepad: 'notepad',
  readme: 'notepad',
  calc: 'calc',
  calculator: 'calc',
};

/** What the terminal's `open` lists and completes: every program the aliases reach, once. */
export const OPENABLE: readonly AppId[] = [...new Set(Object.values(APP_ALIASES))];
