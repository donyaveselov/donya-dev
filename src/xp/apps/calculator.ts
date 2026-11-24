// The Calculator's state machine, as XP's calc.exe in standard mode (unit-tested in calculator.test.ts).

export interface CalcMessages {
  divZero: string;
  invalid: string;
  ieee: string;
}

type Op = '+' | '-' | '*' | '/';
const isOp = (k: string): k is Op => k === '+' || k === '-' || k === '*' || k === '/';

function apply(a: number, b: number, o: Op): number {
  return o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : a / b;
}

export class Calculator {
  /** The display text (an error message after an error). */
  cur = '0';
  acc: number | null = null;
  op: Op | null = null;
  /** The next digit starts a new number. */
  fresh = true;
  mem = 0;
  err = false;
  /** A note under the display. */
  hint = '';

  constructor(private readonly msg: () => CalcMessages) {}

  private fmt(n: number): string {
    if (!Number.isFinite(n)) {
      this.err = true;
      return this.msg().divZero;
    }
    let s = String(n);
    if (s.length > 20) s = String(+n.toPrecision(14));
    if (s.length > 20) s = n.toExponential(9);
    return s;
  }

  /** What the display shows: whole numbers with a trailing point, as the original did. */
  display(): string {
    return this.err ? this.cur : !this.cur.includes('.') && !this.cur.includes('e') ? `${this.cur}.` : this.cur;
  }

  /** A key: 0-9 . + - * / = C CE BS +/- sqrt % 1/x MC MR MS M+. Returns true when the result is 42. */
  press(k: string): boolean {
    if (this.err && k !== 'C') return false;
    if (/^[0-9]$/.test(k)) {
      if (this.fresh || this.cur === '0') {
        this.cur = k;
        this.fresh = false;
      } else if (this.cur.replace(/[-.]/g, '').length < 16) this.cur += k;
    } else if (k === '.') {
      if (this.fresh) {
        this.cur = '0.';
        this.fresh = false;
      } else if (!this.cur.includes('.')) this.cur += '.';
    } else if (k === 'C') {
      this.cur = '0';
      this.acc = null;
      this.op = null;
      this.fresh = true;
      this.err = false;
    } else if (k === 'CE') {
      this.cur = '0';
      this.fresh = true;
    } else if (k === 'BS') {
      if (!this.fresh) {
        this.cur = this.cur.length > 1 ? this.cur.slice(0, -1) : '0';
        if (this.cur === '-') this.cur = '0';
      }
    } else if (k === '+/-') {
      if (this.cur !== '0') this.cur = this.cur.startsWith('-') ? this.cur.slice(1) : `-${this.cur}`;
    } else if (k === 'sqrt') {
      const v = +this.cur;
      if (v < 0) {
        this.err = true;
        this.cur = this.msg().invalid;
      } else this.cur = this.fmt(Math.sqrt(v));
      this.fresh = true;
    } else if (k === '%') {
      this.cur = this.fmt(((this.acc ?? 0) * +this.cur) / 100);
      this.fresh = true;
    } else if (k === '1/x') {
      this.cur = this.fmt(1 / +this.cur);
      this.fresh = true;
    } else if (isOp(k)) {
      if (this.op && !this.fresh) this.cur = this.fmt(apply(this.acc ?? 0, +this.cur, this.op));
      this.acc = +this.cur;
      this.op = k;
      this.fresh = true;
    } else if (k === '=') {
      if (!this.op) return false;
      this.cur = this.fmt(apply(this.acc ?? 0, +this.cur, this.op));
      this.acc = null;
      this.op = null;
      this.fresh = true;
      this.hint = this.cur === '0.30000000000000004' ? this.msg().ieee : '';
      return this.cur === '42';
    } else if (k === 'MC') this.mem = 0;
    else if (k === 'MR') {
      this.cur = this.fmt(this.mem);
      this.fresh = true;
    } else if (k === 'MS') this.mem = +this.cur;
    else if (k === 'M+') this.mem += +this.cur;
    return false;
  }
}
