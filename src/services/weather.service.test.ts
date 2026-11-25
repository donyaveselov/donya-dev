import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchWeather,
  flashLevel,
  newWeather,
  overcast,
  rainAmount,
  restoreWeather,
  weatherKind,
  type WeatherKind,
} from './weather.service';

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

describe('lightning', () => {
  it('flashes twice, then fades out', () => {
    expect(flashLevel(0)).toBe(1);
    expect(flashLevel(0.1)).toBe(0.15);
    expect(flashLevel(0.2)).toBe(0.8);
    expect(flashLevel(0.36)).toBeCloseTo(0.4);
    expect(flashLevel(1)).toBe(0);
  });
});

describe('fetching the weather', () => {
  const store = new Map<string, string>();
  const reply = (body: unknown, ok = true): void => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok, json: () => Promise.resolve(body) }));
  };
  const setUp = (): void => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
  };
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('takes a reading, remembers it and tells the room', async () => {
    setUp();
    reply({ current: { weather_code: 63, precipitation: 2.4, temperature_2m: 27.5 } });
    const wx = newWeather();
    const changed = vi.fn();
    await fetchWeather(wx, changed);
    expect(wx).toMatchObject({ kind: 'rain', code: 63, precip: 2.4, temp: 27.5 });
    expect(wx.at).toBeGreaterThan(0);
    expect(changed).toHaveBeenCalledOnce();
    // a repeat visit starts with it
    const next = newWeather();
    restoreWeather(next, wx.at + 60e3);
    expect(next).toEqual(wx);
    // ... unless it is older than three hours
    const late = newWeather();
    restoreWeather(late, wx.at + 4 * 3600e3);
    expect(late).toEqual(newWeather());
  });

  it('leaves the weather alone and caches nothing when the request fails', async () => {
    const failures: (() => void)[] = [
      () => {
        reply({ error: true, reason: 'too many requests' }, false); // an error status
      },
      () => {
        reply({ error: true }); // 200, but no reading
      },
      () => {
        reply(null);
      },
      () => {
        vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
      },
      () => {
        vi.stubGlobal('fetch', () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError()) }));
      },
    ];
    for (const fail of failures) {
      setUp();
      fail();
      const wx = { ...newWeather(), kind: 'storm' as const, code: 95, precip: 4, temp: 26, at: 1234 };
      const before = { ...wx };
      const changed = vi.fn();
      await fetchWeather(wx, changed);
      expect(wx).toEqual(before);
      expect(changed).not.toHaveBeenCalled();
      expect(store.size).toBe(0);
    }
  });
});
