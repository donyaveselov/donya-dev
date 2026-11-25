import { describe, expect, it } from 'vitest';
import type { Lang, Status } from '../../../types';
import { APP_IDS, CONTACTS, OS } from '../../../content/profile';
import { PROJECTS } from '../../../content/projects';
import { createTerminal } from './terminal-commands';

/** A console that keeps what was printed and done; timers run when flush() is called. */
function fake(lang: Lang = 'en', status: Status = 'work') {
  const lines: string[] = [];
  const cmds: string[] = [];
  const opened: [string, unknown][] = [];
  const sounds: string[] = [];
  const busy: boolean[] = [];
  const queue: (() => void)[] = [];
  const state = { closed: false, matrix: 0, colors: null as [string, string] | null };
  const term = createTerminal({
    print: (s, cls) => {
      for (const ln of s.split('\n')) (cls === 'cmd' ? cmds : lines).push(ln);
    },
    printLive: () => {
      const i = lines.push('') - 1;
      return (text) => {
        lines[i] = text;
      };
    },
    clear: () => {
      lines.length = 0;
      cmds.length = 0;
    },
    lang: () => lang,
    openApp: (id, params) => {
      opened.push([id, params]);
    },
    sound: (n) => {
      sounds.push(n);
    },
    status: () => status,
    now: () => ({ h: 9, m: 5, date: new Date(Date.UTC(2026, 10, 24, 9, 5)) }),
    close: () => {
      state.closed = true;
    },
    setColors: (bg, fg) => {
      state.colors = [bg, fg];
    },
    later: (_ms, fn) => {
      queue.push(fn);
    },
    busy: (on) => {
      busy.push(on);
    },
    matrix: () => {
      state.matrix++;
    },
    random: () => 0.5,
  });
  /** Runs a command and returns only what it printed. */
  const run = (line: string): string[] => {
    const from = lines.length;
    term.exec(line);
    return lines.slice(from);
  };
  const flush = (): void => {
    for (let fn = queue.shift(); fn; fn = queue.shift()) fn();
  };
  return { term, lines, cmds, opened, sounds, busy, state, run, flush };
}

