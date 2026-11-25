/* The owner: one figure per status (Me_work, Me_play, Me_sleep, Me_outside), only the current one visible, with one
   small idle loop each. Figure parts are separate meshes with their origins on the joints (the Blender model is built
   that way), so each is turned about its joint. In a figure's own axes: x is sideways, y is up, -z is forward. */
import { Euler, Quaternion, Sprite, SpriteMaterial, Vector3 } from 'three';
import type { Object3D, Scene } from 'three';
import type { Status } from '../shared/types';
import { STATUSES } from './clock';
import { smooth } from './lighting';
import { bitmapTexture } from './textures';

const PARTS = ['head', 'torso', 'arm_n', 'arm_p', 'prop', 'breath'] as const;
type Part = (typeof PARTS)[number];
type Rig = Partial<Record<Part, Object3D>>;

const Z_ROWS = ['11111111', '00000110', '00001100', '00011000', '00110000', '01100000', '11111111'];

const restPose = new WeakMap<Object3D, Quaternion>();
const poseE = new Euler();
const poseQ = new Quaternion();
/** A small offset from the modelled rest pose: idle motion is added on top, never replaces it. */
function pose(o: Object3D | undefined, x = 0, y = 0, z = 0): void {
  const q0 = o && restPose.get(o);
  if (!o || !q0) return;
  o.quaternion.copy(q0).multiply(poseQ.setFromEuler(poseE.set(x, y, z)));
}

export class Figure {
  readonly persons: Partial<Record<Status, Object3D>> = {};
  private readonly rigs: Partial<Record<Status, Rig>> = {};
  private readonly swing: Object3D | undefined;
  private readonly duvet: Object3D | undefined;
  /** "z z z" over the bed while asleep: an 8x8 pixel z, nearest filtered */
  private readonly zzz: Sprite[] = [];
  private readonly zHead = new Vector3();

  constructor(root: Object3D) {
    for (const k of STATUSES) {
      const me = root.getObjectByName('Me_' + k);
      if (me) this.persons[k] = me;
      const rig: Rig = {};
      for (const p of PARTS) {
        const o = root.getObjectByName('Me_' + k + '_' + p);
        if (!o) continue;
        rig[p] = o;
        restPose.set(o, o.quaternion.clone());
      }
      this.rigs[k] = rig;
    }
    this.swing = root.getObjectByName('Hammock_swing');
    this.duvet = root.getObjectByName('Bed_duvet_sleep');
  }

  /** The sleeping z's go straight into the scene (they float over everything, no depth test). */
  addZzz(scene: Scene): void {
    const zt = bitmapTexture(8, Z_ROWS);
    for (let i = 0; i < 3; i++) {
      const sp = new Sprite(new SpriteMaterial({ map: zt, transparent: true, depthTest: false, opacity: 0 }));
      sp.renderOrder = 20;
      sp.visible = false;
      scene.add(sp);
      this.zzz.push(sp);
    }
  }

  /** Only the figure for the status is there. */
  show(status: Status): void {
    for (const k of STATUSES) {
      const p = this.persons[k];
      if (p) p.visible = k === status;
    }
  }

  /** The figures at the desk (they fade out when the visitor sits down there). */
  atDesk(): Object3D[] {
    const out: Object3D[] = [];
    for (const k of STATUSES) {
      const p = this.persons[k];
      if (k !== 'outside' && p?.visible) out.push(p);
    }
    return out;
  }

  idle(t: number, st: Status): void {
    const r = this.rigs[st];
    // the hammock always sways a little; more with someone in it
    if (this.swing) this.swing.rotation.x = Math.sin(t * 1.1) * (st === 'outside' ? 0.085 : 0.03);
    for (const sp of this.zzz) sp.visible = st === 'sleep';
    if (!r?.head) return;
    const torso = r.torso;
    if (st === 'work') {
      let look = Math.sin(t * 0.42);
      look = look * look * look; // dwells on one monitor, then glances at the other
      pose(r.head, Math.sin(t * 0.9) * 0.015, look * 0.3, 0);
      const burst = smooth(-0.25, 0.15, Math.sin(t * 0.6)); // types in bursts with short pauses
      pose(r.arm_n, Math.max(0, Math.sin(t * 13)) * 0.05 * burst);
      pose(r.arm_p, Math.max(0, Math.sin(t * 13 + 2.4)) * 0.05 * burst);
      if (torso) torso.scale.y = 1 + Math.sin(t * 1.5) * 0.008;
    } else if (st === 'play') {
      const lean = Math.sin(t * 1.25) * 0.07 + Math.sin(t * 3.1) * 0.025; // leans into the turns
      pose(r.head, Math.sin(t * 2.3) * 0.03, 0, lean);
      pose(r.arm_n, Math.sin(t * 15) * 0.014); // thumbs at work
      pose(r.arm_p, Math.sin(t * 15 + 1.7) * 0.014);
      pose(r.prop, Math.sin(t * 9) * 0.035, 0, lean * 0.5);
      if (torso) torso.scale.y = 1 + Math.sin(t * 1.8) * 0.008;
    } else if (st === 'sleep') {
      const b = Math.sin(t * 1.15); // slow breathing under the blanket
      if (this.duvet) this.duvet.scale.set(1, 1 + b * 0.035, 1); // the duvet rises and falls with the sleeper
      pose(r.head, b * 0.012);
      pose(r.arm_n, b * 0.01);
      pose(r.arm_p, b * 0.01);
      const zh = r.head.getWorldPosition(this.zHead);
      const n = this.zzz.length;
      let i = 0;
      for (const sp of this.zzz) {
        const p = (t / 3.2 + i++ / n) % 1;
        // starts clear of the face
        sp.position.set(zh.x + 0.2 + p * 0.22 + Math.sin(p * 6) * 0.05, zh.y + 0.45 + p * 0.75, zh.z + 0.1);
        sp.scale.setScalar(0.12 + p * 0.2);
        sp.material.opacity = Math.sin(Math.PI * p) * 0.9;
      }
    } else {
      pose(r.arm_p, Math.sin(t * 1.1 + 0.9) * 0.12); // the hanging arm trails behind the swing
      pose(r.head, Math.sin(t * 0.55) * 0.035);
      if (torso) torso.scale.y = 1 + Math.sin(t * 1.3) * 0.008;
    }
  }
}
