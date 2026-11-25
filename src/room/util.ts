/** Narrows a value that cannot be missing here (an index inside the bounds, a node the model always has). */
export function must<T>(v: T | null | undefined, what = 'value'): T {
  if (v === null || v === undefined) throw new Error('missing ' + what);
  return v;
}

/** An element of the page's own markup (index.html), checked to be of the expected kind. */
export function byId(id: string): HTMLElement;
export function byId<T extends HTMLElement>(id: string, kind: new () => T): T;
export function byId(id: string, kind: new () => HTMLElement = HTMLElement): HTMLElement {
  const el = document.getElementById(id);
  if (!(el instanceof kind)) throw new Error(`#${id} is missing or not a ${kind.name}`);
  return el;
}
