import { describe, expect, it } from 'vitest';
import { d, plural } from './text';

describe('bilingual text helpers', () => {
  it('pairs the two languages', () => {
    expect(d('да', 'yes')).toEqual({ ru: 'да', en: 'yes' });
  });
  it('picks the Russian plural form', () => {
    const f = (n: number): string => plural(n, 'объект', 'объекта', 'объектов');
    expect([1, 21, 101].map(f)).toEqual(['объект', 'объект', 'объект']);
    expect([2, 3, 4, 22, 104].map(f)).toEqual(['объекта', 'объекта', 'объекта', 'объекта', 'объекта']);
    expect([0, 5, 11, 12, 14, 20, 111].map(f)).toEqual(Array<string>(7).fill('объектов'));
  });
});
