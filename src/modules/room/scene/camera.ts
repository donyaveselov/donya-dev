// The room's one camera: orthographic (the isometric look), orbiting a point above the floor.
import { OrthographicCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraStart } from '../routes';

/** How far the camera stands from what it looks at. Orthographic, so this changes no size: only what is clipped. */
export const CAMERA_DISTANCE = 120;

/** The point the camera orbits: the middle of the room, a little above the floor. */
const TARGET = new Vector3(0, 0.95, 0);

/** The direction from the target to the camera, per start. */
const START: Record<CameraStart, readonly [number, number, number]> = {
  southeast: [1, 0.8, 1],
  southwest: [-1, 0.8, 1],
  northeast: [1, 0.6, -1],
  low: [1, 0.35, 1],
};

export function makeCamera(start: CameraStart): OrthographicCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
  camera.position.copy(TARGET).addScaledVector(new Vector3(...START[start]).normalize(), CAMERA_DISTANCE);
  return camera;
}

/** Dragging turns the room; the wheel and a pinch zoom. No panning: the room stays in the middle. */
export function makeControls(camera: OrthographicCamera, el: HTMLElement): OrbitControls {
  const controls = new OrbitControls(camera, el);
  controls.target.copy(TARGET);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.65;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.38;
  controls.minZoom = 0.6;
  controls.maxZoom = 3;
  controls.update();
  return controls;
}

/**
 * Fits the frustum to a stage of the given aspect: the room always fits in height, and a narrow (phone) stage gets a
 * taller frustum so it fits in width too. Returns the frustum's height in metres at zoom 1.
 */
export function fitCamera(camera: OrthographicCamera, aspect: number): number {
  const height = Math.max(8.6, 9.6 / aspect);
  camera.left = (-height * aspect) / 2;
  camera.right = (height * aspect) / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
  return height;
}
