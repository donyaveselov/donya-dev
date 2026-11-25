// The kit's registry of what a piece of UI must re-run and undo, without the DOM (unit-tested in kit-scope.test.ts).
// A scope holds bindings (functions re-run on a language switch) and cleanups (timers, listeners). A part of a window
// that is rebuilt (a page, a list, a tab) gets a child scope and disposes it before each rebuild, so the bindings and
// cleanups of the nodes it throws away go with them.

export interface Scope {
  /** Runs `fn` now and again on every refresh. */
  bind: (fn: () => void) => void;
  /** Runs `fn` once, when the scope is disposed. */
  onCleanup: (fn: () => void) => void;
  /** A timeout that dies with the scope; returns its cancel. */
  later: (ms: number, fn: () => void) => () => void;
  /** An interval that dies with the scope; returns its stop. */
  every: (ms: number, fn: () => void) => () => void;
  /** Re-runs the bindings (this scope's, then its children's), each once. */
  refresh: () => void;
  /** A scope that is refreshed and disposed with this one. */
  child: () => Scope;
  /** Runs the cleanups and forgets the bindings, here and in the children. The scope stays usable. */
  dispose: () => void;
  /** How much the scope holds, children included. */
  count: () => { bindings: number; cleanups: number };
}

interface Binding {
  fn: () => void;
  /** The refresh pass it was made in: a binding made during a pass has just run and is not run again in it. */
  born: number;
}

function make(clock: { pass: number; depth: number }, report: (e: unknown) => void): Scope {
  let bindings: Binding[] = [];
  const cleanups = new Set<() => void>();
  const children: Scope[] = [];

  const run = (fn: () => void): void => {
    try {
      fn();
    } catch (e) {
      report(e);
    }
  };
  /** Registers a cleanup that also removes itself once it has run or is no longer needed. */
  const once = (undo: () => void): (() => void) => {
    const off = (): void => {
      cleanups.delete(off);
      undo();
    };
    cleanups.add(off);
    return off;
  };

  return {
    bind(fn) {
      fn();
      bindings.push({ fn, born: clock.pass });
    },
    onCleanup(fn) {
      cleanups.add(fn);
    },
    later(ms, fn) {
      const id = setTimeout(() => {
        cleanups.delete(off);
        fn();
      }, ms);
      const off = once(() => {
        clearTimeout(id);
      });
      return off;
    },
    every(ms, fn) {
      const id = setInterval(fn, ms);
      return once(() => {
        clearInterval(id);
      });
    },
    refresh() {
      // the outermost refresh starts a pass; bindings made while it runs (by a binding that rebuilds) are skipped
      if (clock.depth++ === 0) clock.pass++;
      const mine = bindings;
      for (const b of [...mine]) {
        // a binding dropped by a rebuild during this pass belongs to nodes that are gone
        if (bindings !== mine) break;
        if (b.born < clock.pass) run(b.fn);
      }
      for (const c of [...children]) c.refresh();
      clock.depth--;
    },
    child() {
      const c = make(clock, report);
      children.push(c);
      return c;
    },
    dispose() {
      for (const c of children) c.dispose();
      for (const f of [...cleanups]) run(f);
      cleanups.clear();
      bindings = [];
    },
    count() {
      const out = { bindings: bindings.length, cleanups: cleanups.size };
      for (const c of children) {
        const n = c.count();
        out.bindings += n.bindings;
        out.cleanups += n.cleanups;
      }
      return out;
    },
  };
}

/** A root scope; `report` gets what a binding or a cleanup throws. */
export function createScope(report: (e: unknown) => void = () => undefined): Scope {
  return make({ pass: 0, depth: 0 }, report);
}
