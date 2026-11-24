import { describe, expect, it } from 'vitest';
import { HOME, isOwnSite, normalize, searchHits } from './browser-url';

describe('navigator address bar', () => {
  it('normalizes what is typed', () => {
    expect(normalize('')).toBe(HOME);
    expect(normalize(undefined)).toBe(HOME);
    expect(normalize(' Старт ')).toBe(HOME);
    expect(normalize('ABOUT:Blank')).toBe('about:blank');
    expect(normalize('https://example.com/x')).toBe('https://example.com/x');
    expect(normalize('wax.donya.dev/a')).toBe('https://wax.donya.dev/a');
    expect(normalize('vue jobs')).toBe('about:search?q=vue%20jobs');
  });
  it('opens only my own sites inside', () => {
    expect(isOwnSite('https://donya.dev')).toBe(true);
    expect(isOwnSite('https://wax.donya.dev/?lang=ru')).toBe(true);
    expect(isOwnSite('http://donya.dev')).toBe(false);
    expect(isOwnSite('https://donya.dev.evil.com')).toBe(false);
  });
  it('searches apps by alias and projects by name and stack', () => {
    expect(searchHits('mines')).toEqual(['minesweeper']);
    expect(searchHits('django')).toEqual(['project:verifikat', 'project:kompy']);
    expect(searchHits('three.js')).toEqual(['project:wax']);
    expect(searchHits('')).toEqual([]);
  });
});
