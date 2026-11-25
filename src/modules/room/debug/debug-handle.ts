// window.__psx: the room's debug handle, for screenshots and the regression harness (scripts/regress.mjs sits down,
// stands up and strikes lightning through it). Set only in debug mode (src/utils/debug.ts).
import type { OrthographicCamera, Scene, WebGLRenderer } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Side } from '../scene/monitors';
import type { psx } from '../scene/psx';

export interface RoomDebugHandle {
  psx: typeof psx;
  scene: Scene;
  renderer: WebGLRenderer;
  camera: OrthographicCamera;
  controls: OrbitControls;
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
