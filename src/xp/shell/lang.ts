// The desktop's language. Whatever shows text subscribes with onLang and repaints itself; desktop.ts subscribes the
// shell's own chrome on mount.
import type { Lang } from '../../shared/types';
import { S } from './state';

const listeners = new Set<(l: Lang) => void>();

/** Calls `fn` after every language change of a mounted desktop; returns the unsubscribe. */
export function onLang(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setLang(next: Lang): void {
  const l: Lang = next === 'en' ? 'en' : 'ru';
  if (l === S.lang) return;
  S.lang = l;
  if (!S.mounted) return;
  for (const fn of [...listeners]) {
    try {
      fn(l);
    } catch (e) {
      console.error(e);
    }
  }
}

/** A switch the visitor made on the desktop: the host hears about it (and switches the room too). */
export function changeLang(l: Lang): void {
  setLang(l);
  S.opts?.onLangChange?.(S.lang);
}
