import { describe, expect, it } from 'vitest';
import { experienceYears, yearsText } from './experience';

describe('years in development', () => {
  it('counts whole half-years from February 2022', () => {
    expect(experienceYears(new Date(2022, 1, 1))).toBe(0);
    expect(experienceYears(new Date(2026, 6, 31))).toBe(4);
    expect(experienceYears(new Date(2026, 7, 1))).toBe(4.5);
    expect(experienceYears(new Date(2026, 10, 24))).toBe(4.5);
    expect(experienceYears(new Date(2027, 0, 31))).toBe(4.5);
    expect(experienceYears(new Date(2027, 1, 1))).toBe(5);
    expect(experienceYears(new Date(2021, 0, 1))).toBe(0);
  });
  it('says it in both languages', () => {
    expect(yearsText(4.5)).toEqual({ ru: '4,5 года', en: '4.5 years' });
    expect(yearsText(5)).toEqual({ ru: '5 лет', en: '5 years' });
    expect(yearsText(1)).toEqual({ ru: '1 год', en: '1 year' });
    expect(yearsText(3)).toEqual({ ru: '3 года', en: '3 years' });
    expect(yearsText(11)).toEqual({ ru: '11 лет', en: '11 years' });
    expect(yearsText(21)).toEqual({ ru: '21 год', en: '21 years' });
    expect(yearsText(5.5)).toEqual({ ru: '5,5 года', en: '5.5 years' });
  });
});
