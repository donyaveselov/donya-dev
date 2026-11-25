// Which game is running on my PC, without any backend: Discord detects the game and Lanyard (api.lanyard.rest, open
// CORS) serves that presence to any page. Only "Playing" activities (type 0) count; music and custom statuses are
// ignored.
import type { GameKind } from '../shared/types';

/** A reading of my Discord presence: the game being played, or just the Discord status (online, idle, offline...). */
export type Presence = { playing: true; game: string; kind: GameKind } | { playing: false; status: string };

/** The games the room has a picture for, as the time chip names them. */
export const GAME_NAMES = { dota: 'Dota 2', cs: 'Counter-Strike 2', other: null } as const satisfies Record<
  GameKind,
  string | null
>;

export const DISCORD_ID = String(import.meta.env.VITE_DISCORD_ID ?? '293697431982309377');
const POLL_MS = 30_000;

interface LanyardActivity {
  type: number;
  name?: string;
}
interface LanyardReply {
  data?: { discord_status?: string; activities?: LanyardActivity[] };
}
const PLAYING = 0;

/** By part of the name, so 'Counter-Strike 2', 'CS2' or the old 'Counter-Strike: Global Offensive' all count as CS. */
export function gameKind(name: string): GameKind {
  if (/dota/i.test(name)) return 'dota';
  if (/counter[\s-]?strike|\bcs\s?2\b|\bcs:?\s?go\b/i.test(name)) return 'cs';
  return 'other';
}

export function fromLanyard(reply: LanyardReply): Presence {
  const game = (reply.data?.activities ?? []).find((a) => a.type === PLAYING && a.name)?.name;
  return game
    ? { playing: true, game, kind: gameKind(game) }
    : { playing: false, status: reply.data?.discord_status ?? 'offline' };
}

/** Polls every 30 s while the tab is visible (and at once when it is shown again); `changed` gets each reading (null
 *  when it fails). */
export function pollPresence(changed: (p: Presence | null) => void): void {
  if (!DISCORD_ID) return;
  const url = `https://api.lanyard.rest/v1/users/${DISCORD_ID}`;
  let lastAt = 0;
  const poll = (): void => {
    lastAt = Date.now();
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${String(r.status)}`);
        return r.json() as Promise<LanyardReply>;
      })
      .then(
        (reply) => {
          changed(fromLanyard(reply));
        },
        () => {
          changed(null);
        },
      );
  };
  poll();
  setInterval(() => {
    if (!document.hidden) poll();
  }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastAt > POLL_MS) poll();
  });
}
