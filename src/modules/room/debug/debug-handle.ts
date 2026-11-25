// window.__psx: the room's debug handle, for screenshots and the regression harness (scripts/regress.mjs sits down,
// stands up and strikes lightning through it). Set only in debug mode (src/utils/debug.ts).
import type { Side } from '../scene/monitors';

export interface RoomDebugHandle {
  sitDown(which?: Side): void;
  standUp(how?: 'off'): void;
  /** a lightning strike now, whatever the weather */
  strike(): void;
}

declare global {
  interface Window {
    __psx?: RoomDebugHandle;
  }
}
