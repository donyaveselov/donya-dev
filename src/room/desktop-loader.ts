// The Windows XD desktop is a module of its own, loaded after the room is up (or at once when someone sits down
// first): the room does not wait for about a megabyte of shell, apps and icon bitmaps it needs only after a click.
import { setDesktop } from '../shared/desktop';

let loading: Promise<boolean> | null = null;

/** Loads the desktop once; true when it is there (src/shared/desktop.ts hands it out). */
export function loadDesktop(): Promise<boolean> {
  loading ??= import('../xp').then(
    (mod) => {
      setDesktop(mod);
      return true;
    },
    (e: unknown) => {
      console.error(e);
      loading = null; // a failed chunk (a flaky network) may be tried again on the next click
      return false;
    },
  );
  return loading;
}
