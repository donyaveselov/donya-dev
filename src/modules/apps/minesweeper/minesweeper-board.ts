// Minesweeper's rules, without any DOM: mines are placed on the first reveal (never on or next to it), empty cells
// flood-open, a number whose flags are all placed opens its neighbours (chording), flags cycle through "?" when marks
// are on. Unit-tested in minesweeper.test.ts.

/** 0: none, 1: flag, 2: question mark. */
export type Mark = 0 | 1 | 2;

export class Board {
  readonly mine: boolean[];
  readonly open: boolean[];
  readonly flag: Mark[];
  /** Mines around each cell. */
  readonly n: number[];
  placed = false;
  over = false;
  won = false;
  opened = 0;
  /** The mine that went off. */
  boom = -1;

  constructor(
    readonly rows: number,
    readonly cols: number,
    readonly mines: number,
  ) {
    const total = rows * cols;
    this.mine = new Array<boolean>(total).fill(false);
    this.open = new Array<boolean>(total).fill(false);
    this.flag = new Array<Mark>(total).fill(0);
    this.n = new Array<number>(total).fill(0);
  }

  get size(): number {
    return this.rows * this.cols;
  }

  neighbors(i: number): number[] {
    const r = Math.floor(i / this.cols);
    const c = i % this.cols;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) out.push(rr * this.cols + cc);
      }
    return out;
  }

  /** Lays the mines anywhere but on `safe` and around it (a partial Fisher–Yates shuffle of the allowed cells). */
  place(safe: number, rnd: () => number = Math.random): void {
    const banned = new Set([safe, ...this.neighbors(safe)]);
    const cand: number[] = [];
    for (let i = 0; i < this.size; i++) if (!banned.has(i)) cand.push(i);
    for (let k = 0; k < this.mines; k++) {
      const p = k + Math.floor(rnd() * (cand.length - k));
      const a = cand[k] ?? 0;
      const b = cand[p] ?? 0;
      cand[k] = b;
      cand[p] = a;
      this.mine[b] = true;
    }
    for (let j = 0; j < this.size; j++) this.n[j] = this.neighbors(j).filter((q) => this.mine[q]).length;
    this.placed = true;
  }

  /**
   * Opens a cell (placing the mines first if needed). Returns the cells that opened, in order, or 'boom' when it was
   * a mine; [] when nothing could open.
   */
  reveal(i: number, rnd?: () => number): number[] | 'boom' {
    if (this.over || this.open[i] || this.flag[i] === 1) return [];
    if (!this.placed) this.place(i, rnd);
    if (this.mine[i]) {
      this.open[i] = true;
      this.boom = i;
      this.over = true;
      return 'boom';
    }
    const opened: number[] = [];
    const stack = [i];
    for (let k = stack.pop(); k !== undefined; k = stack.pop()) {
      if (this.open[k] || this.flag[k] === 1) continue;
      this.open[k] = true;
      this.opened++;
      if (this.flag[k]) this.flag[k] = 0;
      opened.push(k);
      if (this.n[k] === 0) for (const q of this.neighbors(k)) if (!this.open[q] && !this.mine[q]) stack.push(q);
    }
    return opened;
  }

  /** The neighbours a click on an open number would reveal: none unless exactly its count of flags is placed. */
  chordTargets(i: number): number[] {
    if (this.over || !this.open[i] || !this.n[i]) return [];
    const nb = this.neighbors(i);
    if (nb.filter((q) => this.flag[q] === 1).length !== this.n[i]) return [];
    return nb.filter((q) => !this.open[q] && this.flag[q] !== 1);
  }

  /** none → flag → ? (with marks) → none. Returns false when the cell cannot be marked. */
  cycleFlag(i: number, marks: boolean): boolean {
    if (this.over || this.open[i]) return false;
    this.flag[i] = this.flag[i] === 0 ? 1 : this.flag[i] === 1 && marks ? 2 : 0;
    return true;
  }

  get flags(): number {
    return this.flag.filter((f) => f === 1).length;
  }

  /** Every safe cell is open: the game is won, and every mine gets its flag. */
  checkWin(): boolean {
    if (this.opened !== this.size - this.mines || this.over) return false;
    this.over = true;
    this.won = true;
    for (let i = 0; i < this.size; i++) if (this.mine[i]) this.flag[i] = 1;
    return true;
  }
}

/** The three digits of an LED counter: -99..999. */
export const ledDigits = (n: number): string =>
  n < 0 ? `-${String(Math.min(99, -n)).padStart(2, '0')}` : String(Math.min(999, n)).padStart(3, '0');
