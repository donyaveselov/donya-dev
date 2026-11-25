// The PS1 material pass over the loaded model, and the index by material name the light rig works through.
import { Box3, Vector3 } from 'three';
import type { Material, Mesh, Object3D } from 'three';
import { biasForward, cloneM, mdata, ps1, toPS1 } from './psx';
import type { RoomMaterial } from './psx';
import { tessellate } from './tessellate';

/** Every copy of a room material, by its name in the model (the light rig dims LEDs, wood and lamp shades by name). */
export class MaterialIndex {
  private readonly byName = new Map<string, RoomMaterial[]>();

  add(m: RoomMaterial): void {
    const list = this.byName.get(m.name);
    if (list) list.push(m);
    else this.byName.set(m.name, [m]);
  }

  /** Adds the copy only if the name is already known (copies of materials that are not lit by name stay out). */
  addKnown(m: RoomMaterial): void {
    this.byName.get(m.name)?.push(m);
  }

  get(name: string): readonly RoomMaterial[] {
    return this.byName.get(name) ?? [];
  }
}

export const isMesh = (o: Object3D): o is Mesh => (o as { isMesh?: boolean }).isMesh === true;

/** The one material of a mesh (the model has no multi-material meshes). */
export function materialOf(o: Mesh): RoomMaterial {
  return o.material as RoomMaterial;
}

const SCREEN_OR_GLASS = /^Screen_|^Window_Glass$/;
// Things laid onto other surfaces (poster prints, mouse pad, keyboard glow, LEDs, the duvet's folded band, wet sand,
// foam...) sit a few millimetres off their base. Seen at a grazing angle that is not enough and the two flicker or the
// print sinks in. Each gets its own material copy drawn with a depth bias, so it always wins against its base.
// (Not the monitor necks: their edge-on sides got such a bias they showed through the screens.)
const DECAL =
  /^(Poster_\d|Mousepad|Keyboard_glow|Keyboard$|Mouse$|Rack_led_|Rack_unit_|Router_led|AC_led|Desk_led|Shelf_led|PC_glass|PC_inner|PC_strip|PC_front_led|PC_power|Bed_duvet_\w+_fold|Bed_pillow|Mug_coffee|Out_wet|Out_foam|Out_wave_)/;

const box = new Box3();
const size = new Vector3();

/**
 * Lit things become Lambert (per vertex), everything outdoors Basic (unlit, tinted by the hour); one converted copy per
 * original material, so shared materials stay shared. Big flat surfaces get a vertex grid.
 */
export function convertMaterials(root: Object3D, index: MaterialIndex): void {
  const outdoor = root.getObjectByName('Outdoor');
  const converted = new Map<string, RoomMaterial>();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!isMesh(o)) return;
    let out = false;
    for (let p: Object3D | null = o; p; p = p.parent) if (p === outdoor) out = true;
    const m0 = o.material as Material;
    const key = m0.uuid + (out ? 'u' : 'l');
    let m = converted.get(key);
    if (!m) {
      m = toPS1(m0, out);
      converted.set(key, m);
      if (!out) index.add(m);
      if (m.name === 'lamp_glow' && m.vertexColors) {
        // the shade's painted top-to-bottom gradient shades its glow too
        const d = mdata(m);
        d.psxKey = 'glowvc';
        d.psxExtra = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif',
          );
        };
        ps1(m);
      }
      if (m.name === 'window_glass' || m.name === 'pc_glass') {
        m.transparent = true;
        m.opacity = m.name === 'pc_glass' ? 0.22 : 0.1;
        m.depthWrite = false;
      }
    }
    o.material = m;
    const indoorPart = !out && !SCREEN_OR_GLASS.test(o.name); // the screens' corners define the hand-off frame
    // flat decals (clock face, LED quads, painted plates) sit a millimetre off their base: too little for the depth
    // buffer at a grazing angle, so without an offset the base wins and the decal vanishes
    if (indoorPart) {
      box.setFromObject(o).getSize(size);
      if (Math.min(size.x, size.y, size.z) < 0.004 && Math.max(size.x, size.y, size.z) < 1 && !m.polygonOffset)
        biasForward(m);
    }
    if (o.name === 'Out_sea' || o.name === 'Out_shallow')
      tessellate(o, 6, 500); // only for the slow bob
    else if (indoorPart) {
      // only big flat-ish parts need inner vertices for a lamp pool (desk top, mattress, headboard, rack, shelves,
      // AC); floor and walls already come as 0.5 m grids, so tessellate() leaves them alone. Long thin parts
      // (skirting, sill, bars, the slab under the floor) would only multiply triangles without a visible pool.
      const ts = box
        .setFromObject(o)
        .getSize(size)
        .toArray()
        .sort((a, b) => b - a);
      if (ts[0] > 1.0 && ts[1] > 0.3 && !/^Slab$|^Wall_/.test(o.name)) tessellate(o, 0.5, 2000);
    }
  });

  root.traverse((o) => {
    if (!isMesh(o) || !DECAL.test(o.name) || Array.isArray(o.material)) return;
    const c = cloneM(materialOf(o));
    biasForward(c);
    o.material = c;
    index.addKnown(c);
  });
  // the face is flat shapes laid on a round head: bias them forward too, or an eye sinks at the curve
  for (const n of ['eye_white', 'eye_dark', 'mouth', 'brow'])
    for (const m of index.get(n)) {
      biasForward(m);
      m.needsUpdate = true;
    }
}
