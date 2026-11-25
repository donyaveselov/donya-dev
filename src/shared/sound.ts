// The page's one sound switch: muted or not. The room's speaker button and the desktop's tray ("Mute", a double click
// on its speaker) both flip this same value, and everything that makes a sound listens to it: the room's music, the
// desktop's sounds and its tray icon. It is remembered for the next visit. (The tray's volume slider stays the
// desktop's own setting; it only turns the music down.)

const KEY = 'muted';
/** the room's own switch before there was one shared switch: 'off' meant muted */
const OLD_KEY = 'music';

function load(): { muted: boolean; saved: boolean } {
  try {
    const v = localStorage.getItem(KEY);
    if (v !== null) return { muted: v === '1', saved: true };
    if (localStorage.getItem(OLD_KEY) === 'off') return { muted: true, saved: true };
  } catch {
    // storage blocked: unmuted, for this visit
  }
  return { muted: false, saved: false };
}

const initial = load();
let muted = initial.muted;
let saved = initial.saved;
const listeners = new Set<(muted: boolean) => void>();

export function isMuted(): boolean {
  return muted;
}

/** Whether this visitor ever chose (so an older, separate setting should not override it). */
export function muteChosen(): boolean {
  return saved;
}

export function setMuted(next: boolean): void {
  if (next === muted && saved) return;
  muted = next;
  saved = true;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
    localStorage.removeItem(OLD_KEY);
  } catch {
    // for this visit only
  }
  for (const f of listeners) f(next);
}

/** Calls `f` on every change; returns the unsubscribe. */
export function onMutedChange(f: (muted: boolean) => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}