describe('terminal commands', () => {
  it('opens with the system banner and a hint', () => {
    const c = fake();
    c.term.banner();
    expect(c.lines[0]).toContain(OS.version);
    expect(c.lines.at(-2)).toBe('Type help to see the list of commands.');
    expect(c.lines.at(-1)).toBe('');
  });

  it('echoes the command after the prompt and ends its output with a blank line', () => {
    const c = fake();
    expect(c.run('ver')).toEqual(['', `${OS.version} — Professional`, '']);
    expect(c.cmds).toEqual(['C:\\Users\\Daniil>ver']);
    // an empty line is echoed and nothing else happens
    expect(c.run('   ')).toEqual([]);
    expect(c.term.history).toEqual(['ver']);
  });

  it('lists the visible commands in help, and none of the hidden ones', () => {
    const c = fake();
    const out = c.run('help');
    const names = out.filter((l) => l.startsWith('  ')).map((l) => l.trim().split(/\s+/)[0]);
    expect(names).toEqual(expect.arrayContaining(['help', 'whoami', 'projects', 'open', 'skills', 'status', 'cls']));
    for (const hidden of ['sudo', 'rm', 'coffee', 'bsod', 'cv']) expect(names).not.toContain(hidden);
    for (const [name, cmd] of Object.entries(c.term.commands)) if (!cmd.hidden) expect(names).toContain(name);
    expect(out).toContain('  open <app>      open an app');
  });

  it('says who lives here, on this computer', () => {
    const out = fake().run('whoami');
    expect(out[0]).toBe(`${OS.pcName.toLowerCase()}\\daniil`);
    expect(out[1]).toContain('Daniil Ivanov — Fullstack developer (Vue 3 + Python / Django');
    expect(fake('ru').run('whoami')[1]).toContain('Даниил Иванов — Fullstack-разработчик');
  });

  it('lists the projects', () => {
    const out = fake().run('projects');
    expect(out[0]).toBe(' Directory of C:\\Users\\Daniil\\My Projects');
    for (const p of PROJECTS) expect(out.some((l) => l.includes(p.name.en) && l.includes(p.tagline.en))).toBe(true);
  });

  it('opens apps by alias, projects by id, and refuses the rest', () => {
    const c = fake();
    expect(c.run('open mines')).toEqual(['Starting minesweeper.exe...', '']);
    expect(c.run('open Paint.EXE')).toEqual(['Starting paint.exe...', '']);
    expect(c.run('open verifikat')).toEqual(['Opening Verifikat...', '']);
    expect(c.opened).toEqual([
      ['minesweeper', undefined],
      ['paint', undefined],
      ['project', { id: 'verifikat' }],
    ]);
    expect(c.run('open terminal')).toEqual(['You are already here.', '']);
    expect(c.run('open nothing')[0]).toContain("'nothing' is not recognized as an app");
    expect(c.sounds).toEqual(['error']);
    expect(c.run('open')[0]).toBe(`Open what? ${APP_IDS.join(', ')}`);
    expect(c.opened).toHaveLength(3);
  });

  it('runs an app typed as a command', () => {
    const c = fake();
    expect(c.run('calc')).toEqual(['Starting calc.exe...']);
    expect(c.opened).toEqual([['calc', undefined]]);
    expect(c.run('frobnicate')).toEqual([
      "'frobnicate' is not recognized as an internal or external command. Type help.",
    ]);
  });

  it('prints the stack, the time, the date and the contacts', () => {
    const c = fake();
    const skills = c.run('skills');
    expect(skills[0]).toMatch(/^ {2}frontend {2}Vue 3, /);
    expect(skills.some((l) => l.startsWith('  backend ') && l.includes('Django'))).toBe(true);
    expect(c.run('time')).toEqual(['Phuket (UTC+7): 09:05, morning', '']);
    expect(c.run('date')).toEqual(['2026-11-24', '']);
    const contacts = c.run('contact');
    for (const x of CONTACTS) expect(contacts.some((l) => l.includes(x.value))).toBe(true);
  });

  it('tells what the owner is doing, from the shared status text', () => {
    expect(fake('en', 'sleep').run('status')[0]).toBe(
      'STATUS: SLEEP — asleep. Power saving. Will reply in the Phuket morning.',
    );
    expect(fake('ru', 'work').run('status')[0]).toMatch(/^STATUS: WORK — работает\. /);
  });

  it('walks the folders', () => {
    const c = fake();
    expect(c.run('cd')).toEqual(['C:\\Users\\Daniil', '']);
    expect(c.run('dir')[0]).toBe(' Directory of C:\\Users\\Daniil');
    // a silent command still gets its blank line after the echoed prompt
    expect(c.run('cd projects')).toEqual(['']);
    expect(c.term.prompt()).toBe('C:\\Users\\Daniil\\My Projects>');
    expect(c.run('ls').slice(2, -1)).toEqual(PROJECTS.map((p) => `  <DIR>  ${p.name.en}`));
    expect(c.run('cd nowhere')).toEqual(['The system cannot find the path specified.', '']);
    c.run('cd \\');
    expect(c.term.prompt()).toBe('C:\\>');
    expect(c.run('dir')).toContain('  <DIR>  Users');
  });

  it('echoes, keeps history and clears the screen', () => {
    const c = fake();
    expect(c.run('echo  hello   there')).toEqual([' hello   there', '']);
    expect(c.run('echo')).toEqual(['ECHO is on.', '']);
    expect(c.run('history')).toEqual(['  1  echo  hello   there', '  2  echo', '  3  history', '']);
    c.term.exec('clear');
    expect(c.lines).toEqual([]);
    expect(c.cmds).toEqual([]);
  });

  it('keeps the last 50 commands', () => {
    const c = fake();
    for (let i = 0; i < 60; i++) c.term.exec(`echo ${String(i)}`);
    expect(c.term.history).toHaveLength(50);
    expect(c.term.history[0]).toBe('echo 10');
  });

  it('sets the console colours', () => {
    const c = fake();
    expect(c.run('color 0a')).toEqual(['']);
    expect(c.state.colors).toEqual(['#000', '#00ff00']);
    expect(c.run('color zz')).toEqual(['Usage: color 0a (background, text)', '']);
    expect(c.run('color 11')[0]).toContain('Same background and text?');
  });

  it('shows files: about.txt is whoami, the others open their programs', () => {
    const c = fake();
    expect(c.run('cat about.txt')[0]).toBe(`${OS.pcName.toLowerCase()}\\daniil`);
    expect(c.run('cat README.txt')).toEqual(['README.txt opened in Notepad.', '']);
    expect(c.run('cat resume.rtf')).toEqual(['Opening the resume...', '']);
    expect(c.opened.map(([id]) => id)).toEqual(['notepad', 'resume']);
    expect(c.run('cat nothing.txt')[0]).toContain('cannot find the file');
  });

  it('draws the project tree and the system info', () => {
    const c = fake();
    const tree = c.run('tree');
    expect(tree[0]).toBe('C:\\Users\\Daniil');
    expect(tree.filter((l) => /^│ {3}[├└]── /.test(l))).toHaveLength(PROJECTS.length);
    const info = c.run('neofetch').join('\n');
    expect(info).toContain(`daniil@${OS.pcName}`);
    expect(info).toContain('Shell: Vue 3 + Python / Django');
    expect(info).toContain('Time: 09:05 (UTC+7)');
  });

  it('holds the input while a slow command prints, then gives it back', () => {
    const c = fake();
    expect(c.run('rm -rf /')).toEqual(['Deleting everything...', '  rm node_modules (1/∞)']);
    expect(c.busy).toEqual([true]);
    c.flush();
    expect(c.busy).toEqual([true, false]);
    expect(c.lines.at(-3)).toContain('Access denied.');
    expect(c.lines.at(-1)).toBe('');
    expect(c.run('rm file')).toEqual(['Nothing to delete here. Old projects are already in the Recycle Bin.', '']);
  });

  it('formats nothing, with a progress bar on one line', () => {
    const c = fake();
    expect(c.run('format')).toEqual(['Usage: format c:', '']);
    const from = c.lines.length;
    c.term.exec('format c:');
    c.flush();
    expect(c.lines.slice(from)).toEqual([
      'Formatting drive C: (Andaman)...',
      '[####################] 99%',
      'Insufficient privileges.',
      '',
    ]);
    expect(c.busy).toEqual([true, false]);
  });

  it('pings three times and admits it is simulated', () => {
    const c = fake();
    c.term.exec('ping');
    c.flush();
    expect(c.lines.filter((l) => l.includes('Reply from donya.dev: time=22ms'))).toHaveLength(3);
    expect(c.lines.at(-2)).toContain('Ping simulated');
  });

  it('reaches the desktop: resume, contacts, the matrix, exit', () => {
    const c = fake();
    c.term.exec('cv');
    c.term.exec('hire');
    c.term.exec('matrix');
    c.term.exec('taskmgr');
    c.term.exec('exit');
    expect(c.opened.map(([id]) => id)).toEqual(['resume', 'contact', 'taskmgr']);
    expect(c.state.matrix).toBe(1);
    expect(c.state.closed).toBe(true);
  });

  it('answers sudo like sudo', () => {
    const c = fake();
    expect(c.run('sudo rm')).toEqual(['daniil is not in the sudoers file. This incident will be reported.', '']);
    expect(c.sounds).toEqual(['error']);
    expect(c.run('sudo make me a sandwich')[0]).toContain('Recycle Bin');
  });

  it('completes commands, apps and projects with Tab', () => {
    const c = fake();
    expect(c.term.complete('who')).toBe('whoami');
    expect(c.term.complete('op')).toBe('open ');
    expect(c.term.complete('open ver')).toBe('open verifikat');
    expect(c.term.complete('mine')).toBe('minesweeper');
    expect(c.term.complete('zzz')).toBeNull();
    expect(c.sounds).toEqual(['error']);
    expect(c.term.complete('open p')).toBe('open p');
    expect(c.lines.at(-1)).toBe('  projects  paint');
    expect(c.cmds.at(-1)).toBe('C:\\Users\\Daniil>open p');
  });
});
