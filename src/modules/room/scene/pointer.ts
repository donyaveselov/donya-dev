// The pointer over the 3D room: a monitor is hovered (it bounces) and clicked (sit down), the framed resume opens the
// sheet, the diploma shows what it is. A press that moves is a drag: OrbitControls turns the room.
import type { Lang } from '../../../types';
import type { Frame } from './frames';
import { t } from '../i18n';
import type { Side } from './monitors';
import type { RoomScene } from './scene';

/** A press that moved further than this (px, both axes summed) was a drag, not a click. */
const DRAG_PX = 6;
/** The diploma's caption floats this far (m) above its frame. */
const INFO_ABOVE_M = 0.1;

export interface PointerHost {
  /** false while the camera belongs to the hand-off: nothing in the room reacts */
  free(): boolean;
  lang(): Lang;
  sitDown(side: Side): void;
  openResume(): void;
}

export interface Pointer {
  /** over a monitor */
  readonly hovering: boolean;
}

export function watchPointer(r: RoomScene, host: PointerHost): Pointer {
  const el = r.renderer.domElement;
  const state = { hovering: false };
  let downAt: [number, number] | null = null;
  /** the framed picture under the pointer, unless a monitor is in front or its wall is see-through */
  const frameAt = (ev: PointerEvent): Frame | null => {
    if (!r.frames.length || r.walls.k(1) < 0.6) return null;
    const ray = r.monitors.aim(ev, el, r.camera);
    const hit = ray.intersectObjects(
      r.frames.map((f) => f.mesh),
      false,
    )[0];
    if (!hit) return null;
    const mh = r.monitors.hit(ray);
    if (mh && mh.distance < hit.distance) return null;
    return r.frames.find((f) => f.mesh === hit.object) ?? null;
  };
  const monitorAt = (ev: PointerEvent): Side | null => r.monitors.hit(r.monitors.aim(ev, el, r.camera))?.side ?? null;
  el.addEventListener('pointermove', (ev) => {
    const free = host.free() && !downAt;
    state.hovering = free && !!monitorAt(ev);
    el.style.cursor = state.hovering || (free && frameAt(ev)) ? 'pointer' : 'grab';
  });
  el.addEventListener('pointerdown', (ev) => {
    downAt = [ev.clientX, ev.clientY];
  });
  el.addEventListener('pointerup', (ev) => {
    const moved = downAt ? Math.abs(ev.clientX - downAt[0]) + Math.abs(ev.clientY - downAt[1]) : Infinity;
    downAt = null;
    if (moved > DRAG_PX) return;
    const side = monitorAt(ev);
    if (side) {
      host.sitDown(side);
      return;
    }
    const frame = frameAt(ev);
    if (frame?.kind === 'resume') host.openResume();
    else if (frame) {
      const above = frame.top.clone();
      above.y += INFO_ABOVE_M;
      r.tags.showInfo(above, t(host.lang()).diploma);
    }
  });
  el.addEventListener('pointerleave', () => {
    state.hovering = false;
    downAt = null;
  });
  return state;
}
