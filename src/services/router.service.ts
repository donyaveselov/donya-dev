// The address bar: which route the page is on (the table in src/modules/room/routes.ts), and going to another with the
// history API, so Back and Forward work. The single-file artifact build is not at a site's root and keeps the route in
// the hash (#resume) instead.
import { DEFAULT_ROUTE, ROUTES } from '../modules/room/routes';
import type { Route, RouteName } from '../modules/room/routes';

const isRoute = (name: string): name is RouteName => Object.hasOwn(ROUTES, name);

/** The route name in an address: an old link's hash (#resume) first, else the path's first folder (/resume, /resume/).
 *  index.html's sky script has a copy. */
export const routeName = (path: string, hash: string): string => hash.slice(1) || (path.split('/')[1] ?? '');

/** What a route name opens; an unknown one is the plain room. */
export const routeOf = (name: string): Route => (isRoute(name) ? { ...DEFAULT_ROUTE, ...ROUTES[name] } : DEFAULT_ROUTE);

const currentName = (): string =>
  __HASH_ROUTES__ ? location.hash.slice(1) : routeName(location.pathname, location.hash);

export const currentRoute = (): Route => routeOf(currentName());

/** Goes to a route ('' is the plain room) as a new history entry. */
export function go(name: RouteName | ''): void {
  if (currentName() === name) return;
  if (__HASH_ROUTES__) location.hash = name;
  else history.pushState(null, '', `/${name}${location.search}`);
}

/** An old link (/#resume) or a folder (/resume/, /index.html) becomes the one address (/resume, /), in place. */
export function tidyAddress(): void {
  if (__HASH_ROUTES__) return;
  const name = currentName();
  const url = `/${isRoute(name) ? name : ''}${location.search}`;
  if (url !== location.pathname + location.search || location.hash) history.replaceState(null, '', url);
}

/** Calls back with the new route when Back or Forward (or a typed #route) changes the address. */
export function onRouteChange(cb: (route: Route) => void): void {
  window.addEventListener(__HASH_ROUTES__ ? 'hashchange' : 'popstate', () => {
    tidyAddress();
    cb(currentRoute());
  });
}
