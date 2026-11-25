// Command Prompt's commands, without the DOM (unit-tested in terminal-commands.test.ts). The console window gives them
// a host to print to and to reach the desktop through; everything a command says and does goes through it.
import { fill, tr } from '../../shared/i18n';
import type { Bilingual, Lang, Status, XPAppParams } from '../../shared/types';
import { APP_ALIASES, CONTACTS, HEADLINE, OPENABLE, OS, PERSON } from '../content/profile';
import { findProject, PROJECTS } from '../content/projects';
import { byArea, stackLine } from '../content/stack';
import { OWNER_STATUS } from '../content/status';
import { d, pad } from '../content/text';
import { EXPERIENCE } from '../../shared/experience';
import { APP } from './strings';
import { changeDir, complete, HOME_DIR, parseColor, parseCommand, progressBar, prompt } from './terminal-parse';

const T = {
  copyright: d('Даниил Иванов, Пхукет.', 'Daniil Ivanov, Phuket.'),
  typeHelp: d('Введите help, чтобы увидеть список команд.', 'Type help to see the list of commands.'),
  helpFoot: d(
    'Стрелки ↑/↓ — история, Tab — дополнение. Есть и скрытые команды.',
    'Arrows Up/Down: history, Tab: completion. There are hidden commands too.',
  ),
  someNode: d('немного Node', 'some Node'),
  whoami: d(
    `Живу на Пхукете. ${EXPERIENCE.ru} в разработке. Люблю, когда в системе всё продумано до мелочей.`,
    `Based in Phuket. ${EXPERIENCE.en} in development. I like systems where every small thing is thought through.`,
  ),
  dirOf: d('Содержимое папки', 'Directory of'),
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
  passwords: d('Серьёзно? Напишите мне лучше в Telegram.', 'Seriously? Better message me on Telegram.'),
  noFile: d(
    'Не удаётся найти указанный файл. Попробуйте cat about.txt',
    'The system cannot find the file specified. Try cat about.txt',
  ),
  binDont: d('Корзина (не открывать)', 'Recycle Bin (do not open)'),
  host: d('Хост: монитор в изометрической комнате', 'Host: a monitor in an isometric room'),
  uptime: d(`Аптайм: ${EXPERIENCE.ru} в разработке`, `Uptime: ${EXPERIENCE.en} in development`),
  shell: d(`Оболочка: ${HEADLINE.join(' + ')}`, `Shell: ${HEADLINE.join(' + ')}`),
  cpu: d('Процессор: 1 × Fullstack-разработчик', 'CPU: 1 × Fullstack developer'),
  timeIs: d('Время: ', 'Time: '),
  formatUsage: d('Использование: format c:', 'Usage: format c:'),
  formatting: d('Форматирование диска C: (Andaman)…', 'Formatting drive C: (Andaman)...'),
  noRights: d('Недостаточно прав.', 'Insufficient privileges.'),
  credits: d('Режиссёр, сценарист, все роли — Даниил Иванов.', 'Directed, written and performed by Daniil Ivanov.'),
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
} as const;

/** What the commands need from the console window and the desktop. */
export interface TerminalHost {
  /** Prints the text line by line; 'cmd' marks an echoed command line. */
  print: (text: string, cls?: string) => void;
  /** Adds a line that is rewritten in place (the `format` progress bar) and returns its setter. */
  printLive: () => (text: string) => void;
  clear: () => void;
  lang: () => Lang;
  openApp: (id: string, params?: XPAppParams) => void;
  sound: (name: string) => void;
  status: () => Status;
  /** The time in Phuket. */
  now: () => { h: number; m: number; date: Date };
  close: () => void;
  setColors: (background: string, text: string) => void;
  /** Runs `fn` after a pause of animation time (the window shortens it when motion is reduced). */
  later: (ms: number, fn: () => void) => void;
  /** A command that keeps printing holds the input (true) and gives it back (false). */
  busy: (on: boolean) => void;
  matrix: () => void;
  random: () => number;
}

