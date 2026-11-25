/* The PS1 look.
   The scene is drawn into a small render target and one post pass blows it up with hard square pixels, cuts the
   colour to 15 bits with the console's own 4x4 dither (half strength), and lays the state's backdrop under it. Room
   materials are lit per vertex (Lambert = Gouraud in r128). Vertices are not snapped to the pixel grid: two touching
   surfaces snapped independently made laid-on details flicker against their base.
   psx.fx (1 = full PS1, 0 = clean) is faded by the monitor transition; at 0 the target is bypassed and the frame is
   drawn directly, so the hand-off to the DOM desktop stays pixel-exact. #nops1 or the debug row switches it off. */
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  sRGBEncoding,
} from 'three';
import type { Material, Shader, Texture, WebGLRenderer } from 'three';
import { BACKDROP } from './lighting';

/** What the room keeps in a material's userData. */
export interface MatData {
  /** edits to the built-in shader (the sea's bob, the lamp shade's gradient) */
  psxExtra?: (sh: Shader) => void;
  /** the program cache key of that edited shader: materials with the same edit share a program */
  psxKey?: string;
  /** the colour before a level was applied (LEDs, the lamp shade, the keyboard) */
  c0?: Color;
  /** outdoor: the colour before the hour's tint, whether it is a cloud, the tinted colour a lightning flash brightens */
  base0?: Color;
  cloud?: boolean;
  wxc?: Color;
  /** wall fade: the opacity when solid, and whether it is a big panel */
  base?: number;
  panel?: boolean;
  /** a screen in the middle of the hand-off keeps its painted picture */
  hand?: boolean;
}
export const mdata = (m: Material): MatData => m.userData as MatData;

/** Materials the room converts are all of these two (plus Basic copies for screens, cards and the coast). */
export type RoomMaterial = MeshLambertMaterial | MeshBasicMaterial;

export const psx = {
  /** the PS1 pipeline on (#nops1 or the debug row turns it off) */
  on: true,
  /** 1 = the full PS1 look, 0 = clean; the hand-off fades it */
  fx: 1,
  /** device pixels per PS1 pixel at zoom 1 (set by the layout) */
  base: 0,
};

/**
 * Hooks a room material's shader edit (MatData.psxExtra, which may be set later) into three. r128 drops
 * onBeforeCompile on Material.clone(), so every scene material goes through here and every copy through cloneM().
 */
export function ps1<M extends Material>(m: M): M {
  const d = mdata(m);
  m.onBeforeCompile = (sh) => {
    d.psxExtra?.(sh);
  };
  m.customProgramCacheKey = () => 'psx' + (d.psxKey ?? '');
  m.needsUpdate = true;
  return m;
}

/** A copy of a room material that keeps its userData (three's clone() round-trips it through JSON) and its hooks. */
export function cloneM<M extends Material>(m: M): M {
  const c = m.clone();
  c.userData = { ...(m.userData as MatData) };
  return ps1(c);
}

export function nearest<T extends Texture>(t: T): T {
  t.magFilter = t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.anisotropy = 1;
  t.needsUpdate = true;
  return t;
}

/** Draws a laid-on surface (decal, LED, glass) in front of its base even at grazing angles. */
export function biasForward(m: Material, factor = -2): void {
  m.polygonOffset = true;
  m.polygonOffsetFactor = factor;
  m.polygonOffsetUnits = -4;
}

// Standard (per pixel) -> Lambert (per vertex) or Basic (unlit), keeping everything the rest of the app relies on
const KEEP = [
  'name',
  'color',
  'map',
  'alphaMap',
  'aoMap',
  'aoMapIntensity',
  'vertexColors',
  'transparent',
  'opacity',
  'alphaTest',
  'side',
  'depthWrite',
  'depthTest',
  'blending',
  'polygonOffset',
  'polygonOffsetFactor',
  'polygonOffsetUnits',
  'visible',
  'toneMapped',
] as const;
const KEEP_LIT = [...KEEP, 'emissive', 'emissiveMap', 'emissiveIntensity'] as const;

/** Copies the listed properties the source has; colours are copied into the target's own Color objects. */
function copyProps<K extends string>(
  from: Partial<Record<K, unknown>>,
  to: Record<K, unknown>,
  keys: readonly K[],
): void {
  for (const k of keys) {
    const v = from[k];
    if (v === undefined) continue;
    const own = to[k];
    if (own instanceof Color && v instanceof Color) own.copy(v);
    else to[k] = v;
  }
}

