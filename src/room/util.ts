/** Narrows a value that cannot be missing here (an index inside the bounds, a node the model always has). */
export function must<T>(v: T | null | undefined, what = 'value'): T {
  if (v === null || v === undefined) throw new Error('missing ' + what);
  return v;
}

/** An element of the page's own markup (index.html). */
export function byId(id: string): HTMLElement {
  return must(document.getElementById(id), '#' + id);
}
