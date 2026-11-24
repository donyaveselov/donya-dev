import { describe, expect, it } from 'vitest';
import { initialLang, pick } from './i18n';

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
});
