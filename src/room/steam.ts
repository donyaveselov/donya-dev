// Which game is running on my PC. Without any backend: Discord detects the game and Lanyard (api.lanyard.rest, open
// CORS) serves that presence to any page. Only "Playing" activities (type 0) count; music and custom statuses are
// ignored. A Steam proxy (portfolio/steam-proxy/worker.mjs) still works as an alternative via VITE_STEAM_ENDPOINT.
import type { SteamState } from './clock';

export const DISCORD_ID = String(import.meta.env.VITE_DISCORD_ID ?? '293697431982309377');
export const STEAM_ENDPOINT = String(import.meta.env.VITE_STEAM_ENDPOINT ?? '');
const POLL_MS = 30_000;

interface LanyardActivity {
  type: number;
  name?: string;
}
interface LanyardReply {
  data?: { discord_status?: string; activities?: LanyardActivity[] };
}

/** By part of the name, so 'Counter-Strike 2', 'CS2' or the old 'Counter-Strike: Global Offensive' all count as CS. */
export function gameId(name: string): number {
  if (/dota/i.test(name)) return 570;
  if (/counter[\s-]?strike|\bcs\s?2\b|\bcs:?\s?go\b/i.test(name)) return 730;
  return 0;
}

/** Lanyard's reply → the shape the room understands. */
export function fromLanyard(reply: LanyardReply): SteamState {
  const game = (reply.data?.activities ?? []).find((a) => a.type === 0 && a.name)?.name;
  return game ? { state: 'in-game', game, appid: gameId(game) } : { state: reply.data?.discord_status ?? 'offline' };
}

/** Polls every 30 s while the tab is visible (and at once when it is shown again); `changed` gets each reading (null
 *  when it fails). */
export function pollSteam(changed: (s: SteamState | null) => void): void {
  const url = DISCORD_ID ? `https://api.lanyard.rest/v1/users/${DISCORD_ID}` : STEAM_ENDPOINT;
  if (!url) return;
  let lastAt = 0;
  const poll = (): void => {
    lastAt = Date.now();
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${String(r.status)}`);
        return r.json() as Promise<unknown>;
      })
      .then(
        (d) => {
          changed(DISCORD_ID ? fromLanyard(d as LanyardReply) : (d as SteamState));
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
