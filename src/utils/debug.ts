// Debug mode: the room's debug panel and the window handles the regression harness drives (window.__psx,
// window.XPDesktop). Visitors never get it: it is on only with ?debug in the address (the router keeps the query
// when it changes the path).

export function debugWanted(): boolean {
  return /[?&]debug\b/.test(location.search);
}
