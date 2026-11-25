// The transient pop-ups (context menus, the Start menu, the volume slider) register how to close themselves here, so
// that the layers below them (the window manager, the session screens, the desktop icons) can dismiss them without
// importing them (unit-tested in popups.test.ts). desktop.ts registers them on mount.

export type Popup = 'menus' | 'start' | 'volume';

const closers = new Map<Popup, () => void>();

/** Registers a pop-up's "close"; returns the unregister. */
export function registerPopup(kind: Popup, close: () => void): () => void {
  closers.set(kind, close);
  return () => {
    if (closers.get(kind) === close) closers.delete(kind);
  };
}

/** Closes the given pop-ups, or all of them. */
export function closePopups(...kinds: Popup[]): void {
  for (const [kind, close] of [...closers]) if (!kinds.length || kinds.includes(kind)) close();
}
