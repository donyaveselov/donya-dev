// Command Prompt: a cmd-like console with real commands, history, tab completion and a few hidden ones.
import { fill } from '../../shared/i18n';
import type { Bilingual, Status, XPAppApi } from '../../shared/types';
import { APP_ALIASES, CONTACTS, OS, PERSON } from '../content/profile';
import { findProject, PROJECTS } from '../content/projects';
import { byArea, stackLine } from '../content/stack';
import { registerApp } from '../shell/apps';
import { ICONS } from './icons';
import { pad, phuketNow, reduced, ui } from './kit';

const d = (ru: string, en: string): Bilingual => ({ ru, en });

const T = {
  title: d('Командная строка', 'Command Prompt'),
  commandLine: d('Командная строка', 'Command line'),
  copyright: d('Даниил Иванов, Пхукет. Все баги защищены.', 'Daniil Ivanov, Phuket. All bugs reserved.'),
  typeHelp: d('Введите help, чтобы увидеть список команд.', 'Type help to see the list of commands.'),
  helpFoot: d(
    'Стрелки ↑/↓ — история, Tab — дополнение. Есть и скрытые команды.',
    'Arrows Up/Down: history, Tab: completion. There are hidden commands too.',
  ),
  someNode: d('немного Node', 'some Node'),
  whoami: d(
    'Живу на Пхукете. 4,5 года в разработке. Люблю, когда в системе всё продумано до мелочей.',
    'Based in Phuket. 4.5 years in development. Likes systems where every small thing is thought through.',
  ),
  dirOf: d('Содержимое папки', 'Directory of'),
  myProjects: d('Мои проекты', 'My Projects'),
  desktop: d('Рабочий стол', 'Desktop'),
  openHint: d('Откройте: open projects  или  open verifikat', 'Open with: open projects  or  open verifikat'),
  openWhat: d('Что открыть? ', 'Open what? '),
  opening: d('Открываю ', 'Opening '),
  notApp: d(
    '«%s» не является внутренней или внешней командой, исполняемой программой или проектом.',
    "'%s' is not recognized as an app, a project or a batch file.",
  ),
  alreadyHere: d('Вы уже здесь.', 'You are already here.'),
  starting: d('Запуск ', 'Starting '),
  phuket: d('Пхукет (UTC+7): ', 'Phuket (UTC+7): '),
  night: d('ночь', 'night'),
  morning: d('утро', 'morning'),
  afternoon: d('день', 'afternoon'),
  evening: d('вечер', 'evening'),
  noPath: d('Системе не удаётся найти указанный путь.', 'The system cannot find the path specified.'),
  colorUsage: d('Использование: color 0a (фон, текст)', 'Usage: color 0a (background, text)'),
  sameColor: d('Фон и текст одного цвета? Смело, но нет.', 'Same background and text? Bold, but no.'),
  sandwich: d(
    'Сэндвич давно в Корзине. Попробуйте open recycle.',
    'The sandwich has been in the Recycle Bin for a while. Try: open recycle.',
  ),
  sudo1: d(
    'daniil не входит в файл sudoers. Об этом инциденте будет доложено.',
    'daniil is not in the sudoers file. This incident will be reported.',
  ),
  sudo2: d(
    '…маме. Шутка. Здесь и так всё доступно без пароля.',
    '...to mom. Kidding. Everything here is available without a password anyway.',
  ),
  nothingToDelete: d(
    'Здесь нечего удалять. Старые проекты уже в Корзине.',
    'Nothing to delete here. Old projects are already in the Recycle Bin.',
  ),
  deleting: d('Удаление всего…', 'Deleting everything...'),
  accessDenied: d(
    'Отказано в доступе. Проекты защищены резервной копией в голове владельца.',
    "Access denied. The projects are backed up in the owner's head.",
  ),
  niceTry: d('Хорошая попытка :)', 'Nice try :)'),
  coffee: d('Варю кофе… ☕ Готово. Производительность +15%.', 'Brewing coffee... ☕ Done. Productivity +15%.'),
  hire: d('Отличное решение. Открываю контакты…', 'Excellent decision. Opening contacts...'),
  pinging: d('Обмен пакетами с ', 'Pinging '),
  replyFrom: d('Ответ от ', 'Reply from '),
  time: d('время', 'time'),
  tz: d('7 ч (разница поясов)', '7h (time zones)'),
  pingNote: d(
    '(Пинг симулирован: этот компьютер живёт в мониторе и в сеть не ходит.)',
    '(Ping simulated: this computer lives in a monitor and does not go online.)',
  ),
  readmeOpened: d('README.txt открыт в Блокноте.', 'README.txt opened in Notepad.'),
  passwords: d('Серьёзно? Напишите мне лучше в Telegram.', 'Seriously? Better write me on Telegram.'),
  noFile: d(
    'Не удаётся найти указанный файл. Попробуйте cat about.txt',
    'The system cannot find the file specified. Try cat about.txt',
  ),
  binDont: d('Корзина (не открывать)', 'Recycle Bin (do not open)'),
  host: d('Хост: монитор в изометрической комнате', 'Host: a monitor in an isometric room'),
  uptime: d('Аптайм: 4,5 года в разработке', 'Uptime: 4.5 years in development'),
  shell: d('Оболочка: Vue 3 / Nuxt + Python / Django', 'Shell: Vue 3 / Nuxt + Python / Django'),
  cpu: d('Процессор: 1 × Fullstack-разработчик', 'CPU: 1 × Fullstack developer'),
  timeIs: d('Время: ', 'Time: '),
  formatUsage: d('Использование: format c:', 'Usage: format c:'),
  formatting: d('Форматирование диска C: (Andaman)…', 'Formatting drive C: (Andaman)...'),
  noRights: d('Недостаточно прав. И совести.', 'Insufficient privileges. And conscience.'),
  credits1: d(
    'Использованные технологии: HTML, CSS, JS, упрямство.',
    'Technologies used: HTML, CSS, JS, stubbornness.',
  ),
  credits2: d('Режиссёр, сценарист, все роли — Даниил Иванов.', 'Directed, written and performed by Daniil Ivanov.'),
  lang: d(
    'Язык переключается значком RU/EN в трее, справа внизу.',
    'Switch the language with the RU/EN icon in the tray, bottom right.',
  ),
  weather: d(
    'Пхукет: +30, влажно, к вечеру ливень. Как всегда.',
    'Phuket: +30, humid, a downpour by evening. As always.',
  ),
  hello: d(
    'Привет! Спасибо, что заглянули в консоль. Тут бывают пасхалки.',
    'Hi! Thanks for opening the console. Easter eggs live here.',
  ),
  openingResume: d('Открываю резюме…', 'Opening the resume...'),
  unknown: d(
    '«%s» не является внутренней или внешней командой. Введите help.',
    "'%s' is not recognized as an internal or external command. Type help.",
  ),
  matrixEnd: d(
    'Проснись, посетитель… Матрица — это просто много div-ов.',
    'Wake up, visitor... The Matrix is just a lot of divs.',
  ),
} as const;

