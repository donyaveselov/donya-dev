import { describe, expect, it } from 'vitest';
import { changeDir, commonPrefix, complete, parseColor, parseCommand, progressBar, prompt } from './terminal-parse';

describe('terminal parsing', () => {
  it('splits a line into a command and its arguments', () => {
    expect(parseCommand('  OPEN.exe   projects  now ')).toEqual({
      word: 'OPEN.exe',
      name: 'open',
      args: ['projects', 'now'],
    });
    expect(parseCommand('   ')).toBeNull();
  });

  it('shows a cmd prompt', () => {
    expect(prompt(['C:', 'Andaman', 'Daniil'])).toBe('C:\\Andaman\\Daniil>');
    expect(prompt(['C:'])).toBe('C:\\>');
  });

  it('changes folders the way cd does', () => {
    const home = ['C:', 'Andaman', 'Daniil'];
    expect(changeDir(home, '..', 'My Projects')).toEqual(['C:', 'Andaman']);
    expect(changeDir(['C:'], '..', 'My Projects')).toEqual(['C:']);
    expect(changeDir(home, '\\', 'My Projects')).toEqual(['C:']);
    expect(changeDir(home, 'my projects', 'Мои проекты')).toEqual([...home, 'Мои проекты']);
    expect(changeDir(['C:'], 'ANDAMAN', 'x')).toEqual(['C:', 'Andaman']);
    expect(changeDir(['C:', 'Andaman'], 'daniil', 'x')).toEqual(home);
    expect(changeDir(home, 'windows', 'x')).toBeNull();
  });

  it('parses console colours', () => {
    expect(parseColor('0a')).toEqual(['#000', '#00ff00']);
    expect(parseColor('E')).toEqual(['#000', '#ffff00']);
    expect(parseColor(undefined)).toEqual(['#000', '#c0c0c0']);
    expect(parseColor('77')).toBe('same');
    expect(parseColor('zz')).toBe('usage');
    expect(parseColor('123')).toBe('usage');
  });

  it('completes commands and open targets', () => {
    const cmds = ['help', 'open', 'whoami', 'cls', 'color', 'contact'];
    const targets = ['projects', 'paint', 'verifikat'];
    expect(complete('he', cmds, targets)).toEqual({ value: 'help' });
    expect(complete('op', cmds, targets)).toEqual({ value: 'open ' });
    expect(complete('c', cmds, targets)).toEqual({ value: 'c', list: ['cls', 'color', 'contact'] });
    expect(complete('co', cmds, targets)).toEqual({ value: 'co', list: ['color', 'contact'] });
    expect(complete('open p', cmds, targets)).toEqual({ value: 'open p', list: ['projects', 'paint'] });
    expect(complete('open ve', cmds, targets)).toEqual({ value: 'open verifikat' });
    expect(complete('xyz', cmds, targets)).toBeNull();
    expect(complete('echo hi', cmds, targets)).toEqual({ value: 'echo hi' });
    expect(commonPrefix(['color', 'colour', 'cold'])).toBe('col');
  });

  it('draws the format progress bar', () => {
    expect(progressBar(0)).toBe('[....................] 0%');
    expect(progressBar(50)).toBe('[##########..........] 50%');
    expect(progressBar(99)).toBe('[####################] 99%');
  });
});
