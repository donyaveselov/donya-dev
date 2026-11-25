// Notepad's text arithmetic, without the DOM (unit-tested in notepad.test.ts).

/** Line and column (1-based) of a caret offset. */
export function lineCol(text: string, caret: number): [number, number] {
  const before = text.slice(0, caret).split('\n');
  return [before.length, (before[before.length - 1] ?? '').length + 1];
}
