import { describe, expect, it } from 'vitest';
import { Board, ledDigits } from './minesweeper-board';

/** A board with mines exactly where given (row, col). */
function rigged(rows: number, cols: number, mines: [number, number][]): Board {
  const b = new Board(rows, cols, mines.length);
  for (const [r, c] of mines) b.mine[r * cols + c] = true;
  for (let i = 0; i < b.size; i++) b.n[i] = b.neighbors(i).filter((q) => b.mine[q]).length;
  b.placed = true;
  return b;
}

describe('minesweeper board', () => {
  it('knows its neighbours, also at the edges', () => {
    const b = new Board(3, 3, 1);
    expect(b.neighbors(4).sort()).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
    expect(b.neighbors(0).sort()).toEqual([1, 3, 4]);
    expect(b.neighbors(8).sort()).toEqual([4, 5, 7]);
  });

  it('never puts a mine under the first click or next to it', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = seed;
      const rnd = (): number => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
      const b = new Board(9, 9, 10);
      b.place(40, rnd);
      expect(b.mine.filter(Boolean)).toHaveLength(10);
      for (const i of [40, ...b.neighbors(40)]) expect(b.mine[i]).toBe(false);
      expect(b.n[40]).toBe(0);
    }
  });

  it('flood-opens empty cells up to the numbers', () => {
    const b = rigged(3, 4, [[0, 3]]);
    const opened = b.reveal(8);
    expect(opened).not.toBe('boom');
    expect(b.opened).toBe(11);
    expect(b.open[3]).toBe(false);
    expect(b.checkWin()).toBe(true);
    expect(b.won).toBe(true);
    expect(b.flag[3]).toBe(1);
  });

  it('goes off on a mine', () => {
    const b = rigged(2, 2, [[0, 0]]);
    expect(b.reveal(0)).toBe('boom');
    expect(b.over).toBe(true);
    expect(b.boom).toBe(0);
    expect(b.reveal(3)).toEqual([]);
  });

  it('cycles flags through the question mark only with marks on', () => {
    const b = rigged(2, 2, [[0, 0]]);
    b.cycleFlag(1, true);
    expect(b.flag[1]).toBe(1);
    b.cycleFlag(1, true);
    expect(b.flag[1]).toBe(2);
    b.cycleFlag(1, true);
    expect(b.flag[1]).toBe(0);
    b.cycleFlag(1, false);
    b.cycleFlag(1, false);
    expect(b.flag[1]).toBe(0);
    expect(b.reveal(2)).toEqual([2]);
    expect(b.cycleFlag(2, true)).toBe(false);
  });

  it('chords only when the flags around a number match it', () => {
    const b = rigged(3, 3, [[0, 0]]);
    b.reveal(4);
    expect(b.chordTargets(4)).toEqual([]);
    b.cycleFlag(0, true);
    expect(b.chordTargets(4).sort()).toEqual([1, 2, 3, 5, 6, 7, 8]);
    expect(b.flags).toBe(1);
  });

  it('shows the LED counters', () => {
    expect(ledDigits(10)).toBe('010');
    expect(ledDigits(1234)).toBe('999');
    expect(ledDigits(-3)).toBe('-03');
    expect(ledDigits(-150)).toBe('-99');
  });
});
