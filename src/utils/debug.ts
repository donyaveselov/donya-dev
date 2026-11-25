// Debug mode: the room's debug panel and the window handles the regression harness drives (window.__psx,
// window.XPDesktop). Visitors never get it: it is on only with ?debug in the address, or after /debug (#debug in the
// artifact build), which is remembered for the tab because the room's routes replace the address.

const DEBUG_KEY = 'donya-debug';

/** The address asks for debug mode: /debug (a page of its own, see PAGES in routes.ts) or the artifact's #debug. */
const askedFor = (): boolean => location.hash === '#debug' || /^\/debug\/?$/.test(location.pathname);

export function debugWanted(): boolean {
  if (/[?&]debug\b/.test(location.search)) return true;
  try {
    if (askedFor()) sessionStorage.setItem(DEBUG_KEY, '1');
    return sessionStorage.getItem(DEBUG_KEY) === '1';
  } catch {
    return askedFor(); // storage blocked (a sandboxed frame): the address alone
  }
}
