// Steam status comes from a small proxy (portfolio/steam-proxy/worker.mjs): Steam's own pages send no CORS headers,
// so the browser cannot read them directly. Leave the address empty and the daily schedule is used instead.
import type { SteamState } from './clock';

export const STEAM_ENDPOINT = String(import.meta.env.VITE_STEAM_ENDPOINT ?? '');

/** Polls the proxy once a minute; `changed` gets each reading (null when it fails). */
export function pollSteam(changed: (s: SteamState | null) => void): void {
  if (!STEAM_ENDPOINT) return;
  const poll = (): void => {
    fetch(STEAM_ENDPOINT, { cache: 'no-store' })
      .then((r) => r.json() as Promise<SteamState>)
      .then(changed, () => {
        changed(null);
      });
  };
  poll();
  setInterval(poll, 60000);
}
