// Debug mode: the room's debug panel and the window handles the regression harness drives (window.__psx,
// window.XPDesktop). Visitors never get it: it is on only with ?debug in the address, or after #debug, which is
// remembered for the tab because the room's hash routes replace the hash.

const DEBUG_KEY = 'donya-debug';

export function debugWanted(): boolean {
  if (/[?&]debug\b/.test(location.search)) return true;
  try {
    if (location.hash === '#debug') sessionStorage.setItem(DEBUG_KEY, '1');
    return sessionStorage.getItem(DEBUG_KEY) === '1';
  } catch {
    return location.hash === '#debug'; // storage blocked (a sandboxed frame): the hash alone
  }
}
