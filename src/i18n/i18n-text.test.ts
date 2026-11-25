import { describe, expect, it } from 'vitest';
import { fill, format, isBilingual, tr } from './i18n';

describe('bilingual text', () => {
  it('tells bilingual text from the rest', () => {
    expect(isBilingual({ ru: 'а', en: 'a' })).toBe(true);
    expect(isBilingual('a')).toBe(false);
    expect(isBilingual(['ru', 'en'])).toBe(false);
    expect(isBilingual(null)).toBe(false);
  });
  it('resolves text for a language', () => {
    expect(tr({ ru: 'Да', en: 'Yes' }, 'ru')).toBe('Да');
    expect(tr('plain', 'en')).toBe('plain');
    expect(tr(undefined, 'en')).toBe('');
  });
  it('fills %s', () => {
    expect(format('Volume: %s', '80%')).toBe('Volume: 80%');
    expect(format('CPU %s%', 7)).toBe('CPU 7%');
    expect(format('no arg %s')).toBe('no arg %s');
    expect(fill({ ru: 'Открыть %s', en: 'Open %s' }, 'x')).toEqual({ ru: 'Открыть x', en: 'Open x' });
  });
});
