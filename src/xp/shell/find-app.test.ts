import { describe, expect, it } from 'vitest';
import type { XPAppDef } from '../../shared/types';
import { findApp } from './find-app';

const app = (id: string, ru: string, en: string): XPAppDef => ({ id, title: { ru, en }, render: () => undefined });
const apps = [
  app('projects', 'Мои проекты', 'My Projects'),
  app('minesweeper', 'Сапёр', 'Minesweeper'),
  app('paint', 'Кисть', 'Paint'),
];

describe('Run: finding an app by name', () => {
  it('prefers an exact id, then an exact title, then a prefix', () => {
    expect(findApp('paint', apps)).toBe('paint');
    expect(findApp('MINESWEEPER.EXE', apps)).toBe('minesweeper');
    expect(findApp('сапёр', apps)).toBe('minesweeper');
    expect(findApp('my projects', apps)).toBe('projects');
    expect(findApp('mine', apps)).toBe('minesweeper');
    expect(findApp('кис', apps)).toBe('paint');
  });
  it('finds nothing for an empty or unknown name', () => {
    expect(findApp('  ', apps)).toBeNull();
    expect(findApp('notepad', apps)).toBeNull();
  });
});