export interface Command {
  /** The argument shown by help. */
  a?: string;
  d?: Bilingual;
  hidden?: boolean;
  /** Returns true when the command keeps printing after it returns (it prints its own blank line). */
  run(args: string[], raw: string): boolean | undefined;
}

export function createTerminal(host: TerminalHost) {
  let cwd: string[] = [...HOME_DIR];
  const hist: string[] = [];
  /** The last line on the screen: null when it is empty, '' for a blank line. */
  let last: string | null = null;

  const t = (text: Bilingual | string | undefined): string => tr(text, host.lang());
  const print = (s: string, cls?: string): void => {
    host.print(s, cls);
    last = s.slice(s.lastIndexOf('\n') + 1);
  };
  const pt = (text: Bilingual): void => {
    print(t(text));
  };
  const clear = (): void => {
    host.clear();
    last = null;
  };
  const osLine = (): string => `${OS.version} — ${t(OS.edition)}`;
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
        print(`${OS.pcName.toLowerCase()}\\daniil`);
        print(`${t(PERSON.name)} — ${t(PERSON.role)} (${HEADLINE.join(' + ')}, ${t(T.someNode)})`);
        pt(T.whoami);
        return undefined;
      },
    },
    projects: {
      d: d('список проектов', 'list projects'),
      run: () => {
        print(` ${t(T.dirOf)} ${HOME_DIR.join('\\')}\\${t(APP.myProjects)}`);
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
          host.openApp('project', { id: proj.id });
          print(`${t(T.opening)}${t(proj.name)}...`);
          return undefined;
        }
        const id = APP_ALIASES[name];
        if (!id) {
          host.sound('error');
          print(t(fill(T.notApp, name)));
          return undefined;
        }
        if (id === 'terminal') {
          pt(T.alreadyHere);
          return undefined;
        }
        host.openApp(id);
        print(`${t(T.starting)}${id}.exe...`);
        return undefined;
      },
    },
    skills: {
      d: d('стек технологий', 'tech stack'),
      run: () => {
        for (const g of byArea()) print(`  ${`${g.id}        `.slice(0, 8)}  ${stackLine(g.id, host.lang())}`);
        return undefined;
      },
    },
    time: {
      d: d('время на Пхукете', 'time in Phuket'),
      run: () => {
        const p = host.now();
        const part = p.h < 6 ? T.night : p.h < 12 ? T.morning : p.h < 18 ? T.afternoon : T.evening;
        print(`${t(T.phuket)}${pad(p.h)}:${pad(p.m)}, ${t(part)}`);
        return undefined;
      },
    },
    status: {
      d: d('чем владелец занят сейчас', 'what the owner is doing now'),
      run: () => {
        const s = host.status();
        print(`STATUS: ${s.toUpperCase()} — ${t(OWNER_STATUS[s].label).toLowerCase()}. ${t(OWNER_STATUS[s].note)}`);
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
        clear();
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
        const p = host.now().date;
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
            `<DIR>  ${t(APP.myProjects)}`,
            `<DIR>  ${t(T.desktop)}`,
            '       about.txt',
            '       resume.rtf',
            '       README.txt',
          ])
            print(`  ${x}`);
        else if (cwd.length > 3) for (const p of PROJECTS) print(`  <DIR>  ${t(p.name)}`);
        else print(`  <DIR>  ${HOME_DIR[1]}`);
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
        const next = changeDir(cwd, a, t(APP.myProjects));
        if (!next) {
          pt(T.noPath);
          return undefined;
        }
        cwd = next;
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
          host.setColors(bg, fg);
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
        host.close();
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
        host.sound('error');
        pt(T.sudo1);
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
        host.busy(true);
        const steps = [
          'node_modules (1/∞)',
          'node_modules (2/∞)',
          'C:\\WINDOWS\\System32... ',
          `${HOME_DIR.join('\\')}\\${t(APP.myProjects)}...`,
        ];
        let i = 0;
        pt(T.deleting);
        const step = (): void => {
          const s = steps[i++];
          if (s !== undefined) {
            print(`  rm ${s}`);
            host.later(380, step);
            return;
          }
          host.sound('error');
          pt(T.accessDenied);
          pt(T.niceTry);
          print('');
          host.busy(false);
        };
        step();
        return true;
      },
    },
    matrix: {
      d: d('проснись, Нео', 'wake up, Neo'),
      run: () => {
        host.matrix();
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
        host.openApp('contact');
        return undefined;
      },
    },
    ping: {
      hidden: true,
      run: (args) => {
        const target = args[0] ?? 'donya.dev';
        print(`${t(T.pinging)}${target}:`);
        let n = 0;
        host.busy(true);
        const p = (): void => {
          if (n++ < 3) {
            const ms = /phuket|пхукет/i.test(target) ? t(T.tz) : `${String(7 + Math.floor(host.random() * 30))}ms`;
            print(`  ${t(T.replyFrom)}${target}: ${t(T.time)}=${ms} TTL=64`);
            host.later(400, p);
            return;
          }
          pt(T.pingNote);
          print('');
          host.busy(false);
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
          host.openApp('notepad');
          pt(T.readmeOpened);
          return undefined;
        }
        if (f === 'resume.rtf') return CMDS.cv?.run([], '');
        if (/пароли|passwords/.test(f)) {
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
        print(HOME_DIR.join('\\'));
        print(`├── ${t(APP.myProjects)}`);
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
        const p = host.now();
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
        host.openApp('bsod');
        return undefined;
      },
    },
    taskmgr: {
      hidden: true,
      run: () => {
        host.openApp('taskmgr');
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
        host.busy(true);
        let pc = 0;
        pt(T.formatting);
        const live = host.printLive();
        const step = (): void => {
          pc = Math.min(99, pc + 7 + Math.floor(host.random() * 9));
          last = progressBar(pc);
          live(last);
          if (pc < 99) {
            host.later(160, step);
            return;
          }
          host.sound('error');
          pt(T.noRights);
          print('');
          host.busy(false);
        };
        step();
        return true;
      },
    },
    credits: {
      hidden: true,
      run: () => {
        pt(T.credits);
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
      host.openApp('resume');
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
    const c = CMDS[name];
    if (!c) {
      if (APP_ALIASES[name]) {
        CMDS.open?.run([name], s);
        return;
      }
      host.sound('error');
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
    if (!busy && last !== null && last !== '') print('');
  }

  const commandNames = (): string[] => [
    ...Object.keys(CMDS).filter((k) => !CMDS[k]?.hidden),
    ...OPENABLE.filter((a) => !(a in CMDS)),
  ];
  const openTargets = (): string[] => [...OPENABLE, ...PROJECTS.map((p) => p.id)];

  /** Tab completion: the completed input, or null (with the error sound) when nothing matches. */
  function completeInput(value: string): string | null {
    const r = complete(value, commandNames(), openTargets());
    if (!r) {
      host.sound('error');
      return null;
    }
    if (r.list) {
      print(prompt(cwd) + value, 'cmd');
      print(`  ${r.list.join('  ')}`);
    }
    return r.value;
  }

  /** The lines a new console opens with. */
  function banner(): void {
    print(osLine());
    print(`(C) ${t(T.copyright)}`);
    print('');
    pt(T.typeHelp);
    print('');
  }

  return {
    exec,
    complete: completeInput,
    banner,
    print,
    clear,
    prompt: (): string => prompt(cwd),
    /** The commands typed so far, oldest first (the last 50). */
    history: hist as readonly string[],
    /** Every command by name, hidden ones and aliases included. */
    commands: CMDS as Readonly<Record<string, Command>>,
  };
}
