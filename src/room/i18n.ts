// The room's own strings (top bar, drawer, labels, the talkie tour), in both page languages.
import type { Lang, Status } from '../shared/types';
import type { WeatherKind } from './weather';

export interface TourStrings {
  hello: string;
  yes: string;
  no: string;
  next: string;
  skip: string;
  again: string;
  work: string;
  play: string;
  outside: string;
  sleep: string;
  back: string;
  projects: string;
  resume: string;
  diploma: string;
  place: string;
  end: string;
}

/** The strings the markup asks for by `data-t`. */
export type MarkupKey = 'resume' | 'projects' | 'back' | 'loading' | 'hint' | 'no3d' | 'resumeNote' | 'print';

export interface RoomStrings extends Record<MarkupKey | Status, string> {
  phuket: string;
  localTime: string;
  wxNow: string;
  wx: Record<WeatherKind, string>;
  diploma: string;
  resumeTag: string;
  diplomaTag: string;
  tour: TourStrings;
  /** accessible names the markup asks for by `data-t-aria` */
  aria: Record<AriaKey, string>;
}

/** The accessible names the markup asks for by `data-t-aria`. */
export type AriaKey = 'lang' | 'close' | 'sheet' | 'drawer';

export type TourKey = keyof TourStrings;

const STR: Record<Lang, RoomStrings> = {
  ru: {
    resume: 'Резюме',
    projects: 'Проекты',
    back: 'Назад',
    loading: 'NOW LOADING',
    work: 'работаю',
    sleep: 'сплю',
    play: 'играю',
    outside: 'на улице',
    phuket: 'Пхукет',
    resumeNote: '',
    hint: 'Потяните, чтобы повернуть комнату',
    no3d: 'Этот браузер не показал 3D-комнату. Проекты и резюме открываются кнопками.',
    print: 'Печать / PDF',
    localTime: 'Местное время',
    wxNow: 'Я на Пхукете',
    wx: { clear: 'ясно', cloud: 'облачно', drizzle: 'морось', rain: 'дождь', storm: 'гроза' },
    diploma: 'Диплом бакалавра · бизнес-информатика · Университет «Синергия», 2026',
    resumeTag: 'Резюме',
    diplomaTag: 'Диплом',
    tour: {
      hello: 'Привет, я Даниил! Сейчас на Пхукете {time}, и я {what}. Показать вам комнату?',
      yes: 'Да',
      no: 'Нет',
      next: 'Дальше',
      skip: 'Пропустить',
      again: 'Экскурсия по комнате',
      work: 'С утра до вечера я работаю: вот так это выглядит.',
      play: 'Иногда играю. Статус берётся из Discord: если я в Dota, CS или другой игре, комната это покажет.',
      outside: 'После работы обычно отдыхаю на улице.',
      sleep: 'А ночью я сплю.',
      back: 'И всё это по-настоящему: комната живёт по моим часам.',
      projects:
        'Нажмите на любой монитор, и окажетесь за моим компьютером: Windows XD, проекты не под NDA и пара мини-игр вроде сапёра и Paint.',
      resume: 'На стене моё резюме, нажмите, чтобы открыть.',
      diploma: 'Рядом диплом: бакалавр, бизнес-информатика, университет «Синергия», 2026.',
      place: 'Часы показывают моё местное время, а за окном Пхукет с его настоящей погодой.',
      end: 'Вот и всё! Захотите пройтись ещё раз, я тут, в углу.',
    },
    aria: { lang: 'Язык', close: 'Закрыть', sheet: 'Резюме', drawer: 'Проекты' },
  },
  en: {
    resume: 'Resume',
    projects: 'Projects',
    back: 'Back',
    loading: 'NOW LOADING',
    work: 'working',
    sleep: 'sleeping',
    play: 'gaming',
    outside: 'outside',
    phuket: 'Phuket',
    resumeNote: 'The resume is in Russian for now.',
    hint: 'Drag to rotate the room',
    no3d: 'This browser could not show the 3D room. Projects and the resume open with the buttons.',
    print: 'Print / PDF',
    localTime: 'Local time',
    wxNow: 'I’m in Phuket',
    wx: { clear: 'clear', cloud: 'cloudy', drizzle: 'drizzle', rain: 'rain', storm: 'thunderstorm' },
    diploma: 'Bachelor’s degree · Business Informatics · Synergy University, 2026',
    resumeTag: 'Resume',
    diplomaTag: 'Diploma',
    tour: {
      hello: 'Hi, I’m Daniil! It’s {time} in Phuket and I’m {what}. Want a quick tour of the room?',
      yes: 'Yes',
      no: 'No',
      next: 'Next',
      skip: 'Skip',
      again: 'Room tour',
      work: 'From morning till evening I work. This is what it looks like.',
      play: 'Sometimes I play. My status comes from Discord: if I’m in Dota, CS or another game, the room shows it.',
      outside: 'After work I usually chill outside.',
      sleep: 'And at night I sleep.',
      back: 'All of it is real: the room runs on my clock.',
      projects:
        'Click either monitor to sit at my computer: Windows XD, my non-NDA projects and some fun stuff like Minesweeper and Paint.',
      resume: 'My resume hangs on the wall. Click it to open.',
      diploma: 'Next to it, my diploma: BSc in Business Informatics, Synergy University, 2026.',
      place: 'The clock shows my local time, and outside the window is Phuket with its real weather.',
      end: 'That’s it! If you want the tour again, I’m right here in the corner.',
    },
    aria: { lang: 'Language', close: 'Close', sheet: 'Resume', drawer: 'Projects' },
  },
};

/** The room's dictionary for a language. */
export function t(lang: Lang): RoomStrings {
  return STR[lang];
}

const MARKUP_KEYS: readonly string[] = [
  'resume',
  'projects',
  'back',
  'loading',
  'hint',
  'no3d',
  'resumeNote',
  'print',
] satisfies MarkupKey[];

export function isMarkupKey(key: string | null): key is MarkupKey {
  return key !== null && MARKUP_KEYS.includes(key);
}

const ARIA_KEYS: readonly string[] = ['lang', 'close', 'sheet', 'drawer'] satisfies AriaKey[];

export function isAriaKey(key: string | null): key is AriaKey {
  return key !== null && ARIA_KEYS.includes(key);
}

export const pad2 = (n: number): string => (n < 10 ? '0' : '') + String(n);

/** "working", or "gaming in Dota 2" while a named game runs. */
export function statusText(lang: Lang, status: Status, gameName: string | null): string {
  const what = STR[lang][status];
  return status === 'play' && gameName ? what + (lang === 'ru' ? ' в ' : ' ') + gameName : what;
}

/** The time chip: "Пхукет 13:00 · работаю". */
export function timeChip(lang: Lang, h: number, m: number, status: Status, gameName: string | null): string {
  return STR[lang].phuket + ' ' + pad2(h) + ':' + pad2(m) + ' · ' + statusText(lang, status, gameName);
}

/** A tour line; the greeting fills in the Phuket time and what the owner is doing. */
export function tourLine(
  lang: Lang,
  key: TourKey,
  now: { h: number; m: number; status: Status; gameName: string | null },
): string {
  const line = STR[lang].tour[key];
  if (key !== 'hello') return line;
  return line
    .replace('{time}', pad2(now.h) + ':' + pad2(now.m))
    .replace('{what}', statusText(lang, now.status, now.gameName));
}
