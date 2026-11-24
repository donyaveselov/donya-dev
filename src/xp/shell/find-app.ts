import type { XPAppDef } from '../../shared/types';

/** The app a Run box or terminal query names: an exact id, then an exact title, then an id or title prefix. */
export function findApp(query: string, apps: readonly XPAppDef[]): string | null {
  const q0 = query
    .trim()
    .toLowerCase()
    .replace(/\.exe$/, '');
  if (!q0) return null;
  const titles = (a: XPAppDef): string[] => [a.title.ru.toLowerCase(), a.title.en.toLowerCase()];
  const hit =
    apps.find((a) => a.id.toLowerCase() === q0) ??
    apps.find((a) => titles(a).includes(q0)) ??
    apps.find((a) => a.id.toLowerCase().startsWith(q0) || titles(a).some((t) => t.startsWith(q0)));
  return hit?.id ?? null;
}
