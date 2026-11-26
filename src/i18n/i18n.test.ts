import { describe, expect, it } from 'vitest';
import { initialLang, pick, startLang } from './i18n';

describe('i18n', () => {
  it('picks by language', () => {
    expect(pick({ ru: 'Резюме', en: 'Resume' }, 'en')).toBe('Resume');
    expect(pick({ ru: 'Резюме', en: 'Resume' }, 'ru')).toBe('Резюме');
  });
  it('starts from the saved language, then the browser', () => {
    expect(initialLang('en', 'ru-RU')).toBe('en');
    expect(initialLang(null, 'ru-RU')).toBe('ru');
    expect(initialLang('xx', 'de-DE')).toBe('en');
    expect(initialLang(null, undefined)).toBe('en');
  });
  it('opens a Russian address in Russian, an English one by the saved choice or the browser', () => {
    expect(startLang('ru', 'en', 'en-US')).toBe('ru'); // the URL wins
    expect(startLang('en', 'ru', 'en-US')).toBe('ru'); // a saved choice of Russian switches
    expect(startLang('en', null, 'ru-RU')).toBe('ru'); // and so does a Russian browser
    expect(startLang('en', 'en', 'ru-RU')).toBe('en');
    expect(startLang('en', null, 'en-US')).toBe('en');
    expect(startLang('en', null, undefined)).toBe('en'); // a crawler
  });
});
