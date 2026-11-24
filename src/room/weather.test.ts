import { describe, expect, it } from 'vitest';
import { newWeather, overcast, rainAmount, weatherKind, type WeatherKind } from './weather';

describe('weatherKind', () => {
  it('maps WMO codes', () => {
    const cases: [number, WeatherKind][] = [
      [0, 'clear'],
      [1, 'cloud'],
      [3, 'cloud'],
      [45, 'cloud'],
      [48, 'cloud'],
      [51, 'drizzle'],
      [57, 'drizzle'],
      [61, 'rain'],
      [67, 'rain'],
      [71, 'clear'], // snow: not in Phuket
      [80, 'rain'],
      [82, 'rain'],
      [95, 'storm'],
      [99, 'storm'],
    ];
    for (const [code, kind] of cases) expect(weatherKind(code), String(code)).toBe(kind);
  });
});

describe('rain and overcast', () => {
  it('grows real rain with the precipitation, gives forced kinds a fixed amount', () => {
    const wx = { ...newWeather(), kind: 'rain' as const, precip: 0 };
    expect(rainAmount(wx)).toBeCloseTo(0.35);
    expect(rainAmount({ ...wx, precip: 3 })).toBe(1);
    expect(rainAmount({ ...wx, kind: 'storm' })).toBe(0.8);
    expect(rainAmount({ ...wx, forced: 'rain' })).toBe(0.6);
    expect(rainAmount({ ...wx, forced: 'storm' })).toBe(1);
    expect(rainAmount({ ...wx, forced: 'drizzle' })).toBe(0.25);
    expect(rainAmount({ ...wx, forced: 'cloud' })).toBe(0);
  });
  it('greys the sky by kind', () => {
    expect(overcast(newWeather())).toBe(0);
    expect(overcast({ ...newWeather(), forced: 'storm' })).toBe(1);
    expect(overcast({ ...newWeather(), kind: 'cloud' })).toBe(0.45);
  });
});
