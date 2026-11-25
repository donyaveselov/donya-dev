import { describe, expect, it } from 'vitest';
import { lineCol } from './notepad-text';

describe('notepad', () => {
  it('finds the line and column of the caret', () => {
    const text = 'ab\ncde\n\nf';
    expect(lineCol(text, 0)).toEqual([1, 1]);
    expect(lineCol(text, 2)).toEqual([1, 3]);
    expect(lineCol(text, 3)).toEqual([2, 1]);
    expect(lineCol(text, 6)).toEqual([2, 4]);
    expect(lineCol(text, 7)).toEqual([3, 1]);
    expect(lineCol(text, text.length)).toEqual([4, 2]);
    expect(lineCol('', 0)).toEqual([1, 1]);
    // a caret past the end counts as the end
    expect(lineCol('ab', 99)).toEqual([1, 3]);
  });
});
