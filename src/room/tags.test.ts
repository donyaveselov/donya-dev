import { describe, expect, it } from 'vitest';
import { windowText } from './tags';
import { newWeather } from './weather';

describe('the weather label', () => {
  it('says where I am without a reading', () => {
    expect(windowText('en', newWeather())).toBe('I’m in Phuket');
  });
  it('adds the weather and the temperature once a reading is in', () => {
    expect(windowText('en', { ...newWeather(), at: 1, kind: 'rain', temp: 29.6 })).toBe('I’m in Phuket · rain, 30°');
    expect(windowText('ru', { ...newWeather(), at: 1, kind: 'clear', temp: null })).toBe('Я на Пхукете · ясно');
  });
  it('shows a forced kind without a temperature', () => {
    expect(windowText('en', { ...newWeather(), forced: 'storm', temp: 31 })).toBe('I’m in Phuket · thunderstorm');
  });
});
