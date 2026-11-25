// Command Prompt's line handling, without the DOM (unit-tested in terminal.test.ts).

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

/** The owner's home folder, where the console starts (the same C:\Users\Daniil the Projects folder lives in). */
export const HOME_DIR: readonly [string, string, string] = ['C:', 'Users', 'Daniil'];

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
  const next = HOME_DIR[cwd.length];
  if (next?.toLowerCase() === a.toLowerCase()) return [...cwd, next];
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