const STATUS_LINE: Record<Status, Bilingual> = {
  work: d('работает. Код компилируется, кофе остывает.', 'working. Code compiling, coffee cooling.'),
  play: d('играет. Вернётся после катки.', 'gaming. Back after this match.'),
  sleep: d('спит. Zzz… ответит утром.', 'asleep. Zzz... will reply in the morning.'),
  outside: d('вне дома. Пхукет сам себя не исследует.', 'outside. Phuket will not explore itself.'),
};

/** The 16 console colours of `color`, by hex digit. */
const COLORS: Readonly<Record<string, string>> = {
  '0': '#000',
  '1': '#000080',
  '2': '#008000',
  '3': '#008080',
  '4': '#800000',
  '5': '#800080',
  '6': '#808000',
  '7': '#c0c0c0',
  '8': '#808080',
  '9': '#0000ff',
  a: '#00ff00',
  b: '#00ffff',
  c: '#ff0000',
  d: '#ff00ff',
  e: '#ffff00',
  f: '#ffffff',
};
export const OPENABLE = [
  'projects',
  'resume',
  'about',
  'contact',
  'minesweeper',
  'paint',
  'recycle',
  'browser',
  'notepad',
  'calc',
  'terminal',
];

/* ------------------------------------------------------------------ pure logic (tested in terminal.test.ts) */

/** A typed line: the command name (lower case, without .exe) and its arguments. */
export function parseCommand(line: string): { word: string; name: string; args: string[] } | null {
  const s = line.trim();
  if (!s) return null;
  const [word = '', ...args] = s.split(/\s+/);
  return { word, name: word.toLowerCase().replace(/\.exe$/, ''), args };
}

