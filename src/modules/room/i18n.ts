// The room's own strings (top bar, labels, the talkie tour, the resume sheet's chrome), in both page languages.
import type { Lang, Status } from '../../types';
import type { WeatherKind } from '../../services/weather.service';

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

/** The strings the markup asks for by `data-room-t`. */
export type MarkupKey = 'resume' | 'projects' | 'back' | 'no3d' | 'noDesktop' | 'resumeNote' | 'print';

export interface RoomStrings extends Record<MarkupKey | Status, string> {
  phuket: string;
  localTime: string;
  wxNow: string;
  wx: Record<WeatherKind, string>;
  diploma: string;
  resumeTag: string;
  diplomaTag: string;
  /** the one label over the resume and the diploma */
  framesTag: string;
  /** the opencode screen's footer: "attempt #12" */
  attempt: string;
  tour: TourStrings;
  /** accessible names the markup asks for by `data-room-aria` */
  aria: Record<AriaKey, string>;
}

/** The accessible names the markup asks for by `data-room-aria`. */
export type AriaKey = 'lang' | 'music';

export type TourKey = keyof TourStrings;

const STR: Record<Lang, RoomStrings> = {
  ru: {
    resume: 'Резюме',
    projects: 'Проекты',
    back: 'Назад',
    work: 'работаю',
    sleep: 'сплю',
    play: 'играю',
    outside: 'на улице',
    phuket: 'Пхукет',
    resumeNote: '',
    no3d: 'Этот браузер не показал 3D-комнату, поэтому компьютер открывается без неё: кнопка «Проекты».',
    noDesktop: 'Не удалось загрузить рабочий стол. Проверьте соединение и попробуйте ещё раз.',
    print: 'Печать / PDF',
    localTime: 'Местное время',
    wxNow: 'Я на Пхукете',
    wx: { clear: 'ясно', cloud: 'облачно', drizzle: 'морось', rain: 'дождь', storm: 'гроза' },
    diploma: 'Диплом бакалавра · бизнес-информатика · Университет «Синергия», 2026',
    resumeTag: 'Резюме',
    diplomaTag: 'Диплом',
    framesTag: 'Резюме и диплом',
    attempt: 'попытка №',
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
    aria: { lang: 'Язык', music: 'Музыка' },
  },
  en: {
    resume: 'Resume',
    projects: 'Projects',
    back: 'Back',
    work: 'working',
    sleep: 'sleeping',
    play: 'gaming',
    outside: 'outside',
    phuket: 'Phuket',
    resumeNote: 'The resume is in Russian for now.',
    no3d: 'This browser could not show the 3D room, so the computer opens without it: the Projects button.',
    noDesktop: 'The desktop could not be loaded. Check the connection and try again.',
    print: 'Print / PDF',
    localTime: 'Local time',
    wxNow: 'I’m in Phuket',
    wx: { clear: 'clear', cloud: 'cloudy', drizzle: 'drizzle', rain: 'rain', storm: 'thunderstorm' },
    diploma: 'Bachelor’s degree · Business Informatics · Synergy University, 2026',
    resumeTag: 'Resume',
    diplomaTag: 'Diploma',
    framesTag: 'Resume & diploma',
    attempt: 'attempt #',
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
    aria: { lang: 'Language', music: 'Music' },
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
  'no3d',
  'noDesktop',
  'resumeNote',
  'print',
] satisfies MarkupKey[];

export function isMarkupKey(key: string | null): key is MarkupKey {
  return key !== null && MARKUP_KEYS.includes(key);
}

const ARIA_KEYS: readonly string[] = ['lang', 'music'] satisfies AriaKey[];

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
