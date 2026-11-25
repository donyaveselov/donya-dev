// The address bar: which route the page is on (the table in src/modules/room/routes.ts), and going to another with the
// history API, so Back and Forward work.
import { DEFAULT_ROUTE, ROUTES } from '../modules/room/routes';
import type { Route, RouteName } from '../modules/room/routes';

const isRoute = (name: string): name is RouteName => Object.hasOwn(ROUTES, name);

/** The route name in a path: its first folder (/resume, and /resume/ as the host serves the folder). index.html's sky
 *  script has a copy. */
export const routeName = (path: string): string => path.split('/')[1] ?? '';

/** What a route name opens; an unknown one is the plain room. */
export const routeOf = (name: string): Route => (isRoute(name) ? { ...DEFAULT_ROUTE, ...ROUTES[name] } : DEFAULT_ROUTE);

export const currentRoute = (): Route => routeOf(routeName(location.pathname));

/** Goes to a route ('' is the plain room) as a new history entry. */
export function go(name: RouteName | ''): void {
  if (routeName(location.pathname) !== name) history.pushState(null, '', `/${name}${location.search}`);
}

/** /resume/ (how the host serves the folder) or an unknown path becomes the one address (/resume, /), in place. */
export function tidyAddress(): void {
  const name = routeName(location.pathname);
  const url = `/${isRoute(name) ? name : ''}${location.search}`;
  if (url !== location.pathname + location.search || location.hash) history.replaceState(null, '', url);
}

/** Calls back with the new route when Back or Forward changes the address. */
export function onRouteChange(cb: (route: Route) => void): void {
  window.addEventListener('popstate', () => {
    tidyAddress();
    cb(currentRoute());
  });
}