export const prompt = (cwd: readonly string[]): string => `${cwd.join('\\')}${cwd.length === 1 ? '\\' : ''}>`;

/** `cd`: the new folder, or null when there is no such path. */
export function changeDir(cwd: readonly string[], arg: string, projectsDir: string): string[] | null {
  const a = arg.trim();
  if (a === '..') return cwd.length > 1 ? cwd.slice(0, -1) : [...cwd];
  if (a === '\\' || a === '/') return ['C:'];
  if (/^(my ?projects|projects|мои проекты)$/i.test(a) && cwd.length === 3) return [...cwd, projectsDir];
  if (/^andaman$/i.test(a) && cwd.length === 1) return [...cwd, 'Andaman'];
  if (/^daniil$/i.test(a) && cwd.length === 2) return [...cwd, 'Daniil'];
  return null;
}

/** `color bf`: [background, text], or an error: 'usage' for a bad code, 'same' for one colour on itself. */
export function parseColor(arg: string | undefined): [string, string] | 'usage' | 'same' {
  let c = (arg ?? '07').toLowerCase();
  if (!/^[0-9a-f]{1,2}$/.test(c)) return 'usage';
  if (c.length === 1) c = `0${c}`;
  const [b = '0', f = '7'] = c;
  if (b === f) return 'same';
  return [COLORS[b] ?? '#000', COLORS[f] ?? '#c0c0c0'];
}

export function commonPrefix(words: readonly string[]): string {
  return words.reduce((a, b) => {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return a.slice(0, i);
  });
}

/**
 * Tab completion of the input: a command name, or an app / project after `open`. One hit completes it, several are
 * listed and the input gets their common prefix, none is an error.
 */
export function complete(
  value: string,
  commands: readonly string[],
  openTargets: readonly string[],
): { value: string; list?: string[] } | null {
  const m = /^(\s*)(\S*)(\s+)?(\S*)$/.exec(value);
  if (!m) return { value };
  const [, lead = '', first = '', space, second = ''] = m;
  let pool: readonly string[];
  let word: string;
  if (space !== undefined && /^open$/i.test(first)) {
    pool = openTargets;
    word = second;
  } else if (space === undefined) {
    pool = commands;
    word = first;
  } else return { value };
  const hits = pool.filter((x) => x.startsWith(word.toLowerCase()));
  const head = space !== undefined ? `${lead}${first} ` : lead;
  const only = hits.length === 1 ? hits[0] : undefined;
  if (only !== undefined) return { value: head + only + (space === undefined && only === 'open' ? ' ' : '') };
  if (hits.length > 1) return { value: head + commonPrefix(hits), list: hits };
  return null;
}

/** The `format c:` progress bar. */
export const progressBar = (pc: number): string =>
  `[${'#'.repeat(Math.round(pc / 5))}${'.'.repeat(Math.max(0, 20 - Math.round(pc / 5)))}] ${String(pc)}%`;

/* ------------------------------------------------------------------ the console */

