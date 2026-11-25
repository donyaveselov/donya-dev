/* Gouraud needs vertices where the light changes: a floor that is two triangles has no lamp pool. Long edges are split
   at their midpoints until none is longer than maxLen (world metres). The decision depends only on the edge's two end
   points, so neighbouring faces split the same way and no T-junctions (cracks between faces) appear. A mesh
   that already comes as a fine grid is left untouched. */
import { BufferAttribute, BufferGeometry, Matrix3, Vector3 } from 'three';
import type { InterleavedBufferAttribute, Mesh } from 'three';

type Attr = BufferAttribute | InterleavedBufferAttribute;
type Vert = Float32Array;
type Tri = [Vert, Vert, Vert];

/** The divisor that turns a normalized integer attribute back into -1..1 / 0..1 (gltfpack quantizes them). */
function denominator(a: Attr): number {
  if (!a.normalized) return 1;
  const t: ArrayLike<number> = a instanceof BufferAttribute ? a.array : a.data.array;
  if (t instanceof Int8Array) return 127;
  if (t instanceof Uint8Array) return 255;
  if (t instanceof Int16Array) return 32767;
  if (t instanceof Uint16Array) return 65535;
  return 1;
}

const GET = ['getX', 'getY', 'getZ', 'getW'] as const;

/** Splits the mesh's long edges in place (a new, de-indexed float geometry); false when nothing needed splitting. */
export function tessellate(mesh: Mesh, maxLen: number, maxTris: number): boolean {
  const g0 = mesh.geometry;
  const names = Object.keys(g0.attributes);
  const attrs = names.map((n) => g0.attributes[n]).filter((a): a is Attr => !!a);
  const offs: number[] = [];
  let stride = 0;
  let pOff = 0;
  let nOff = -1;
  attrs.forEach((a, i) => {
    offs.push(stride);
    if (names[i] === 'position') pOff = stride;
    if (names[i] === 'normal') nOff = stride;
    stride += a.itemSize;
  });
  const dens = attrs.map(denominator);
  const m3 = new Matrix3().setFromMatrix4(mesh.matrixWorld);
  const d = new Vector3();
  const L2 = maxLen * maxLen;
  const long = (a: Vert, b: Vert): boolean =>
    d
      .set(
        (a[pOff] ?? 0) - (b[pOff] ?? 0),
        (a[pOff + 1] ?? 0) - (b[pOff + 1] ?? 0),
        (a[pOff + 2] ?? 0) - (b[pOff + 2] ?? 0),
      )
      .applyMatrix3(m3)
      .lengthSq() > L2;

  const index = g0.index;
  const cnt = index ? index.count : (attrs[names.indexOf('position')]?.count ?? 0);
  const cache = new Map<number, Vert>();
  const vert = (j: number): Vert => {
    let v = cache.get(j);
    if (v) return v;
    v = new Float32Array(stride);
    attrs.forEach((a, ai) => {
      const s = dens[ai] ?? 0;
      const o = offs[ai] ?? 0;
      for (let c = 0; c < a.itemSize; c++) {
        const get = GET[c] ?? 'getX';
        const x = a[get](j);
        v[o + c] = s === 1 ? x : Math.max(-1, x / s);
      }
    });
    cache.set(j, v);
    return v;
  };
  let tris: Tri[] = [];
  for (let i = 0; i < cnt; i += 3) {
    const at = (q: number): Vert => vert(index ? index.getX(i + q) : i + q);
    tris.push([at(0), at(1), at(2)]);
  }
  if (!tris.some((t) => long(t[0], t[1]) || long(t[1], t[2]) || long(t[2], t[0]))) return false;

  // one midpoint per edge, shared by both faces on it
  const mids = new Map<Vert, Map<Vert, Vert>>();
  const link = (a: Vert, b: Vert, v: Vert): void => {
    let m = mids.get(a);
    if (!m) mids.set(a, (m = new Map<Vert, Vert>()));
    m.set(b, v);
  };
  const mid = (a: Vert, b: Vert): Vert => {
    const hit = mids.get(a)?.get(b);
    if (hit) return hit;
    const v = new Float32Array(stride);
    for (let c = 0; c < stride; c++) v[c] = ((a[c] ?? 0) + (b[c] ?? 0)) / 2;
    if (nOff >= 0) {
      d.set(v[nOff] ?? 0, v[nOff + 1] ?? 0, v[nOff + 2] ?? 0).normalize();
      v[nOff] = d.x;
      v[nOff + 1] = d.y;
      v[nOff + 2] = d.z;
    }
    link(a, b, v);
    link(b, a, v);
    return v;
  };

  for (let k = 0; k < 10 && tris.length < maxTris; k++) {
    const out: Tri[] = [];
    let any = false;
    for (const t of tris) {
      let [a, b, c] = t;
      let sab = long(a, b);
      let sbc = long(b, c);
      let sca = long(c, a);
      const n = +sab + +sbc + +sca;
      if (!n) {
        out.push(t);
        continue;
      }
      any = true;
      if (n === 3) {
        const p = mid(a, b);
        const q = mid(b, c);
        const r = mid(c, a);
        out.push([a, p, r], [p, b, q], [r, q, c], [p, q, r]);
        continue;
      }
      // rotate so the split edges come first: (a,b) always split; for two splits (b,c) too
      while (!(n === 1 ? sab : sab && sbc)) {
        [a, b, c] = [b, c, a];
        [sab, sbc, sca] = [sbc, sca, sab];
      }
      if (n === 1) {
        const m1 = mid(a, b);
        out.push([a, m1, c], [m1, b, c]);
      } else {
        const p = mid(a, b);
        const q = mid(b, c);
        out.push([p, b, q], [a, p, q], [a, q, c]);
      }
    }
    tris = out;
    if (!any) break;
  }

  const g = new BufferGeometry();
  attrs.forEach((a, ai) => {
    const arr = new Float32Array(tris.length * 3 * a.itemSize);
    const off = offs[ai] ?? 0;
    let o = 0;
    for (const t of tris) for (const v of t) for (let c = 0; c < a.itemSize; c++) arr[o++] = v[off + c] ?? 0;
    g.setAttribute(names[ai] ?? '', new BufferAttribute(arr, a.itemSize));
  });
  g.computeBoundingSphere();
  g.computeBoundingBox();
  mesh.geometry = g;
  return true;
}
