import { describe, expect, it } from 'vitest';
import { barePath, counterpartPath, counterpartUrl, langOfPath, pagePath } from './lang-url';

describe('the language in the address', () => {
  it('is Russian under /ru, English everywhere else', () => {
    for (const p of ['/ru', '/ru/', '/ru/resume', '/ru/resume/', '/ru/index.html']) expect(langOfPath(p), p).toBe('ru');
    for (const p of ['/', '/resume', '/resume/', '/index.html', '/rus', '/run/', '/a/ru/'])
      expect(langOfPath(p), p).toBe('en');
  });
  it('comes off the path', () => {
    expect(barePath('/ru')).toBe('/');
    expect(barePath('/ru/')).toBe('/');
    expect(barePath('/ru/resume/')).toBe('/resume/');
    expect(barePath('/resume')).toBe('/resume');
  });
});

describe('the counterpart address', () => {
  it('is the same page in the other language', () => {
    expect(counterpartPath('/', 'ru')).toBe('/ru/');
    expect(counterpartPath('/ru/', 'en')).toBe('/');
    expect(counterpartPath('/ru', 'en')).toBe('/');
    expect(counterpartPath('/resume/', 'ru')).toBe('/ru/resume/');
    expect(counterpartPath('/ru/resume/', 'en')).toBe('/resume/');
    expect(counterpartPath('/resume', 'ru')).toBe('/ru/resume');
    expect(counterpartPath('/ru/resume', 'en')).toBe('/resume');
  });
  it('is the same address in its own language', () => {
    expect(counterpartPath('/ru/pc', 'ru')).toBe('/ru/pc');
    expect(counterpartPath('/pc', 'en')).toBe('/pc');
  });
  it('keeps the query and the hash', () => {
    expect(counterpartUrl({ pathname: '/resume', search: '?debug', hash: '#top' }, 'ru')).toBe('/ru/resume?debug#top');
    expect(counterpartUrl({ pathname: '/ru/', search: '?utm_source=x', hash: '' }, 'en')).toBe('/?utm_source=x');
  });
});

describe('a page path', () => {
  it('is the folder the host serves', () => {
    expect(pagePath('', 'en')).toBe('/');
    expect(pagePath('', 'ru')).toBe('/ru/');
    expect(pagePath('resume', 'en')).toBe('/resume/');
    expect(pagePath('resume', 'ru')).toBe('/ru/resume/');
  });
});