interface Command {
  /** The argument shown by help. */
  a?: string;
  d?: Bilingual;
  hidden?: boolean;
  /** Returns true when the command keeps printing after it returns (it prints its own blank line). */
  run(args: string[], raw: string): boolean | undefined;
}

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-term', 420);
  const out = h('div.xpa-term-out.xpa-selectable', { role: 'log', 'aria-live': 'polite' });
  const promptEl = h('span.xpa-term-prompt');
  const input = h('input.xpa-term-in', {
    type: 'text',
    spellcheck: 'false',
    autocomplete: 'off',
    autocapitalize: 'off',
    'aria-label': T.commandLine,
  });
  const screen = h('div.xpa-term-screen', { tabindex: '-1' }, [out, h('div.xpa-term-line', [promptEl, input])]);
  root.appendChild(screen);
  const hist: string[] = [];
  let hi = 0;
  let cwd = ['C:', 'Andaman', 'Daniil'];
  let matrixStop: (() => void) | null = null;

  const setPrompt = (): void => {
    promptEl.textContent = prompt(cwd);
  };
  const print = (s: string, cls?: string): void => {
    for (const ln of s.split('\n')) {
      const el = h('div.xpa-term-l', ln === '' ? '\u00A0' : ln);
      if (cls) el.classList.add(cls);
      out.appendChild(el);
    }
    while (out.children.length > 600) out.firstChild?.remove();
    screen.scrollTop = screen.scrollHeight;
  };
  const pt = (text: Bilingual): void => {
    print(t(text));
  };
  const osLine = (): string => `${OS.version} — ${t(OS.edition)}`;
  const finishAsync = (): void => {
    input.disabled = false;
    input.focus();
  };
  const ljust = (s: string, n: number): string => s.padEnd(n);

  const CMDS: Record<string, Command> = {
    help: {
      d: d('этот список', 'this list'),
      run: () => {
        for (const [k, c] of Object.entries(CMDS))
          if (!c.hidden) print(`  ${ljust(k + (c.a ? ` ${c.a}` : ''), 16)}${t(c.d)}`);
        print('');
        pt(T.helpFoot);
        return undefined;
      },
    },
    whoami: {
      d: d('кто здесь живёт', 'who lives here'),
      run: () => {
        print('daniil-pc\\daniil');
        print(`${t(PERSON.name)} — ${t(PERSON.role)} (Vue 3 / Nuxt + Python / Django, ${t(T.someNode)})`);
        pt(T.whoami);
        return undefined;
      },
    },
    projects: {
      d: d('список проектов', 'list projects'),
      run: () => {
        print(` ${t(T.dirOf)} C:\\Andaman\\Daniil\\${t(T.myProjects)}`);
        print('');
        for (const p of PROJECTS) print(`  <DIR>  ${ljust(t(p.name), 16)}${t(p.tagline)}`);
        print('');
        pt(T.openHint);
        return undefined;
      },
    },
    open: {
      a: '<app>',
      d: d('открыть программу', 'open an app'),
      run: (args) => {
        const name = (args[0] ?? '').toLowerCase().replace(/\.exe$/, '');
        if (!name) {
          print(t(T.openWhat) + OPENABLE.join(', '));
          return undefined;
        }
        const proj = findProject(name);
        if (proj) {
          api.openApp('project', { id: proj.id });
          print(`${t(T.opening)}${t(proj.name)}...`);
          return undefined;
        }
        const id = APP_ALIASES[name];
        if (!id) {
          U.sound('error');
          print(t(fill(T.notApp, name)));
          return undefined;
        }
        if (id === 'terminal') {
          pt(T.alreadyHere);
          return undefined;
        }
        api.openApp(id);
        print(`${t(T.starting)}${id}.exe...`);
        return undefined;
      },
    },
    skills: {
      d: d('стек технологий', 'tech stack'),
      run: () => {
        for (const g of byArea()) print(`  ${`${g.id}        `.slice(0, 8)}  ${stackLine(g.id, U.lang())}`);
        return undefined;
      },
    },
    time: {
      d: d('время на Пхукете', 'time in Phuket'),
      run: () => {
        const p = phuketNow(api);
        const part = p.h < 6 ? T.night : p.h < 12 ? T.morning : p.h < 18 ? T.afternoon : T.evening;
        print(`${t(T.phuket)}${pad(p.h)}:${pad(p.m)}, ${t(part)}`);
        return undefined;
      },
    },
    status: {
      d: d('чем владелец занят сейчас', 'what the owner is doing now'),
      run: () => {
        const s = api.status();
        print(`STATUS: ${s.toUpperCase()} — ${t(STATUS_LINE[s])}`);
        return undefined;
      },
    },
    contact: {
      d: d('контакты', 'contacts'),
      run: () => {
        for (const c of CONTACTS) print(`  ${ljust(t(c.label), 10)}${c.value}`);
        return undefined;
      },
    },
    cls: {
      d: d('очистить экран', 'clear the screen'),
      run: () => {
        out.innerHTML = '';
        return undefined;
      },
    },
    ver: {
      d: d('версия системы', 'system version'),
      run: () => {
        print('');
        print(osLine());
        return undefined;
      },
    },
    date: {
      d: d('дата', 'date'),
      run: () => {
        const p = phuketNow(api).date;
        print(`${String(p.getUTCFullYear())}-${pad(p.getUTCMonth() + 1)}-${pad(p.getUTCDate())}`);
        return undefined;
      },
    },
    echo: {
      a: '<text>',
      d: d('повторить текст', 'print text'),
      run: (_args, raw) => {
        print(raw.replace(/^\s*echo\s?/i, '') || 'ECHO is on.');
        return undefined;
      },
    },
    dir: {
      d: d('содержимое папки', 'list folder'),
      run: () => {
        print(` ${t(T.dirOf)} ${cwd.join('\\')}`);
        print('');
        if (cwd.length === 3)
          for (const x of [
            `<DIR>  ${t(T.myProjects)}`,
            `<DIR>  ${t(T.desktop)}`,
            '       about.txt',
            '       resume.rtf',
            '       README.txt',
          ])
            print(`  ${x}`);
        else if (cwd.length > 3) for (const p of PROJECTS) print(`  <DIR>  ${t(p.name)}`);
        else print('  <DIR>  Andaman');
        return undefined;
      },
    },
    cd: {
      a: '<dir>',
      d: d('сменить папку', 'change folder'),
      run: (args) => {
        const a = args.join(' ').trim();
        if (!a) {
          print(cwd.join('\\'));
          return undefined;
        }
        const next = changeDir(cwd, a, t(T.myProjects));
        if (!next) {
          pt(T.noPath);
          return undefined;
        }
        cwd = next;
        setPrompt();
        return undefined;
      },
    },
    color: {
      a: '<bf>',
      d: d('цвет консоли, напр. color 0a', 'console colour, e.g. color 0a'),
      run: (args) => {
        const c = parseColor(args[0]);
        if (c === 'usage') pt(T.colorUsage);
        else if (c === 'same') pt(T.sameColor);
        else {
          const [bg, fg] = c;
          screen.style.background = bg;
          screen.style.color = fg;
          input.style.color = fg;
        }
        return undefined;
      },
    },
    history: {
      d: d('история команд', 'command history'),
      run: () => {
        hist.forEach((x, i) => {
          print(`  ${String(i + 1)}  ${x}`);
        });
        return undefined;
      },
    },
    exit: {
      d: d('закрыть окно', 'close the window'),
      run: () => {
        api.win.close();
        return undefined;
      },
    },
    sudo: {
      hidden: true,
      run: (args) => {
        if (/make me a sandwich/i.test(args.join(' '))) {
          pt(T.sandwich);
          return undefined;
        }
        U.sound('error');
        pt(T.sudo1);
        pt(T.sudo2);
        return undefined;
      },
    },
    rm: {
      hidden: true,
      run: (args) => {
        if (!args.join(' ').includes('-rf')) {
          pt(T.nothingToDelete);
          return undefined;
        }
        input.disabled = true;
        const steps = [
          'node_modules (1/∞)',
          'node_modules (2/∞)',
          'C:\\Andaman\\System32... ',
          `C:\\Andaman\\Daniil\\${t(T.myProjects)}...`,
        ];
        let i = 0;
        pt(T.deleting);
        const step = (): void => {
          const s = steps[i++];
          if (s !== undefined) {
            print(`  rm ${s}`);
            U.later(reduced() ? 10 : 380, step);
            return;
          }
          U.sound('error');
          pt(T.accessDenied);
          pt(T.niceTry);
          print('');
          finishAsync();
        };
        step();
        return true;
      },
    },
    matrix: {
      d: d('проснись, Нео', 'wake up, Neo'),
      run: () => {
        startMatrix();
        return undefined;
      },
    },
    coffee: {
      hidden: true,
      run: () => {
        pt(T.coffee);
        return undefined;
      },
    },
    hire: {
      hidden: true,
      run: () => {
        pt(T.hire);
        api.openApp('contact');
        return undefined;
      },
    },
    ping: {
      hidden: true,
      run: (args) => {
        const host = args[0] ?? 'donya.dev';
        print(`${t(T.pinging)}${host}:`);
        let n = 0;
        input.disabled = true;
        const p = (): void => {
          if (n++ < 3) {
            const ms = /phuket|пхукет/i.test(host) ? t(T.tz) : `${String(7 + Math.floor(Math.random() * 30))}ms`;
            print(`  ${t(T.replyFrom)}${host}: ${t(T.time)}=${ms} TTL=64`);
            U.later(reduced() ? 10 : 400, p);
            return;
          }
          pt(T.pingNote);
          print('');
          finishAsync();
        };
        p();
        return true;
      },
    },
    cat: {
      a: '<file>',
      d: d('показать файл', 'print a file'),
      run: (args) => {
        const f = (args[0] ?? '').toLowerCase();
        if (f === 'about.txt') return CMDS.whoami?.run([], '');
        if (f === 'readme.txt') {
          api.openApp('notepad');
          pt(T.readmeOpened);
          return undefined;
        }
        if (f === 'resume.rtf') return CMDS.cv?.run([], '');
        if (/пароли|passwords/.test(f)) {
          print('hunter2');
          pt(T.passwords);
          return undefined;
        }
        pt(T.noFile);
        return undefined;
      },
    },
    tree: {
      d: d('дерево проектов', 'project tree'),
      run: () => {
        print('C:\\Andaman\\Daniil');
        print(`├── ${t(T.myProjects)}`);
        PROJECTS.forEach((p, i) => {
          const last = i === PROJECTS.length - 1;
          print(`│   ${last ? '└── ' : '├── '}${t(p.name)}`);
          print(`│   ${last ? '    ' : '│   '}└── ${p.stack.slice(0, 4).join(', ')}…`);
        });
        print('├── resume.rtf');
        print(`└── ${t(T.binDont)}`);
        return undefined;
      },
    },
    neofetch: {
      d: d('сведения о системе', 'system info'),
      run: () => {
        const p = phuketNow(api);
        const art = [
          '      _  _      ',
          '    (  \\/  )    ',
          ' .--\\      /--. ',
          '(    ) () (    )',
          " '--/      \\--' ",
          '    (  /\\  )    ',
          '      \u2019  \u2018      ',
        ];
        const info = [
          `daniil@${OS.pcName}`,
          '-------------',
          `OS: ${OS.version}`,
          t(T.host),
          t(T.uptime),
          t(T.shell),
          t(T.cpu),
          `${t(T.timeIs)}${pad(p.h)}:${pad(p.m)} (UTC+7)`,
        ];
        for (let i = 0; i < Math.max(art.length, info.length); i++)
          print(`${art[i] ?? '                '}  ${info[i] ?? ''}`);
        return undefined;
      },
    },
    bsod: {
      hidden: true,
      run: () => {
        api.openApp('bsod');
        return undefined;
      },
    },
    taskmgr: {
      hidden: true,
      run: () => {
        api.openApp('taskmgr');
        return undefined;
      },
    },
    format: {
      hidden: true,
      run: (args) => {
        if (!/^c:?$/i.test(args[0] ?? '')) {
          pt(T.formatUsage);
          return undefined;
        }
        input.disabled = true;
        let pc = 0;
        pt(T.formatting);
        const ln = h('div.xpa-term-l', '');
        out.appendChild(ln);
        const step = (): void => {
          pc = Math.min(99, pc + 7 + Math.floor(Math.random() * 9));
          ln.textContent = progressBar(pc);
          screen.scrollTop = screen.scrollHeight;
          if (pc < 99) {
            U.later(reduced() ? 10 : 160, step);
            return;
          }
          U.sound('error');
          pt(T.noRights);
          print('');
          finishAsync();
        };
        step();
        return true;
      },
    },
    credits: {
      hidden: true,
      run: () => {
        pt(T.credits1);
        pt(T.credits2);
        return undefined;
      },
    },
    lang: {
      hidden: true,
      run: () => {
        pt(T.lang);
        return undefined;
      },
    },
    weather: {
      hidden: true,
      run: () => {
        pt(T.weather);
        return undefined;
      },
    },
    hello: {
      hidden: true,
      run: () => {
        pt(T.hello);
        return undefined;
      },
    },
  };
  const alias = (to: string): Command => ({ hidden: true, run: (args, raw) => CMDS[to]?.run(args, raw) });
  CMDS.clear = alias('cls');
  CMDS.ls = alias('dir');
  CMDS.cv = {
    hidden: true,
    run: () => {
      api.openApp('resume');
      pt(T.openingResume);
      return undefined;
    },
  };
  CMDS.привет = alias('hello');

  function exec(raw: string): void {
    print(prompt(cwd) + raw, 'cmd');
    const cmd = parseCommand(raw);
    if (!cmd) return;
    const { word, name, args } = cmd;
    const s = raw.trim();
    hist.push(s);
    if (hist.length > 50) hist.shift();
    hi = hist.length;
    const c = CMDS[name];
    if (!c) {
      if (APP_ALIASES[name]) {
        CMDS.open?.run([name], s);
        return;
      }
      U.sound('error');
      print(t(fill(T.unknown, word)));
      return;
    }
    let busy: boolean | undefined;
    try {
      busy = c.run(args, s);
    } catch (e) {
      print(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    // a blank line after the output, unless the screen was cleared or the command is still printing
    if (name !== 'cls' && name !== 'clear' && !busy && out.lastChild && out.lastChild.textContent !== '\u00A0')
      print('');
  }

  const commandNames = (): string[] => [
    ...Object.keys(CMDS).filter((k) => !CMDS[k]?.hidden),
    ...OPENABLE.filter((a) => !(a in CMDS)),
  ];
  const openTargets = (): string[] => [...OPENABLE, ...PROJECTS.map((p) => p.id)];

  function completeInput(): void {
    const v = input.value;
    const r = complete(v, commandNames(), openTargets());
    if (!r) {
      U.sound('error');
      return;
    }
    if (r.list) {
      print(prompt(cwd) + v, 'cmd');
      print(`  ${r.list.join('  ')}`);
    }
    input.value = r.value;
  }

  input.addEventListener('keydown', (e) => {
    if (matrixStop) {
      e.preventDefault();
      matrixStop();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      exec(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hi > 0) {
        hi--;
        input.value = hist[hi] ?? '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hi < hist.length) {
        hi++;
        input.value = hist[hi] ?? '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      completeInput();
    } else if (e.key === 'Escape') input.value = '';
    else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.innerHTML = '';
    } else if (e.key === 'c' && e.ctrlKey && !String(window.getSelection() ?? '')) {
      e.preventDefault();
      print(`${prompt(cwd)}${input.value}^C`, 'cmd');
      input.value = '';
    }
  });
  screen.addEventListener('mouseup', () => {
    if (!String(window.getSelection() ?? '')) input.focus({ preventScroll: true });
  });

  function startMatrix(): void {
    const cv = h('canvas.xpa-term-matrix');
    root.appendChild(cv);
    const w = (cv.width = root.clientWidth);
    const hh = (cv.height = root.clientHeight);
    const ctx = cv.getContext('2d');
    const size = 14;
    const cols = Math.ceil(w / size);
    const drops: number[] = [];
    for (let i = 0; i < cols; i++) drops.push(Math.random() * -20);
    const chars = 'アイウエオカキクケコサシスセソ0123456789VUEDJANGOPYTHON<>{}=/';
    let id = 0;
    let stopT = 0;
    const frame = (): void => {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0,0,0,.08)';
      ctx.fillRect(0, 0, w, hh);
      ctx.font = `${String(size)}px monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)] ?? '0';
        ctx.fillStyle = Math.random() < 0.05 ? '#d7ffd7' : '#00e040';
        const y = drops[i] ?? 0;
        ctx.fillText(ch, i * size, y * size);
        drops[i] = (y * size > hh && Math.random() > 0.97 ? 0 : y) + 1;
      }
    };
    const stop = (): void => {
      clearInterval(id);
      clearTimeout(stopT);
      cv.remove();
      matrixStop = null;
      pt(T.matrixEnd);
      input.focus();
    };
    matrixStop = stop;
    cv.addEventListener('click', stop);
    if (reduced()) {
      for (let k = 0; k < 40; k++) frame();
      stopT = window.setTimeout(stop, 1500);
    } else {
      id = window.setInterval(frame, 50);
      stopT = window.setTimeout(stop, 6000);
    }
    U.onCleanup(() => {
      clearInterval(id);
      clearTimeout(stopT);
    });
  }

  setPrompt();
  print(osLine());
  print(`(C) ${t(T.copyright)}`);
  print('');
  pt(T.typeHelp);
  print('');
  const cmd = api.params?.cmd;
  if (typeof cmd === 'string') exec(cmd);
  U.bind(() => {
    api.win.setTitle(t(T.title));
  });
  U.later(30, () => {
    input.focus({ preventScroll: true });
  });
  return U.destroy;
}

registerApp({
  id: 'terminal',
  title: T.title,
  icon: ICONS.terminal,
  desktop: true,
  startMenu: 'programs',
  defaultSize: { w: 640, h: 400 },
  minSize: { w: 280, h: 200 },
  singleton: false,
  render,
});
