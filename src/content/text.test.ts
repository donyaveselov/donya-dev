import { describe, expect, it } from 'vitest';
import { counted, plural } from './text';

describe('bilingual text helpers', () => {
  it('picks the Russian plural form', () => {
    const f = (n: number): string => plural(n, 'объект', 'объекта', 'объектов');
    expect([1, 21, 101].map(f)).toEqual(['объект', 'объект', 'объект']);
    expect([2, 3, 4, 22, 104].map(f)).toEqual(['объекта', 'объекта', 'объекта', 'объекта', 'объекта']);
    expect([0, 5, 11, 12, 14, 20, 111].map(f)).toEqual(Array<string>(7).fill('объектов'));
  });
});

describe('counted nouns', () => {
  it('counts in both languages', () => {
    const f = (n: number) => counted(n, ['объект', 'объекта', 'объектов'], ['object', 'objects']);
    expect(f(1)).toEqual({ ru: '1 объект', en: '1 object' });
    expect(f(4)).toEqual({ ru: '4 объекта', en: '4 objects' });
    expect(f(15)).toEqual({ ru: '15 объектов', en: '15 objects' });
  });
});
