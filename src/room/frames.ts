/* Framed pictures: the resume and the diploma, in the two poster frames. 40x56 px each (0.4 x 0.56 m: one texel per
   screen pixel at 96 px/m), nearest, drawn in the page language. */
import { Box3, CanvasTexture, Mesh, PlaneGeometry, Quaternion, Vector3, sRGBEncoding } from 'three';
import type { Object3D } from 'three';
import type { Lang } from '../shared/types';
import { materialOf } from './materials';
import { biasForward, cloneM, nearest } from './psx';
import { pixText } from './pixel-font';
import { canvas, ctx2d } from './textures';
import { must } from './util';

export type FrameKind = 'resume' | 'diploma';

export interface Frame {
  kind: FrameKind;
  mesh: Mesh;
  /** the centre of the picture in world space */
  centre: Vector3;
  /** the top edge's centre, for a label above it */
  top: Vector3;
  draw(lang: Lang): void;
}

function drawResume(g: CanvasRenderingContext2D, en: boolean): void {
  // a resume page: title, photo, name, then sections of text
  g.fillStyle = '#F4F1E8';
  g.fillRect(0, 0, 40, 56);
  pixText(g, en ? 'RESUME' : 'РЕЗЮМЕ', 20, 3, '#2A2F5A');
  g.fillStyle = '#8A94C8';
  g.fillRect(4, 11, 8, 10);
  g.fillStyle = '#5A6298';
  g.fillRect(6, 13, 4, 4);
  g.fillRect(5, 18, 6, 3);
  g.fillStyle = '#2A2F5A';
  g.fillRect(14, 12, 20, 2);
  g.fillStyle = '#9AA0B4';
  g.fillRect(14, 16, 16, 1);
  g.fillRect(14, 19, 12, 1);
  for (const [y, lines] of [
    [24, 10],
    [33, 6],
    [44, 5],
  ] as const) {
    g.fillStyle = '#E2583E';
    g.fillRect(4, y, 10, 1);
    g.fillStyle = '#9AA0B4';
    for (let k = 0; k < (lines === 10 ? 3 : 2); k++) g.fillRect(4, y + 3 + k * 2, 32 - ((k * 7 + y) % 11), 1);
  }
}

function drawDiploma(g: CanvasRenderingContext2D, en: boolean): void {
  // a diploma: cream sheet, gold border, title, lines, a gold seal
  g.fillStyle = '#F6EDD6';
  g.fillRect(0, 0, 40, 56);
  g.fillStyle = '#C9A227';
  g.fillRect(2, 2, 36, 1);
  g.fillRect(2, 53, 36, 1);
  g.fillRect(2, 2, 1, 52);
  g.fillRect(37, 2, 1, 52);
  for (let i = 4; i < 36; i += 3) {
    g.fillRect(i, 4, 1, 1);
    g.fillRect(i, 51, 1, 1);
  }
  for (let i = 6; i < 51; i += 3) {
    g.fillRect(4, i, 1, 1);
    g.fillRect(35, i, 1, 1);
  }
  pixText(g, en ? 'DIPLOMA' : 'ДИПЛОМ', 20, 9, '#1F3A7A');
  g.fillStyle = '#1F3A7A';
  g.fillRect(12, 17, 16, 1);
  g.fillStyle = '#9A9280';
  for (const [y, w] of [
    [21, 24],
    [24, 18],
    [28, 22],
    [31, 14],
  ] as const)
    g.fillRect(20 - w / 2, y, w, 1);
  g.fillStyle = '#C9A227';
  g.fillRect(25, 38, 7, 7);
  g.fillRect(24, 39, 9, 5);
  g.fillRect(26, 37, 5, 9);
  g.fillStyle = '#E8C85A';
  g.fillRect(27, 40, 3, 3);
  g.fillStyle = '#B8343A';
  g.fillRect(26, 46, 2, 4);
  g.fillRect(29, 46, 2, 4);
  g.fillStyle = '#9A9280';
  g.fillRect(8, 44, 12, 1);
}

const PAINT: Record<FrameKind, (g: CanvasRenderingContext2D, en: boolean) => void> = {
  resume: drawResume,
  diploma: drawDiploma,
};

/** Puts a canvas picture over each poster (the poster mesh itself is hidden). */
export function makeFrames(root: Object3D): Frame[] {
  const frames: Frame[] = [];
  for (const [name, kind] of [
    ['Poster_0', 'resume'],
    ['Poster_1', 'diploma'],
  ] as const) {
    const po = root.getObjectByName(name) as Mesh | undefined;
    if (!po) continue;
    const bb = new Box3().setFromObject(po);
    const c = canvas(40, 56);
    const g = ctx2d(c);
    const t = nearest(new CanvasTexture(c));
    t.encoding = sRGBEncoding;
    const m = cloneM(materialOf(po));
    m.map = t;
    m.color.setRGB(1, 1, 1);
    m.vertexColors = false;
    biasForward(m);
    m.needsUpdate = true;
    const mesh = new Mesh(new PlaneGeometry(bb.max.z - bb.min.z, bb.max.y - bb.min.y), m);
    mesh.name = 'Frame_' + kind;
    mesh.renderOrder = po.renderOrder;
    const parent = must(po.parent);
    const wq = new Quaternion();
    parent.updateMatrixWorld(true);
    parent.getWorldQuaternion(wq);
    // faces +x, into the room
    mesh.quaternion.copy(wq.invert()).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2));
    mesh.position.copy(
      parent.worldToLocal(new Vector3(bb.max.x + 0.001, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2)),
    );
    parent.add(mesh);
    po.visible = false;
    const fb = new Box3().setFromObject(mesh);
    const centre = fb.getCenter(new Vector3());
    frames.push({
      kind,
      mesh,
      centre,
      top: centre.clone().setY(fb.max.y),
      draw(lang) {
        g.clearRect(0, 0, 40, 56);
        PAINT[kind](g, lang === 'en');
        t.needsUpdate = true;
      },
    });
  }
  return frames;
}