export function toPS1(m: Material, unlit: boolean): RoomMaterial {
  let n: RoomMaterial;
  if (unlit) {
    n = new MeshBasicMaterial();
    copyProps(m, n, KEEP);
  } else {
    const lit = new MeshLambertMaterial();
    copyProps(m, lit, KEEP_LIT);
    n = lit;
  }
  n.userData = { ...(m.userData as MatData) };
  const maps = [n.map, n.alphaMap, n instanceof MeshLambertMaterial ? n.emissiveMap : null, n.aoMap];
  for (const t of maps) if (t) nearest(t);
  return ps1(n);
}

/* The post pass: hard pixels, 15-bit colour with the PS1 dither matrix, the page gradient under the room. */
const FRAGMENT = `uniform sampler2D tScene; uniform vec2 uRes; uniform float uS, uFx, uH, uDither; uniform vec3 uTop, uBot;
float dith(vec2 p) {
  float x = mod(p.x, 4.0), y = mod(p.y, 4.0);
  vec4 r = y < 0.5 ? vec4(-4., 0., -3., 1.) : y < 1.5 ? vec4(2., -2., 3., -1.) : y < 2.5 ? vec4(-3., 1., -4., 0.) : vec4(3., -1., 2., -2.);
  return x < 0.5 ? r.x : x < 1.5 ? r.y : x < 2.5 ? r.z : r.w;
}
void main() {
  vec2 ip = floor(gl_FragCoord.xy / uS);
  vec4 s = texture2D(tScene, (ip + 0.5) / uRes);
  vec3 bg = mix(uBot, uTop, clamp((ip.y + 0.5) * uS / uH, 0.0, 1.0));
  vec3 c = s.rgb + bg * (1.0 - s.a);
  vec3 c8 = clamp(floor(c * 255.0 + 0.5) + dith(ip) * uDither, 0.0, 255.0);
  vec3 q = floor(c8 / 8.0) / 31.0;
  gl_FragColor = vec4(mix(c, q, uFx), 1.0);
}`;
// tScene is sRGB already: no decode, no gamma change; it holds premultiplied colour over a clear background.
// The dither is the console's own 4x4 matrix in 8-bit units, at half strength: clean surfaces, soft bands.

const uniforms = {
  tScene: { value: null as Texture | null },
  uRes: { value: new Vector2(1, 1) },
  uS: { value: 1 },
  uFx: { value: 1 },
  uH: { value: 1 },
  uDither: { value: 0.5 },
  uTop: { value: new Color(BACKDROP.work[0]) },
  uBot: { value: new Color(BACKDROP.work[1]) },
};
let post: { scene: Scene; camera: OrthographicCamera } | null = null;
let rt: WebGLRenderTarget | null = null;

/** The page gradient behind the room (the CSS has its own copy). */
export function setBackdrop(top: string, bottom: string): void {
  uniforms.uTop.value.set(top);
  uniforms.uBot.value.set(bottom);
}

export function makePost(): void {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const m = new ShaderMaterial({
    uniforms,
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  post = { scene: new Scene(), camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  post.scene.add(mesh);
}

export function render(renderer: WebGLRenderer, scene: Scene, camera: OrthographicCamera): void {
  const cv = renderer.domElement;
  const W = cv.width;
  const H = cv.height;
  if (!psx.on || psx.fx <= 0 || !post) {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    return;
  }
  // A PS1 pixel keeps the same size IN THE ROOM, not on the screen: zoomed out, the pixels shrink with everything else
  // (otherwise the room turns into mush), zoomed in they grow a little, capped so close-ups stay readable.
  const z = camera.zoom || 1;
  const S0 = Math.max(1, Math.min(6, Math.round(psx.base * Math.min(z, 1.6))));
  const S = Math.max(1, Math.round(1 + (S0 - 1) * psx.fx));
  const w = Math.ceil(W / S);
  const h = Math.ceil(H / S);
  if (!rt) {
    rt = new WebGLRenderTarget(w, h, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: true,
      stencilBuffer: true,
      generateMipmaps: false,
    });
    rt.texture.encoding = sRGBEncoding; // the target stores display-space colour, like the console's framebuffer
  } else if (rt.width !== w || rt.height !== h) rt.setSize(w, h); // only when the pixel scale steps
  // the target is w*S x h*S device pixels, a little more than the canvas: widen the frustum to the right and up to
  // match, so a target pixel lands exactly on its S x S block and nothing is stretched
  camera.setViewOffset(W, H, 0, -(h * S - H), w * S, h * S);
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  camera.clearViewOffset();
  uniforms.tScene.value = rt.texture;
  uniforms.uRes.value.set(w, h);
  uniforms.uS.value = S;
  uniforms.uFx.value = psx.fx;
  uniforms.uH.value = H;
  renderer.setRenderTarget(null);
  renderer.render(post.scene, post.camera);
}
