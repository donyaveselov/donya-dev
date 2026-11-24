// @ts-nocheck
// Legacy: a verbatim import of portfolio/site/parts/app.js. Replace module by module; do not edit in place.
import * as THREE_NS from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// the UMD build exposed the loaders as THREE.GLTFLoader / THREE.OrbitControls; the legacy code still reads them there
const THREE = Object.assign({}, THREE_NS, { GLTFLoader, OrbitControls });
import * as I18N from './i18n';
import * as CLOCK from './clock';
import * as WX from './weather';
import * as LIGHT from './lighting';
import { CodeSession } from './opencode';
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- i18n ---------- */
  var STR = { ru: I18N.t('ru'), en: I18N.t('en') }, PROJECTS = I18N.PROJECTS;
  var lang = '';
  try { lang = localStorage.getItem('lang') || ''; } catch (e) { lang = ''; }
  if (lang !== 'ru' && lang !== 'en') lang = ((navigator.language || 'en').toLowerCase().indexOf('ru') === 0) ? 'ru' : 'en';
  function applyLang() {
    var t = STR[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = t[el.getAttribute('data-t')]; });
    $('cv-note').hidden = !t.resumeNote;
    $('lang-ru').setAttribute('aria-pressed', String(lang === 'ru')); $('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
    var list = $('proj-list'); list.textContent = '';
    PROJECTS.forEach(function (p) {
      var d = document.createElement('div'); d.className = 'proj';
      var h = document.createElement('h3'); h.textContent = p.name; d.appendChild(h);
      var s = document.createElement('p'); s.textContent = p.about[lang]; d.appendChild(s);
      var ul = document.createElement('ul'); ul.className = 'tags';
      p.tags.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.appendChild(li); }); d.appendChild(ul);
      list.appendChild(d);
    });
    renderTime();
    if (typeof drawFrames === 'function') drawFrames();
    if (typeof tourLang === 'function') tourLang();
  }
  function setLang(next) { lang = next; try { localStorage.setItem('lang', lang); } catch (e) {} applyLang(); if (window.XPDesktop && xpMounted) window.XPDesktop.setLang(lang); }
  $('lang-ru').addEventListener('click', function () { setLang('ru'); });
  $('lang-en').addEventListener('click', function () { setLang('en'); });

  /* ---------- Phuket time drives status, light and sky ---------- */
  // Four states: sleep, work, play, outside. For now they follow a daily schedule; later 'play' comes from Steam.
  // #day, #sunset, #night preview a time of day; #work, #play, #sleep, #outside preview a state.
  var bkk = { h: 12, m: 0 }, preview = null, forced = null;
  // Steam status comes from a small proxy (portfolio/steam-proxy/worker.mjs): Steam's own pages send no CORS headers,
  // so the browser cannot read them directly. Leave the address empty and the daily schedule is used instead.
  var STEAM_ENDPOINT = '';
  var steam = null, game = { kind: 'other', name: null };      // kind: 'dota' | 'cs' | 'other'
  function gameKind(appid) { return appid === 570 ? 'dota' : (appid === 730 ? 'cs' : 'other'); }
  function pollSteam() {
    if (!STEAM_ENDPOINT) return;
    fetch(STEAM_ENDPOINT, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      steam = d;
      if (d.state === 'in-game' && !forced) { game.kind = gameKind(d.appid); game.name = d.game || null; }
      applyTime();
    }).catch(function () { steam = null; });
  }
  function readClock() {
    var c = CLOCK.phuketTime(new Date(), preview);
    var changed = c.h !== bkk.h || c.m !== bkk.m; bkk.h = c.h; bkk.m = c.m; return changed;
  }
  function status() { return CLOCK.statusAt(bkk, forced, steam); }
  function renderTime() {
    $('time').innerHTML = '<i></i>';
    $('time').appendChild(document.createTextNode(I18N.timeChip(lang, bkk.h, bkk.m, status(), game.name)));
  }

  /* ---------- three ---------- */
  var stage = $('stage'), renderer = null;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, stencil: true }); } catch (e) { renderer = null; }
  var has3d = !!renderer && !!THREE.GLTFLoader && !!THREE.OrbitControls;
  var byName = {}, screenLight = null, halos = [], duvetMade = null, duvetSleep = null, zoomed = null, xpRoot = null, xpMounted = false;
  var fades = [], portalMask, scene, camera, controls, root, hemi, key, lamps = [], glow = [], mat = {}, persons = {}, clockHands = {}, clockDisp = null, wallN, wallW, outdoor, dome, sunMat, winFill, screens = [], monitors = [], anchor;
  var rig = {}, swing = null, sunPatch = null, zzz = [], zHead = has3d ? new THREE.Vector3() : null;
  var TARGET = has3d ? new THREE.Vector3(0, 0.95, 0) : null, STATES = ['work', 'play', 'sleep', 'outside'], tex = {};
  function col(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function mix(a, b, k) { return new THREE.Color(a).lerp(new THREE.Color(b), k); }
  function smooth(a, b, x) { var k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }

  /* ---------- the PS1 look (design/PS1.md) ----------
     The scene is drawn into a small render target (about 40 pixels per world unit) and one post pass blows it up with hard
     square pixels, cuts the colour to 15 bits with the console's own 4x4 dither (half strength), and lays the state's backdrop under it.
     Every room material snaps its vertices to that pixel grid and is lit per vertex (Lambert = Gouraud in r128).
     psx.fx (1 = full PS1, 0 = clean) is faded by the monitor transition; at 0 the target is bypassed and the frame is drawn
     exactly as before, so the hand-off to the DOM desktop stays pixel-exact. #nops1 or the debug row switches it off. */
  var psx = { on: !/nops1/.test(location.hash || ''), fx: 1, S0: 3, rt: null, post: null, postCam: null,
    snap: { value: has3d ? new THREE.Vector3(1, 1, 0) : null }, time: { value: 0 } };
  // r128 drops onBeforeCompile on Material.clone(): every scene material goes through ps1(), every copy through cloneM()
  function ps1(m) {
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uSnap = psx.snap; sh.uniforms.uTime = psx.time;
      // the figure (psxNoSnap) is not snapped: its idle motion would shimmer a pixel at every joint (CRASH.md §4)
      sh.vertexShader = 'uniform vec3 uSnap;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n' + (m.userData.psxNoSnap ? '' :
        'if (uSnap.z > 0.0) gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap.xy + 0.5) / uSnap.xy * gl_Position.w;'));
      if (m.userData.psxExtra) m.userData.psxExtra(sh);
    };
    m.customProgramCacheKey = function () { return 'psx' + (m.userData.psxKey || ''); };
    m.needsUpdate = true; return m;
  }
  // an LED's level: Lambert LEDs take it on the emission, an unlit (Basic) one on its colour
  function ledLevel(m, v) {
    if (!m.userData.c0) m.userData.c0 = m.color.clone();
    if (m.isMeshBasicMaterial) m.color.copy(m.userData.c0).multiplyScalar(v);
    else { m.emissiveIntensity = v; m.color.copy(m.userData.c0).multiplyScalar(v); }      // a dim LED is dark plastic: no lit swatch catching the screen light
  }
  // additive light cards painted on a wall behind a lamp or the neon: on with the room's lights, faded with the wall
  var cards = [];
  function fadeCards() { var f = fades && fades[1]; cards.forEach(function (c) { c.m.opacity = c.base * c.on * (f ? f.k : 1); c.mesh.visible = c.m.opacity > 0.002; }); }
  function cloneM(m) { var c = m.clone(); c.userData = Object.assign({}, m.userData); return ps1(c); }
  function nearest(t) { if (!t) return t; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.anisotropy = 1; t.needsUpdate = true; return t; }
  // Standard (per pixel) -> Lambert (per vertex) or Basic (unlit), keeping everything the rest of the app relies on
  var KEEP = ['name', 'color', 'map', 'alphaMap', 'aoMap', 'aoMapIntensity', 'vertexColors', 'transparent', 'opacity', 'alphaTest', 'side',
    'depthWrite', 'depthTest', 'blending', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'visible', 'toneMapped'];
  function toPS1(m, unlit) {
    var n = unlit ? new THREE.MeshBasicMaterial() : new THREE.MeshLambertMaterial(), keys = KEEP.concat(unlit ? [] : ['emissive', 'emissiveMap', 'emissiveIntensity']);
    keys.forEach(function (k) { var v = m[k]; if (v === undefined) return; if (n[k] && n[k].isColor) n[k].copy(v); else n[k] = v; });
    n.userData = Object.assign({}, m.userData);
    [n.map, n.alphaMap, n.emissiveMap, n.aoMap].forEach(nearest);
    return ps1(n);
  }
  /* Gouraud needs vertices where the light changes: a floor that is two triangles has no lamp pool. Long edges are split at
     their midpoints until none is longer than maxLen (world metres). The decision depends only on the edge's two end points,
     so neighbouring faces split the same way and no T-junctions (cracks under vertex snapping) appear. A mesh that already
     comes as a fine grid is left untouched. */
  function tessellate(mesh, maxLen, maxTris) {
    var g0 = mesh.geometry, names = Object.keys(g0.attributes), A = names.map(function (n) { return g0.attributes[n]; });
    var get = ['getX', 'getY', 'getZ', 'getW'], offs = [], stride = 0, pOff = 0, nOff = -1;
    A.forEach(function (a, i) { offs.push(stride); if (names[i] === 'position') pOff = stride; if (names[i] === 'normal') nOff = stride; stride += a.itemSize; });
    var m3 = new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld), d = new THREE.Vector3(), L2 = maxLen * maxLen;
    function den(a) { if (!a.normalized) return 1; var t = a.array || (a.data && a.data.array); return t instanceof Int8Array ? 127 : t instanceof Uint8Array ? 255 : t instanceof Int16Array ? 32767 : t instanceof Uint16Array ? 65535 : 1; }
    function long(a, b) { d.set(a[pOff] - b[pOff], a[pOff + 1] - b[pOff + 1], a[pOff + 2] - b[pOff + 2]).applyMatrix3(m3); return d.lengthSq() > L2; }
    var cnt = g0.index ? g0.index.count : g0.attributes.position.count, cache = {}, tris = [], i, k, c;
    function vert(j) {
      if (cache[j]) return cache[j];
      var v = new Float32Array(stride);
      A.forEach(function (a, ai) { var s = den(a); for (c = 0; c < a.itemSize; c++) v[offs[ai] + c] = s === 1 ? a[get[c]](j) : Math.max(-1, a[get[c]](j) / s); });
      return (cache[j] = v);
    }
    for (i = 0; i < cnt; i += 3) {
      var t = [0, 1, 2].map(function (q) { return vert(g0.index ? g0.index.getX(i + q) : i + q); });
      tris.push(t);
    }
    if (!tris.some(function (t) { return long(t[0], t[1]) || long(t[1], t[2]) || long(t[2], t[0]); })) return false;
    var mids = new Map();
    function mid(a, b) {
      var m0 = mids.get(a), hit = m0 && m0.get(b);
      if (hit) return hit;
      var v = new Float32Array(stride); for (c = 0; c < stride; c++) v[c] = (a[c] + b[c]) / 2;
      if (nOff >= 0) { d.set(v[nOff], v[nOff + 1], v[nOff + 2]).normalize(); v[nOff] = d.x; v[nOff + 1] = d.y; v[nOff + 2] = d.z; }
      [[a, b], [b, a]].forEach(function (p) { if (!mids.has(p[0])) mids.set(p[0], new Map()); mids.get(p[0]).set(p[1], v); });
      return v;
    }
    for (k = 0; k < 10 && tris.length < maxTris; k++) {
      var out = [], any = false;
      tris.forEach(function (t) {
        var a = t[0], b = t[1], cc = t[2], sab = long(a, b), sbc = long(b, cc), sca = long(cc, a), n = sab + sbc + sca;
        if (!n) { out.push(t); return; }
        any = true;
        if (n === 3) { var p = mid(a, b), q = mid(b, cc), r = mid(cc, a); out.push([a, p, r], [p, b, q], [r, q, cc], [p, q, r]); return; }
        // rotate so the split edges come first: (a,b) always split; for two splits (b,c) too
        while (!(n === 1 ? sab : sab && sbc)) { var tt = a; a = b; b = cc; cc = tt; var ts = sab; sab = sbc; sbc = sca; sca = ts; }
        if (n === 1) { var m1 = mid(a, b); out.push([a, m1, cc], [m1, b, cc]); }
        else { var p2 = mid(a, b), q2 = mid(b, cc); out.push([p2, b, q2], [a, p2, q2], [a, q2, cc]); }
      });
      tris = out; if (!any) break;
    }
    var g = new THREE.BufferGeometry();
    A.forEach(function (a, ai) {
      var arr = new Float32Array(tris.length * 3 * a.itemSize), o = 0;
      tris.forEach(function (t) { t.forEach(function (v) { for (c = 0; c < a.itemSize; c++) arr[o++] = v[offs[ai] + c]; }); });
      g.setAttribute(names[ai], new THREE.BufferAttribute(arr, a.itemSize));
    });
    g.computeBoundingSphere(); g.computeBoundingBox();
    mesh.geometry = g; return true;
  }
  // the sea: one 64 px closed-cell caustic net, four colours, tiling on all sides; drawn once here instead of downloaded
  function seaTile(pal, seed) {
    var N = 64, c = document.createElement('canvas'); c.width = c.height = N;
    var g = c.getContext('2d'), img = g.createImageData(N, N), pts = [], s = seed, x, y, i, ox, oy;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    for (i = 0; i < 7; i++) pts.push([rnd() * N, rnd() * N]);      // few, big cells: chunky Crash water
    var P = pal.map(function (h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; });
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var ds = [];
      pts.forEach(function (p) { var best = 1e9; for (ox = -1; ox <= 1; ox++) for (oy = -1; oy <= 1; oy++) { var dx = x + 0.5 - p[0] - ox * N, dy = y + 0.5 - p[1] - oy * N; best = Math.min(best, dx * dx + dy * dy); } ds.push(Math.sqrt(best)); });
      ds.sort(function (a, b) { return a - b; });
      var e = ds[1] - ds[0], col = e < 2.0 ? (ds[2] - ds[0] < 4.5 ? P[3] : P[2]) : (e < 4.5 ? P[1] : P[0]), o = (y * N + x) * 4;
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    var t = nearest(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
  }
  // the page behind the room, per state (CRASH.md §1): top, bottom. White labels keep >= 4.5:1 on every one of them
  var BACKDROP = { work: ['#0B3B4A', '#1C7A78'], play: ['#241B52', '#8A3A4A'], sleep: ['#050B24', '#10245A'], outside: ['#0A4A6E', '#18807E'] };
  // the post pass: hard pixels, 15-bit colour with the PS1 dither matrix, the page gradient under the room
  function makePost() {
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    var m = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uS: { value: 1 }, uFx: { value: 1 }, uH: { value: 1 }, uDither: { value: 0.5 },
        uTop: { value: new THREE.Color(BACKDROP.work[0]) }, uBot: { value: new THREE.Color(BACKDROP.work[1]) } },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tScene; uniform vec2 uRes; uniform float uS, uFx, uH, uDither; uniform vec3 uTop, uBot;',
        'float dith(vec2 p) {',                                   // the console's own 4x4 matrix, in 8-bit units
        '  float x = mod(p.x, 4.0), y = mod(p.y, 4.0);',
        '  vec4 r = y < 0.5 ? vec4(-4., 0., -3., 1.) : y < 1.5 ? vec4(2., -2., 3., -1.) : y < 2.5 ? vec4(-3., 1., -4., 0.) : vec4(3., -1., 2., -2.);',
        '  return x < 0.5 ? r.x : x < 1.5 ? r.y : x < 2.5 ? r.z : r.w;',
        '}',
        'void main() {',
        '  vec2 ip = floor(gl_FragCoord.xy / uS);',
        '  vec4 s = texture2D(tScene, (ip + 0.5) / uRes);',      // sRGB already: no decode, no gamma change
        '  vec3 bg = mix(uBot, uTop, clamp((ip.y + 0.5) * uS / uH, 0.0, 1.0));',
        '  vec3 c = s.rgb + bg * (1.0 - s.a);',                   // the target holds premultiplied colour over a clear background
        '  vec3 c8 = clamp(floor(c * 255.0 + 0.5) + dith(ip) * uDither, 0.0, 255.0);',      // half strength: clean surfaces, soft bands
        '  vec3 q = floor(c8 / 8.0) / 31.0;',
        '  gl_FragColor = vec4(mix(c, q, uFx), 1.0);',
        '}'].join('\n'),
      depthTest: false, depthWrite: false, blending: THREE.NoBlending
    });
    var mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    psx.post = new THREE.Scene(); psx.post.add(mesh); psx.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  function render() {
    var cv = renderer.domElement, W = cv.width, H = cv.height;
    if (!psx.on || psx.fx <= 0) { psx.snap.value.z = 0; renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    // A PS1 pixel keeps the same size IN THE ROOM, not on the screen: zoomed out, the pixels shrink with everything else
    // (otherwise the room turns into mush), zoomed in they grow a little, capped so close-ups stay readable.
    var z = camera.zoom || 1, S0 = Math.max(1, Math.min(6, Math.round((psx.base || psx.S0) * Math.min(z, 1.6))));
    var S = Math.max(1, Math.round(1 + (S0 - 1) * psx.fx)), w = Math.ceil(W / S), h = Math.ceil(H / S);
    if (!psx.rt) {
      psx.rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, stencilBuffer: true, generateMipmaps: false });
      psx.rt.texture.encoding = THREE.sRGBEncoding;          // the target stores display-space colour, like the console's framebuffer
    } else if (psx.rt.width !== w || psx.rt.height !== h) psx.rt.setSize(w, h);      // only when the pixel scale steps
    // vertex snapping off: Crash Bandicoot's geometry is famously steady, and snapping two touching surfaces to the pixel
    // grid independently is what made laid-on details flicker against their base at some angles
    psx.snap.value.set(w / 2, h / 2, 0);
    // the target is w*S x h*S device pixels, a little more than the canvas: widen the frustum to the right and up to match,
    // so a target pixel lands exactly on its S x S block and nothing is stretched
    camera.setViewOffset(W, H, 0, -(h * S - H), w * S, h * S);
    renderer.setRenderTarget(psx.rt); renderer.render(scene, camera);
    camera.clearViewOffset();
    var u = psx.post.children[0].material.uniforms;
    u.tScene.value = psx.rt.texture; u.uRes.value.set(w, h); u.uS.value = S; u.uFx.value = psx.fx; u.uH.value = H;
    renderer.setRenderTarget(null); renderer.render(psx.post, psx.postCam);
  }

  // what the two monitors show: an editor and a terminal, drawn as coloured bars
  function screenTexture(kind) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 288;
    var g = c.getContext('2d'), y, i;
    g.fillStyle = '#0e1524'; g.fillRect(0, 0, 512, 288);
    if (kind === 'editor') {
      g.fillStyle = '#161f33'; g.fillRect(0, 0, 512, 26); g.fillRect(0, 26, 96, 262);
      g.fillStyle = '#58b8ff'; g.fillRect(104, 6, 90, 14);
      for (i = 0; i < 9; i++) { g.fillStyle = i === 2 ? '#58b8ff' : '#3a4763'; g.fillRect(12, 40 + i * 24, 40 + (i * 23) % 36, 9); }
      var cols = ['#ff7ab6', '#7ee0ff', '#c8d3f5', '#9ae6a0', '#ffd479'];
      for (i = 0; i < 10; i++) {
        y = 42 + i * 23; var x = 112 + ((i * 2) % 3) * 22;
        g.fillStyle = cols[i % 5]; g.fillRect(x, y, 54 + (i * 37) % 60, 10);
        g.fillStyle = cols[(i + 2) % 5]; g.fillRect(x + 70 + (i * 37) % 60, y, 40 + (i * 53) % 110, 10);
        if (i % 3 === 0) { g.fillStyle = '#c8d3f5'; g.fillRect(x + 220 + (i * 11) % 50, y, 60, 10); }
      }
    } else if (kind === 'dota') {      // top-down MOBA: map with a river and three lanes, two bases, minimap and ability bar
      g.fillStyle = '#1d3b24'; g.fillRect(0, 0, 512, 288);
      g.fillStyle = '#254a2c'; for (i = 0; i < 26; i++) g.fillRect((i * 97) % 500, (i * 53) % 230, 30 + (i * 7) % 26, 18 + (i * 5) % 14);
      g.strokeStyle = '#2f7fa8'; g.lineWidth = 26; g.beginPath(); g.moveTo(-10, 40); g.lineTo(522, 200); g.stroke();
      g.strokeStyle = '#8a7a4e'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(40, 230); g.lineTo(470, 30); g.stroke();
      g.beginPath(); g.moveTo(40, 230); g.lineTo(40, 30); g.lineTo(470, 30); g.stroke();
      g.beginPath(); g.moveTo(40, 230); g.lineTo(470, 230); g.lineTo(470, 30); g.stroke();
      g.fillStyle = '#58d68d'; g.fillRect(18, 204, 46, 46); g.fillStyle = '#ff5c5c'; g.fillRect(448, 10, 46, 46);
      [[150, 178, '#58d68d'], [176, 160, '#58d68d'], [250, 134, '#58d68d'], [282, 116, '#ff5c5c'], [320, 96, '#ff5c5c'], [40, 110, '#58d68d'], [300, 230, '#ff5c5c']].forEach(function (u) { g.fillStyle = u[2]; g.beginPath(); g.arc(u[0], u[1], 7, 0, 7); g.fill(); });
      g.fillStyle = '#ffd479'; g.beginPath(); g.arc(266, 126, 16, 0, 7); g.fill();
      g.fillStyle = 'rgba(8,12,20,.86)'; g.fillRect(120, 244, 272, 44); g.fillRect(0, 222, 70, 66);
      for (i = 0; i < 6; i++) { g.fillStyle = ['#7ee0ff', '#ff7ab6', '#9ae6a0', '#ffd479', '#c8a8ff', '#ff9a5c'][i]; g.fillRect(132 + i * 42, 252, 32, 28); }
      g.fillStyle = '#58d68d'; g.fillRect(6, 228, 58, 54); g.fillStyle = '#2f7fa8'; g.fillRect(6, 248, 58, 8);
      g.fillStyle = '#58d68d'; g.fillRect(200, 6, 50, 10); g.fillStyle = '#ff5c5c'; g.fillRect(262, 6, 50, 10);
    } else if (kind === 'cs') {        // first-person shooter: sand-coloured map, a doorway, crosshair, weapon and HUD numbers
      var sky2 = g.createLinearGradient(0, 0, 0, 120); sky2.addColorStop(0, '#7fb6e6'); sky2.addColorStop(1, '#d9ecf7'); g.fillStyle = sky2; g.fillRect(0, 0, 512, 130);
      g.fillStyle = '#c9a56a'; g.fillRect(0, 130, 512, 158);
      g.fillStyle = '#b08a52'; g.beginPath(); g.moveTo(0, 30); g.lineTo(170, 100); g.lineTo(170, 190); g.lineTo(0, 288); g.fill();
      g.fillStyle = '#d7b77c'; g.beginPath(); g.moveTo(512, 20); g.lineTo(350, 100); g.lineTo(350, 190); g.lineTo(512, 288); g.fill();
      g.fillStyle = '#a57f48'; g.fillRect(170, 100, 180, 90); g.fillStyle = '#3a2c1c'; g.fillRect(232, 116, 54, 74);
      g.fillStyle = '#8a6a3c'; g.fillRect(96, 168, 46, 42); g.fillRect(372, 176, 40, 34);
      g.fillStyle = '#e04a3a'; g.fillRect(250, 136, 14, 30); g.beginPath(); g.arc(257, 128, 8, 0, 7); g.fill();
      g.strokeStyle = '#7dff8a'; g.lineWidth = 3; g.lineCap = 'butt';
      [[256, 124, 256, 136], [256, 152, 256, 164], [236, 144, 248, 144], [264, 144, 276, 144]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); });
      g.fillStyle = '#1b1e24'; g.beginPath(); g.moveTo(330, 288); g.lineTo(372, 214); g.lineTo(402, 206); g.lineTo(420, 222); g.lineTo(512, 250); g.lineTo(512, 288); g.fill();
      g.fillStyle = '#2c3038'; g.fillRect(366, 200, 44, 12);
      g.fillStyle = '#ffffff'; g.fillRect(16, 258, 26, 18); g.fillRect(48, 258, 44, 18); g.fillRect(420, 14, 76, 12);
      g.fillStyle = '#ffd479'; g.fillRect(16, 14, 60, 12); g.fillStyle = '#7ee0ff'; g.fillRect(228, 8, 24, 14); g.fillStyle = '#ff9a5c'; g.fillRect(260, 8, 24, 14);
    } else if (kind === 'youtube') {   // the second monitor while gaming: a video page with a player, a red progress bar and a list of videos
      g.fillStyle = '#0f0f0f'; g.fillRect(0, 0, 512, 288);
      g.fillStyle = '#ff0033'; g.fillRect(14, 10, 26, 18); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(23, 14); g.lineTo(33, 19); g.lineTo(23, 24); g.fill();
      g.fillStyle = '#2a2a2a'; g.fillRect(150, 10, 190, 18); g.fillStyle = '#5a5a5a'; g.beginPath(); g.arc(486, 19, 9, 0, 7); g.fill();
      var vid = g.createLinearGradient(14, 40, 340, 210); vid.addColorStop(0, '#24406e'); vid.addColorStop(1, '#7a3b6e'); g.fillStyle = vid; g.fillRect(14, 40, 326, 176);
      g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(250, 100, 30, 0, 7); g.fill();
      g.fillStyle = '#16233f'; g.beginPath(); g.moveTo(14, 216); g.lineTo(110, 130); g.lineTo(190, 190); g.lineTo(250, 150); g.lineTo(340, 216); g.fill();
      g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(177, 128, 26, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(168, 114); g.lineTo(192, 128); g.lineTo(168, 142); g.fill();
      g.fillStyle = '#5a5a5a'; g.fillRect(14, 210, 326, 5); g.fillStyle = '#ff0033'; g.fillRect(14, 210, 142, 5); g.beginPath(); g.arc(156, 212, 6, 0, 7); g.fill();
      g.fillStyle = '#f1f1f1'; g.fillRect(14, 228, 230, 12); g.fillStyle = '#8a8a8a'; g.fillRect(14, 248, 120, 9);
      g.fillStyle = '#5a5a5a'; g.beginPath(); g.arc(26, 272, 9, 0, 7); g.fill(); g.fillStyle = '#f1f1f1'; g.fillRect(42, 266, 90, 9); g.fillStyle = '#ff0033'; g.fillRect(270, 262, 70, 18);
      var th = ['#3d6b4f', '#6b4a3d', '#3d4f6b', '#6b3d5e', '#5e6b3d'];
      for (i = 0; i < 5; i++) { y = 40 + i * 49; g.fillStyle = th[i]; g.fillRect(354, y, 74, 42); g.fillStyle = '#e8e8e8'; g.fillRect(434, y + 4, 64, 8); g.fillStyle = '#8a8a8a'; g.fillRect(434, y + 18, 44, 7); g.fillRect(434, y + 30, 54, 6); }
    } else if (kind === 'game') {      // any other game: sky, sun, hills, a road and a HUD
      var sk = g.createLinearGradient(0, 0, 0, 190); sk.addColorStop(0, '#3b2a7a'); sk.addColorStop(1, '#ff7ab6'); g.fillStyle = sk; g.fillRect(0, 0, 512, 190);
      g.fillStyle = '#ffd479'; g.beginPath(); g.arc(256, 150, 62, 0, 7); g.fill();
      g.fillStyle = '#241a52'; g.beginPath(); g.moveTo(0, 190); g.lineTo(110, 110); g.lineTo(200, 190); g.fill(); g.beginPath(); g.moveTo(300, 190); g.lineTo(410, 96); g.lineTo(512, 170); g.lineTo(512, 190); g.fill();
      g.fillStyle = '#141034'; g.fillRect(0, 190, 512, 98);
      g.fillStyle = '#7ee0ff'; g.beginPath(); g.moveTo(236, 190); g.lineTo(276, 190); g.lineTo(380, 288); g.lineTo(132, 288); g.fill();
      g.fillStyle = '#141034'; g.fillRect(250, 200, 12, 18); g.fillRect(246, 236, 20, 30);
      g.fillStyle = '#9ae6a0'; g.fillRect(16, 14, 120, 12); g.fillStyle = '#ffffff'; g.fillRect(16, 32, 70, 8); g.fillRect(420, 14, 76, 12);
    } else {
      g.fillStyle = '#9ae6a0'; g.fillRect(14, 16, 150, 10);
      for (i = 0; i < 10; i++) { y = 40 + i * 23; g.fillStyle = i % 4 === 3 ? '#9ae6a0' : (i % 4 === 1 ? '#7ee0ff' : '#8b97b8'); g.fillRect(14, y, 120 + (i * 71) % 300, 9); }
      g.fillStyle = '#ffffff'; g.fillRect(14, 270, 12, 12);
    }
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.flipY = false; return screenFilter(t);
  }
  // Screens in the room are minified (~18:1), at the end of the flight to a monitor magnified. Nearest-mipmap-nearest gives hard
  // PS1 texels that still carry the code lines (plain nearest at 18:1 drops the thin text and the screen reads black); the
  // magnification filter, the only one the hand-off frame uses, stays linear.
  function screenFilter(t) { t.minFilter = THREE.NearestMipmapNearestFilter; t.generateMipmaps = true; t.anisotropy = 1; return t; }

  function applyTime() {
    var t = bkk.h + bkk.m / 60;
    var skyF = LIGHT.skyFactors(t, status() === 'sleep'), dayK = skyF.day, duskK = skyF.dusk;
    var top = new THREE.Color(), low = new THREE.Color();
    var oc = wxOvercast();                                   // weather: a flat grey sky, the dusk colours washed out
    LIGHT.skyColours(skyF, oc, top, low);
    // the page behind the room follows the state, not the clock: one gradient per state, shared by the CSS and the post pass
    var bd = LIGHT.BACKDROP[status()], rs = document.documentElement.style;
    rs.setProperty('--sky-top', bd[0]); rs.setProperty('--sky-bottom', bd[1]);
    if (psx.post) { var pu = psx.post.children[0].material.uniforms; pu.uTop.value.set(bd[0]); pu.uBot.value.set(bd[1]); }
    renderTime();
    if (!scene) return;
    // The room's own light follows the clock, whatever the owner does: by day the even golden "work" light, in the evening
    // and at night the lamp-lit "play" look, blended through dusk and dawn. Asleep, the lights are off and only the monitors glow.
    var st = status(), sky = dayK, skyDusk = duskK;
    // Light per state (CRASH.md §3): Lambert gives albedo x (hemi + lights) in linear space, so the sums stay well under 1 or the
    // walls clip to lemon and the plank tones vanish; the lights add hue. The states differ by hue, not by darkness: work golden and even, play two orange lamp pools
    // in a violet-blue room, asleep saturated blue from the monitors, out a cool shade with the window blazing.
    var L = LIGHT.roomLight(st, t, sky);
    hemi.color.setHex(L.sky); hemi.groundColor.setHex(L.gnd); hemi.intensity = L.hemi;
    key.color.setHex(L.keyCol); key.intensity = L.key;
    if (st !== 'sleep') { var dimK = oc * smooth(6, 7.5, t) * (1 - smooth(16.4, 17.7, t)); hemi.intensity *= 1 - 0.15 * dimK; hemi.color.lerp(col(0xC8D4E8), 0.35 * dimK); }      // overcast daylight: cooler, a bit dimmer
    var asleep = st === 'sleep', dark = asleep;      // asleep: lamps, neon and LED strips are off
    lamps.forEach(function (l, i) { l.intensity = L.lamps[i] || 0; l.color.copy(col(L.lampCol)); l.distance = L.lampDist || 4.5; });
    glow.forEach(function (l) { l.intensity = l.userData.max * L.glow; });
    // orange wood has no blue to reflect: asleep (or out at night) the wood carries a faint blue self-light so the floor reads blue
    var woodBlue = asleep;
    ['floor', 'desk_top', 'wood_light', 'bed_wood', 'bed_wood_dark'].forEach(function (n) { (byName[n] || []).forEach(function (m) { m.emissive = col(0x1A34B0); m.emissiveIntensity = woodBlue ? 0.30 : 0; }); });
    (byName.lamp_glow || []).forEach(function (m) {      // lit, the shade's look is its own glow: its diffuse is dimmed so the lamp next to it cannot clip it to a flat sticker
      if (!m.userData.c0) m.userData.c0 = m.color.clone();
      m.color.copy(m.userData.c0).multiplyScalar(dark ? 1 : 0.04); m.emissive = col(0xffb964); m.emissiveIntensity = dark ? 0.06 : 0.80;
    });
    ['led_cyan', 'led_magenta', 'led_green'].forEach(function (n) { (byName[n] || []).forEach(function (m) { ledLevel(m, dark ? 0.06 : 1); }); });
    (byName.led_kbd || []).forEach(function (m) { ledLevel(m, dark ? 0.35 : 1); });
    // asleep, the screen light falls straight onto the keyboard: its cyan legends would be the brightest thing on the desk
    (byName.keyboard || []).forEach(function (m) { if (!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(m.userData.c0).multiplyScalar(asleep ? 0.4 : 1); });      // the underglow must not outshine the screens at night
    cards.forEach(function (c) { c.on = dark ? 0 : 1; }); fadeCards();
    // the screens throw light into the room, tinted by what is on them
    var tint = LIGHT.screenTint(st, game.kind);      // deep blue when asleep: the orange planks swallow a pale tint
    screenLight.color.copy(col(tint)); screenLight.intensity = L.scr; screenLight.distance = 5;
    // the window: the sky's low colour while the lamps are on, moonlight asleep, a warm daylight spill when out
    if (L.winCol !== null) winFill.color.copy(col(L.winCol)); else winFill.color.copy(low).convertSRGBToLinear();
    winFill.intensity = L.win; winFill.distance = L.winDist || 7;
    if (wxFx) { wxFx.winBase = L.win; wxFx.winCol.copy(winFill.color); }
    // out by day the sun through the window lays one hard-edged light polygon on the floor
    if (sunPatch) { sunPatch.material.opacity = 0;      // the daylight is the same for every status now (the work look), with no sun patch
      sunPatch.visible = sunPatch.material.opacity > 0.002; }
    // additive glow cards around the screens: low, local polygons, never a haze
    halos.forEach(function (h) { h.color.copy(col(tint)); h.opacity = dark ? 0.16 : 0.2; });
    if (duvetMade) { duvetMade.visible = !asleep; duvetSleep.visible = asleep; }
    // gaming: the game on the left screen, a video on the right
    var away = st === 'sleep' || st === 'outside';              // nobody at the desk: both screens run the screen saver
    screens.forEach(function (m, i) { if (!m.userData.hand) m.map = screenTex(i); m.color.setScalar(1); });      // a screen in the middle of the hand-off keeps its painted picture
    // the sky: an 8-sided dome whose rings carry the colours; Gouraud plus the dither makes the banded PS1 sky
    var dc = dome.geometry.attributes.color, dp = dome.geometry.attributes.position, cTop = top.clone().convertSRGBToLinear(), cLow = low.clone().convertSRGBToLinear(), cc = new THREE.Color();
    for (var di = 0; di < dp.count; di++) { var hy = Math.max(0, dp.getY(di) / 150); cc.copy(cLow).lerp(cTop, Math.min(1, hy * 1.4)); dc.setXYZ(di, cc.r, cc.g, cc.b); }
    dc.needsUpdate = true;
    // the coast is unlit: one tint for the hour (night blue .. daylight white, warm at dusk) over its own colours
    var outTint = mix(0x6A84E8, 0xffffff, sky).lerp(new THREE.Color(0xFFA05A), 0.6 * skyDusk).convertSRGBToLinear();      // Crash nights are blue and readable
    // a blue tint alone turns yellow sand and brown bark grey (they reflect no blue): at night every outdoor colour is also
    // pulled a third of the way to the night blue, so sand reads lavender-blue, never grey
    var nightBlue = col(0x3A4FA8), nightK = 0.35 * (1 - sky);
    var rainGrey = col(0x56657A);
    outTint.lerp(col(0x8C96AA), 0.6 * oc).multiplyScalar(1 - 0.38 * oc);      // rain: a greyer, darker coast
    outdoorMats.forEach(function (m) {
      m.color.copy(m.userData.base0).multiply(outTint).lerp(nightBlue, nightK).lerp(rainGrey, 0.45 * oc * (0.4 + 0.6 * sky));      // the turquoise goes slate in the rain
      if (m.userData.cloud) m.color.lerp(col(sky > 0.5 ? 0x5A6378 : 0x222A40), 0.75 * oc);      // heavy clouds
      m.userData.wxc = m.color.clone();
    });
    if (sunObj) sunObj.visible = oc < 0.6;
    if (wxFx) { wxFx.fk = -1; }      // re-apply the flash level over the new colours next frame
    sunMat.color.copy(col(sky > 0.5 ? 0xFFF3A0 : 0xdfe6ff)).lerp(col(0xFF8A3C), skyDusk * 0.7);      // the sun outside keeps the real hour
    STATES.forEach(function (k) { if (persons[k]) persons[k].visible = k === st; });
    tickClock();
  }


  /* ---------- water: a pattern that just floats, as in PS1 games ----------
     The sea and the shallows carry one 64 px caustic tile in two layers: the mesh itself scrolling one way, an additive
     copy just above it (mirrored, larger) scrolling another. Offsets move in whole texels, never sub-texel sliding; where the
     two nets cross, bright knots travel. A slow vertex bob makes the snapped surface swim a little. */
  var waves = [], outdoorMats = [], seaLayers = [];
  function seaBob(sh) {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
      '{ vec4 wp = modelMatrix * vec4(transformed, 1.0); transformed.y += 0.02 * sin(wp.x * 0.5 + uTime * 1.1) + 0.015 * sin(wp.z * 0.45 - uTime * 0.8); }');
  }
  function animateWater(t) {
    psx.time.value = t;
    // a third of a texel per step: one internal pixel at 96 px/m, never a sub-pixel slide
    seaLayers.forEach(function (l) { l.map.offset.set(Math.floor(t * l.v[0] * 3) / 3 / 64, Math.floor(t * l.v[1] * 3) / 3 / 64); });
    var q3 = function (o) { return Math.ceil(o * 3) / 3; };           // opacity in three steps, like a semi-transparency mode
    waves.forEach(function (w) {                       // foam lines roll in and fade, the shoreline foam band slides up and back
      var u = w.userData, k = (t * 0.18 + u.ph * 0.13) % 1;
      if (w.name === 'Out_foam') { w.position.copy(u.p0); w.position.z += Math.round(0.10 * Math.sin(t * 0.9) * 96) / 96; return; }
      w.position.copy(u.p0); w.position.z += (1 - k) * 0.35 - 0.1;          // towards the shore (+z is the room side)
      w.material.opacity = q3(Math.sin(Math.PI * k) * 0.9);
    });
  }

  /* ---------- weather in Phuket (Open-Meteo: free, no key, open CORS) ----------
     Clear / cloudy / rain / storm from the WMO weather code. The camera looks down through the window, so the weather is
     made where it is seen: slanted 1 px rain lines between the glass and the sea, 2 px splashes on the sand and water,
     drops running down the glass (two scrolling 32 px tiles, nearest), a grey sky and a darker coast. A storm adds
     lightning: two hard flashes that light the coast and, through the window, the room. No flashes with reduced motion. */
  var wx = WX.newWeather(), wxFx = null, sunObj = null;
  function wxKind() { return WX.effectiveKind(wx); }
  function wxOvercast() { return WX.overcast(wx); }
  function wxRain() { return WX.rainAmount(wx); }
  function fetchWeather() { WX.fetchWeather(wx, applyTime); }
  function makeWeather(portal) {
    root.updateMatrixWorld(true);
    var X0 = -6, XW = 10, Z0 = -2.95, ZW = 6, i;
    // rain: line segments in the volume behind the glass that the camera actually sees through it
    var N = 380, pos = new Float32Array(N * 6), drops = [];
    function drop(r, top) { r.x = X0 + Math.random() * XW; r.z = Z0 - Math.random() * ZW; r.y = top ? 3.4 + Math.random() * 0.8 : -0.3 + Math.random() * 4.2; r.v = 8 + Math.random() * 3; return r; }
    for (i = 0; i < N; i++) drops.push(drop({}, false));
    var rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var rain = new THREE.LineSegments(rg, portal(new THREE.LineBasicMaterial({ color: col(0xD2E2FF), transparent: true, opacity: 0.55, depthWrite: false })));
    rain.frustumCulled = false; rain.renderOrder = 5; rain.visible = false; scene.add(rain);
    // splashes: 2 px points dropped on the real ground (ray cast once onto the sand, wet sand, shallows and sea)
    var ground = [], spots = [], rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
    outdoor.traverse(function (o) { if (o.isMesh && /^Out_(sand|wet|shallow|sea|grass)/.test(o.name)) ground.push(o); });
    for (i = 0; i < 120; i++) {
      rc.set(new THREE.Vector3(X0 + Math.random() * XW, 6, Z0 - Math.random() * 5), down);
      var hit = rc.intersectObjects(ground, false)[0]; if (hit) spots.push(hit.point.clone().add(new THREE.Vector3(0, 0.03, 0)));
    }
    var M = 46, sp = new Float32Array(M * 3), sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    var splash = new THREE.Points(sg, portal(new THREE.PointsMaterial({ color: col(0xE8F0FF), size: 2, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })));
    splash.frustumCulled = false; splash.renderOrder = 5; splash.visible = false; scene.add(splash);
    // lightning: a jagged polyline from the clouds down to the sea, rebuilt for every strike
    var bp = new Float32Array(14 * 6), bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    var bolt = new THREE.LineSegments(bg, portal(new THREE.LineBasicMaterial({ color: col(0xF4F8FF), transparent: true, depthWrite: false })));
    bolt.frustumCulled = false; bolt.renderOrder = 5; bolt.visible = false; scene.add(bolt);
    function newBolt() {
      var x = -10 + Math.random() * 12, y = 9, z = -16 - Math.random() * 8, k = 0;
      for (var s = 0; s < 14; s++) {
        var nx = x + (Math.random() - 0.5) * 1.4, ny = y - (9.2 / 14) * (0.7 + Math.random() * 0.6), nz = z + (Math.random() - 0.5) * 0.6;
        bp.set([x, y, z, nx, ny, nz], k); k += 6; x = nx; y = ny; z = nz;
      }
      bg.attributes.position.needsUpdate = true;
    }
    // drops on the glass, room side: two tiles of short trails with a bright head, scrolling down at different speeds
    var gb = new THREE.Box3().setFromObject(root.getObjectByName('Window_Glass')), gw = gb.max.x - gb.min.x, gh = gb.max.y - gb.min.y, glass = [];
    [[11, 15], [7, 9]].forEach(function (cfg, li) {
      var c = document.createElement('canvas'); c.width = 32; c.height = 64; var g = c.getContext('2d');
      for (var d = 0; d < cfg[0]; d++) {
        var x = (d * 13 + li * 5 + 3) % 31, y = (d * 23 + li * 11) % 56, len = 3 + (d * 5 + li) % 7;
        for (var q = 0; q < len; q++) { g.fillStyle = 'rgba(220,234,255,' + (0.12 + 0.45 * q / len).toFixed(2) + ')'; g.fillRect(x, y + q, 1, 1); }
        g.fillStyle = 'rgba(244,250,255,0.9)'; g.fillRect(x, y + len, 1, 2);      // a straight trail with a brighter tip, never a hook
      }
      var t = nearest(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((li ? -1 : 1) * gw / 0.333, gh / 0.667);
      var m = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      m.position.set((gb.min.x + gb.max.x) / 2, (gb.min.y + gb.max.y) / 2, gb.max.z + 0.012 + li * 0.002); m.renderOrder = 13; m.visible = false;
      m.userData.v = cfg[1]; scene.add(m); glass.push(m);
    });
    wxFx = { N: N, pos: pos, drops: drops, drop: drop, rg: rg, rain: rain, M: M, sp: sp, sg: sg, splash: splash, spots: spots, sT: 0,
             bolt: bolt, newBolt: newBolt, glass: glass, next: 0, fl: -9, fk: 0, winBase: 0, winCol: new THREE.Color() };
  }
  function wxFlash(fk) {
    if (dome) dome.material.color.setScalar(1 + 1.6 * fk);
    outdoorMats.forEach(function (m) { if (m.userData.wxc) m.color.copy(m.userData.wxc).multiplyScalar(1 + 1.3 * fk); });
    if (winFill) { winFill.color.copy(wxFx.winCol).lerp(col(0xDDE6FF), fk); winFill.intensity = wxFx.winBase + 2.6 * fk; }
  }
  function tickWeather(t, dt) {
    var F = wxFx; if (!F) return;
    var d = wxRain(), vis = outdoor.visible && d > 0, i;
    F.rain.visible = F.splash.visible = vis;
    if (vis) {
      var n = Math.round(F.N * d), p = F.pos;
      for (i = 0; i < n; i++) {
        var r = F.drops[i]; r.y -= r.v * dt * (RMOTION ? 0.25 : 1); if (r.y < -0.3) F.drop(r, true);
        p[i * 6] = r.x; p[i * 6 + 1] = r.y; p[i * 6 + 2] = r.z; p[i * 6 + 3] = r.x + 0.07; p[i * 6 + 4] = r.y + 0.3; p[i * 6 + 5] = r.z - 0.02;      // slanted by the wind off the sea
      }
      F.rg.attributes.position.needsUpdate = true; F.rg.setDrawRange(0, n * 2);
      if (t - F.sT > 0.07 && F.spots.length) {                    // splashes blink at a steady low rate, like sprite frames
        F.sT = t; var m = Math.round(F.M * d);
        for (i = 0; i < F.M; i++) {
          if (i < m && Math.random() < 0.7) { var s = F.spots[(Math.random() * F.spots.length) | 0]; F.sp[i * 3] = s.x; F.sp[i * 3 + 1] = s.y; F.sp[i * 3 + 2] = s.z; }
          else F.sp[i * 3 + 1] = -100;
        }
        F.sg.attributes.position.needsUpdate = true;
      }
    }
    F.glass.forEach(function (g, li) {
      g.visible = d > 0 && fades[0] && fades[0].k > 0.98;          // gone while the north wall is see-through
      g.material.opacity = 0.25 + 0.4 * d;
      g.material.map.offset.y = Math.floor(t * g.userData.v * (RMOTION ? 0.2 : 1)) / 64;
    });
    // lightning: a strike every 5..14 s, two hard flashes and a short fade
    var fk = 0, e = t - F.fl;
    if (wxKind() === 'storm' && !RMOTION) {
      if (!F.next) F.next = t + 2 + Math.random() * 4;
      if (t >= F.next) { F.fl = t; e = 0; F.next = t + 5 + Math.random() * 9; F.newBolt(); }
      fk = e < 0.07 ? 1 : e < 0.13 ? 0.15 : e < 0.26 ? 0.8 : Math.max(0, 0.8 - (e - 0.26) * 4);
    } else F.next = 0;
    F.bolt.visible = outdoor.visible && fk > 0.3 && e < 0.3;
    if (fk !== F.fk) { F.fk = fk; wxFlash(fk); }
  }


  /* ---------- framed pictures: the resume and the diploma, in the two poster frames ----------
     40x56 px each (0.4 x 0.56 m: one texel per screen pixel at 96 px/m), nearest, drawn in the page language. */
  var GLYPH = {
    'Р': ['###.', '#..#', '###.', '#...', '#...'], 'Е': ['####', '#...', '###.', '#...', '####'], 'З': ['###.', '...#', '.##.', '...#', '###.'],
    'Ю': ['#.###', '#.#.#', '###.#', '#.#.#', '#.###'], 'М': ['#...#', '##.##', '#.#.#', '#...#', '#...#'], 'Д': ['.###.', '.#.#.', '.#.#.', '#####', '#...#'],
    'И': ['#..#', '#..#', '#.##', '##.#', '#..#'], 'П': ['####', '#..#', '#..#', '#..#', '#..#'], 'Л': ['.###', '.#.#', '.#.#', '.#.#', '##.#'],
    'О': ['.##.', '#..#', '#..#', '#..#', '.##.'], 'R': ['###.', '#..#', '###.', '#.#.', '#..#'], 'S': ['.###', '#...', '.##.', '...#', '###.'],
    'U': ['#..#', '#..#', '#..#', '#..#', '.##.'], 'D': ['###.', '#..#', '#..#', '#..#', '###.'], 'I': ['###', '.#.', '.#.', '.#.', '###'],
    'P': ['###.', '#..#', '###.', '#...', '#...'], 'L': ['#...', '#...', '#...', '#...', '####'], 'A': ['.##.', '#..#', '####', '#..#', '#..#']
  };
  GLYPH.E = GLYPH['Е']; GLYPH.M = GLYPH['М']; GLYPH.O = GLYPH['О'];
  function pixText(g, s, cx, y, color) {
    var w = 0; s.split('').forEach(function (ch) { w += (GLYPH[ch] || ['']).reduce(function (a, r) { return Math.max(a, r.length); }, 0) + 1; }); w -= 1;
    var x = Math.round(cx - w / 2); g.fillStyle = color;
    s.split('').forEach(function (ch) {
      var gl = GLYPH[ch]; if (!gl) { x += 3; return; }
      gl.forEach(function (row, ry) { for (var rx = 0; rx < row.length; rx++) if (row[rx] === '#') g.fillRect(x + rx, y + ry, 1, 1); });
      x += gl[0].length + 1;
    });
  }
  var frames = [];
  function drawFrames() {
    frames.forEach(function (f) {
      var g = f.c.getContext('2d'), en = lang === 'en';
      g.clearRect(0, 0, 40, 56);
      if (f.kind === 'resume') {                          // a resume page: title, photo, name, then sections of text
        g.fillStyle = '#F4F1E8'; g.fillRect(0, 0, 40, 56);
        pixText(g, en ? 'RESUME' : 'РЕЗЮМЕ', 20, 3, '#2A2F5A');
        g.fillStyle = '#8A94C8'; g.fillRect(4, 11, 8, 10); g.fillStyle = '#5A6298'; g.fillRect(6, 13, 4, 4); g.fillRect(5, 18, 6, 3);
        g.fillStyle = '#2A2F5A'; g.fillRect(14, 12, 20, 2); g.fillStyle = '#9AA0B4'; g.fillRect(14, 16, 16, 1); g.fillRect(14, 19, 12, 1);
        [[24, 10], [33, 6], [44, 5]].forEach(function (s0) {
          g.fillStyle = '#E2583E'; g.fillRect(4, s0[0], 10, 1);
          g.fillStyle = '#9AA0B4'; for (var k = 0; k < (s0[1] === 10 ? 3 : 2); k++) g.fillRect(4, s0[0] + 3 + k * 2, 32 - ((k * 7 + s0[0]) % 11), 1);
        });
      } else {                                            // a diploma: cream sheet, gold border, title, lines, a gold seal
        g.fillStyle = '#F6EDD6'; g.fillRect(0, 0, 40, 56);
        g.fillStyle = '#C9A227'; g.fillRect(2, 2, 36, 1); g.fillRect(2, 53, 36, 1); g.fillRect(2, 2, 1, 52); g.fillRect(37, 2, 1, 52);
        for (var i = 4; i < 36; i += 3) { g.fillRect(i, 4, 1, 1); g.fillRect(i, 51, 1, 1); }
        for (i = 6; i < 51; i += 3) { g.fillRect(4, i, 1, 1); g.fillRect(35, i, 1, 1); }
        pixText(g, en ? 'DIPLOMA' : 'ДИПЛОМ', 20, 9, '#1F3A7A');
        g.fillStyle = '#1F3A7A'; g.fillRect(12, 17, 16, 1);
        g.fillStyle = '#9A9280'; [[21, 24], [24, 18], [28, 22], [31, 14]].forEach(function (l) { g.fillRect(20 - l[1] / 2, l[0], l[1], 1); });
        g.fillStyle = '#C9A227'; g.fillRect(25, 38, 7, 7); g.fillRect(24, 39, 9, 5); g.fillRect(26, 37, 5, 9);
        g.fillStyle = '#E8C85A'; g.fillRect(27, 40, 3, 3);
        g.fillStyle = '#B8343A'; g.fillRect(26, 46, 2, 4); g.fillRect(29, 46, 2, 4);
        g.fillStyle = '#9A9280'; g.fillRect(8, 44, 12, 1);
      }
      f.t.needsUpdate = true;
    });
  }
  function makeFrames() {
    [['Poster_0', 'resume'], ['Poster_1', 'diploma']].forEach(function (d) {
      var po = root.getObjectByName(d[0]); if (!po) return;
      var bb = new THREE.Box3().setFromObject(po), c = document.createElement('canvas'); c.width = 40; c.height = 56;
      var t = nearest(new THREE.CanvasTexture(c)); t.encoding = THREE.sRGBEncoding;
      var m = cloneM(po.material); m.map = t; m.color.setRGB(1, 1, 1); m.vertexColors = false;
      m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; m.needsUpdate = true;
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(bb.max.z - bb.min.z, bb.max.y - bb.min.y), m);
      mesh.name = 'Frame_' + d[1]; mesh.renderOrder = po.renderOrder;
      var parent = po.parent, wq = new THREE.Quaternion(); parent.updateMatrixWorld(true); parent.getWorldQuaternion(wq);
      mesh.quaternion.copy(wq.invert()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));      // faces +x, into the room
      mesh.position.copy(parent.worldToLocal(new THREE.Vector3(bb.max.x + 0.001, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2)));
      parent.add(mesh); po.visible = false;
      frames.push({ kind: d[1], c: c, t: t, mesh: mesh });
    });
    drawFrames();
  }
  function overFrame(ev) {
    if (!frames.length || (fades[1] && fades[1].k < 0.6)) return null;      // not through a see-through wall
    var r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObjects(frames.map(function (f) { return f.mesh; }), false)[0];
    if (!hit) return null;
    var mh = ray.intersectObjects(monitors, true)[0]; if (mh && mh.distance < hit.distance) return null;
    for (var i = 0; i < frames.length; i++) if (frames[i].mesh === hit.object) return frames[i];
    return null;
  }

  /* ---------- labels over things: the weather above the window, "local time" above the clock, a one-off info note ---------- */
  var tags = [];
  function makeTags() {
    function topOf(name, dy) { var o = root.getObjectByName(name); if (!o) return null; var b = new THREE.Box3().setFromObject(o), v = new THREE.Vector3(); b.getCenter(v); v.y = b.max.y + dy; return v; }
    function tag(cls) { var el = document.createElement('div'); el.className = 'tag' + (cls ? ' ' + cls : ''); el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); return el; }
    var wp = topOf('Window_Glass', 0.02), cp = topOf('Clock_case', 0.1) || topOf('Clock_display', 0.12);
    if (wp) tags.push({ key: 'window', el: tag(), p: wp, wall: 0, text: function () {
      var T = STR[lang];
      if (!wx.forced && !wx.at) return T.wxNow;                 // no weather (offline, blocked): still say where I am
      var tt = !wx.forced && wx.temp != null ? ', ' + Math.round(wx.temp) + '°' : '';
      return T.wxNow + ' · ' + T.wx[wxKind()] + tt;
    } });
    if (cp) tags.push({ key: 'clock', el: tag(), p: cp, wall: 1, text: function () { return STR[lang].localTime; } });
    frames.forEach(function (f) {
      var b = new THREE.Box3().setFromObject(f.mesh), v = new THREE.Vector3(); b.getCenter(v); v.y = b.max.y + 0.06;
      tags.push({ key: f.kind, el: tag(), p: v, wall: 1, text: function () { return STR[lang][f.kind + 'Tag']; } });
    });
    tags.info = { el: tag('tag--info'), p: null, until: 0 };
  }
  function showInfo(p, text) { var i = tags.info; if (!i) return; i.p = p.clone(); i.el.textContent = text; i.until = performance.now() + 4500; }
  var tagV = has3d ? new THREE.Vector3() : null;
  function placeTags() {
    var W = stage.clientWidth, H = stage.clientHeight;
    function put(el, p, show) {
      if (show) { tagV.copy(p).project(camera); show = tagV.z < 1 && Math.abs(tagV.x) < 1.05 && Math.abs(tagV.y) < 1.05; }
      if (show) { el.style.left = ((tagV.x + 1) / 2 * W) + 'px'; el.style.top = ((1 - tagV.y) / 2 * H - 6) + 'px'; }
      el.style.opacity = show ? 1 : 0;
    }
    tags.forEach(function (t) {
      var s = t.text(); if (t.el.textContent !== s) t.el.textContent = s;
      put(t.el, t.p, !!s && !zoomed && tagOn(t.key) && (!fades[t.wall] || fades[t.wall].k > 0.6));
    });
    var i = tags.info; if (i && i.p) put(i.el, i.p, !zoomed && performance.now() < i.until);
  }


  /* ---------- the talkie: a pixel mouth that shows the room (design/TOUR.md) ----------
     No labels on load. The talkie says hello and asks for a tour. "No": all labels appear and it folds into a corner button.
     "Yes": one line per step; the status steps switch the room to that state and hour, then the real one comes back; the
     labels appear one by one; the camera leans a little towards what is being talked about. */
  var TALK_FR = {"idle": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAfCAYAAABXscv8AAABaElEQVR42u2Yyw6DIBBFwbDERP//I22Ce7vCEDoDlwEjWibppipwz7wApYYNGzZs2LDTrF2Of9KrcwD2/aPf6Fivy5R8+CQYaCSzAJzb1Dyv2UHvhlKbsskIcG5TSqkfEOgCWsGpEUk5EgbAAclB6aWg+vXGEELH6JJFhwA8hFIoVwtG1pAEkIJAAaD+bwmDm5N7jswdAihKgdDjqEB0gei4qJfRumRQAX7S1mEeA6oVGEdlbqwJrd6UJ5GQk4gpmWue1/OHfF/VBRDyLVJHGgFxUY4jinKsSeWKtctBDSppi9LnHLxW3UcjfZybLFWhr2yPXGFNFVxuU2ZyFZOLAmoyroDlYKA5X5LbKPgJbRtU8ZF6LxSSExXu5qTiU1vyqTXRHgwVD3cBnwp3i8m9I3HQVLKDimnG/bc3QMhpVF95RG1R3Kj3Svb6lwGQHHk5Aa1apuT+QT/9QrX20kU/6Yb5LRe0w3qyL8Xh/PsgoWXcAAAAAElFTkSuQmCC", "aaa": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAfCAYAAABXscv8AAABWUlEQVR42u1YQQrEIAw00qNC+/9HdkHv7slFJGqiqS7UObY1ZqZxNCq1sbGxsQjGnMGYM6zMAaQJzUja+w8sF6BG1rlbWXuJEXbuVkqpasxeUUCCdEwwRUw2f8cRpha3JjRHjEOirK290GQp1dEiyREpjktzbomhnzYoyaWQx7L2+j0rzdPicUiZWY1oWiGSgnBENuYMWDXAKifnGKakqeYiwEryq5CKoN9GPueq30Y+FwFmVgB1q3zCKEvLgOUBvWZEJS4lRGvHQT2gdWiIQblkesmPjsXGe/+BnKPG1JFsNkbLeUTwdO4SJ+A4JlZapQln+ECeD5Zf62dCz9aRegGlYcEIcYWriTjSEMFoG8zpBGsJU76lfMNdviL3ASURauVOIdaKNUJc7EYIqwgquValUJqpUcM+lOC52pgzSB9isHb3L67EZt8PSpKeIsCIKE+R3djY2MjxBVYl8OoF4AejAAAAAElFTkSuQmCC", "hmm": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAfCAYAAABXscv8AAAAYElEQVR42u3TIRKAMAwEwMZX8P9XIurBMhigk4Bg19U0mZtcawAAAPxPZH3U+7Id32Oskb3seUbGnKhecHbhq7+yAo6q07oTxozsy4q3ujYTSEWNQAW+CeBpEPoPAFBsB4/iIAfW47pFAAAAAElFTkSuQmCC", "ooo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAfCAYAAABXscv8AAAAy0lEQVR42u2ZwQrEIAxEa/Boofv/H7mF9t6eCmVhIVhnjGlyVWnmmWgapymsr5WyHKUsR6/vp16i/43t+0r1SSyJ14wPDUArjglBLJ8NrgDUCGJAEE+76SoFWPDkzbs/RAQEAHAURQS8Of8jAkYCgIqmzBaybV/VvHn+UPzJ1oT/zkeDEIviW601AQAtIG4B6wBa5TCqVQYF0MJpF4fgUxHIRikcwOV8DQRGLZDYlZzmVrgLR7fJk9Vylv0+YA4A608ye213x9tgmM5OUidD02s7ajoAAAAASUVORK5CYII=", "thhh": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAfCAYAAABXscv8AAABMUlEQVR42u1YQQ6EIAwU4lGS9f+P1ATuuyc3pktLCwU12zkZNaUztFNxmgwGg8FgMBj+FE474LK83iMST2l3wwUYRW6kSK6WcIzb9zqE9ecefNYCGPcck3rGEWNu3W0uwVKiOUExUVtaEwrha8mHsDbt7pkYJKlBGosBuXku+Ri3YmJQEEqgWvFya8DNOPLkiOC1lKUSghUjId/r3awJlkr/IK9hbDXC59aF96WmOLcmwzE3DcEo05SSR6dASrujqiCEtdgCOXEwh5eMWO2pgI7Bkggt5Yq1EUWKqrZaPziPQi/9gtIyJelO9iBPTgGuCFcYYg35lHaX4+RL39Jah46rybM9gAqAecMVVcBZs/kwpHUqxPqXY4RScaUV6570D6DHv4Eu/d1bkCf5ksFguDc+r+rIaVefg3wAAAAASUVORK5CYII=", "uhh": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAfCAYAAABXscv8AAABGklEQVR42u2Y3Q7DIAiFi9llTdb3f8gusffb1RrDtAKD/ljO3eac/Y6g0GFwuVyuGwuOXHwcn+/887K8oCsDMOA/sjIH9gJPaf75XYxTdTwfszTjYQX+BdoC2TInpXmdm4/HOK3raBgRtMBb8BQjKMrNwOvungJaOd5KD0pESaMBznDAHXlQhl7gpc8Vhs7ENSH0svvSZwy9wZseghoGlE78kjSuTcqhCHvBU8E1jaAYELgQEhApvHQuZ84lbgEOEK4UzXsBXKe3wpgCU6sCa2uXegbTZihvVFrlKv6u1uBoGGLeDcY4icMRA3OgpDusegtw+nyqWVSw1n+VIojaF4B2pYXTQ2NnOWnDbYjgjK+/zvCqzOVyuW6hDypSuVOfQanmAAAAAElFTkSuQmCC"};
  var TALK_SPEAK = ['aaa', 'ooo', 'thhh', 'uhh', 'aaa', 'hmm'];
  var tour = { el: null, shown: {}, all: false, i: -1, steps: null, typing: 0, text: '', full: '', mouthT: 0, saved: null, cam: null, base: null };
  function tagOn(k) { return tour.all || !!tour.shown[k]; }
  function tourSteps() {
    var at = function (name) { var o = root.getObjectByName(name); if (!o) return null; var b = new THREE.Box3().setFromObject(o), v = new THREE.Vector3(); return b.getCenter(v); };
    var fr = function (k) { for (var i = 0; i < frames.length; i++) if (frames[i].kind === k) { var b = new THREE.Box3().setFromObject(frames[i].mesh), v = new THREE.Vector3(); return b.getCenter(v); } return null; };
    var desk = at('Anchor_projects');
    return [
      { key: 'hello', ask: true },
      { key: 'work', state: 'work', hour: 13, look: desk },
      { key: 'play', state: 'play', game: 'cs', hour: 21.5, look: desk },
      { key: 'outside', state: 'outside', hour: 19.3, look: at('Hammock_swing') || at('Window_Glass') },
      { key: 'sleep', state: 'sleep', hour: 1.5, look: at('Bed_duvet_sleep') || at('Bed_duvet_made') },
      { key: 'back', real: true },
      { key: 'projects', show: ['projects'], look: desk },
      { key: 'resume', show: ['resume'], look: fr('resume') },
      { key: 'diploma', show: ['diploma'], look: fr('diploma') },
      { key: 'place', show: ['clock', 'window'], look: at('Clock_case') && at('Window_Glass') ? at('Clock_case').lerp(at('Window_Glass'), 0.5) : null },
      { key: 'end', end: true }
    ];
  }
  function tourLine(k) { return I18N.tourLine(lang, k, { h: bkk.h, m: bkk.m, status: status(), gameName: game.name }); }
  function makeTalkie() {
    var el = document.createElement('div'); el.className = 'talkie'; el.hidden = true;
    el.innerHTML = '<div class="talkie__say"><div class="tbub" role="status" aria-live="polite"></div><div class="tbtns"></div></div>' +
      '<img class="talkie__mouth" alt="" width="64" height="31" tabindex="0">';
    document.body.appendChild(el); tour.el = el;
    tour.bub = el.querySelector('.tbub'); tour.btns = el.querySelector('.tbtns'); tour.mouth = el.querySelector('.talkie__mouth');
    tour.mouth.src = TALK_FR.idle;
    tour.bub.addEventListener('click', function () { if (tour.typing) finishLine(); else if (tour.steps && !tour.steps[tour.i].ask) nextStep(); });
    var replay = function () { if (el.classList.contains('talkie--mini')) startTour(true); };
    tour.mouth.addEventListener('click', replay);
    tour.mouth.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); replay(); } });
    setInterval(function () {                         // lip flap while the text types, the grin when it stops
      var f = tour.typing ? TALK_SPEAK[(Math.random() * TALK_SPEAK.length) | 0] : 'idle';
      if (tour.mouth.getAttribute('data-f') !== f) { tour.mouth.src = TALK_FR[f]; tour.mouth.setAttribute('data-f', f); }
    }, 110);
  }
  function say(text) {
    tour.full = text; tour.typing = 0;
    if (RMOTION) { tour.bub.textContent = text; renderButtons(); return; }
    tour.bub.textContent = ''; tour.typing = 1; renderButtons();
    var n = 0, id = ++tour.sayId;
    (function type() {
      if (id !== tour.sayId) return;
      n += 1; tour.bub.textContent = text.slice(0, n);
      if (n < text.length) setTimeout(type, text.charAt(n - 1) === ',' || text.charAt(n - 1) === '.' ? 160 : 34);
      else { tour.typing = 0; renderButtons(); }
    })();
  }
  tour.sayId = 0;
  function finishLine() { tour.sayId++; tour.typing = 0; tour.bub.textContent = tour.full; renderButtons(); }
  function renderButtons() {
    var T = STR[lang].tour, st = tour.steps && tour.steps[tour.i], b = tour.btns; b.textContent = '';
    if (!st) return;
    function btn(label, fn, ghost) { var x = document.createElement('button'); x.type = 'button'; x.className = 'tbtn' + (ghost ? ' tbtn--ghost' : ''); x.textContent = label; x.addEventListener('click', fn); b.appendChild(x); return x; }
    if (st.ask) { btn(T.no, function () { endTour(); }, true); btn(T.yes, function () { nextStep(); }); }
    else if (st.end) btn(T.next, function () { endTour(); });
    else { btn(T.skip, function () { endTour(); }, true); btn(T.next, function () { nextStep(); }); }
  }
  function lookAt(p) {
    if (RMOTION || !p) { tour.cam = null; return; }
    if (!tour.base) tour.base = { t: controls.target.clone(), z: camera.zoom };
    var t = tour.base.t.clone().lerp(p, 0.35), z = Math.min(controls.maxZoom, tour.base.z * 1.18);
    tour.cam = { t: t, z: z };
  }
  function tourCam(dt) {                                  // eased drift towards the goal, OrbitControls stays in charge of the rest
    if (!tour.cam || zoomed) return;
    var k = 1 - Math.exp(-dt * 2.6);
    controls.target.lerp(tour.cam.t, k); camera.zoom += (tour.cam.z - camera.zoom) * k; camera.updateProjectionMatrix();
    if (tour.cam.back && controls.target.distanceTo(tour.cam.t) < 0.01) { tour.cam = null; tour.base = null; }
  }
  function setState(st) {                                 // a status shown for the tour: its state, its hour, CS for the game
    if (!tour.saved) tour.saved = { forced: forced, preview: preview, kind: game.kind, name: game.name };
    if (st) { forced = st.state; preview = st.hour; if (st.game) { game.kind = 'cs'; game.name = 'Counter-Strike 2'; } }
    else { forced = tour.saved.forced; preview = tour.saved.preview; game.kind = tour.saved.kind; game.name = tour.saved.name; tour.saved = null; }
    readClock(); applyTime();
  }
  function showStep() {
    var st = tour.steps[tour.i];
    if (st.state) setState(st); else if (tour.saved) setState(null);
    (st.show || []).forEach(function (k) { tour.shown[k] = true; });
    if (st.look) lookAt(st.look); else if (tour.base && (st.real || st.end)) tour.cam = { t: tour.base.t.clone(), z: tour.base.z, back: true };
    say(tourLine(st.key));
  }
  function nextStep() { if (tour.i < tour.steps.length - 1) { tour.i++; showStep(); } else endTour(); }
  function startTour(again) {
    if (!tour.el) makeTalkie();
    tour.steps = tourSteps(); tour.i = again ? 1 : 0;
    tour.el.hidden = false; tour.el.classList.remove('talkie--mini'); $('note').style.opacity = 0;
    showStep();
  }
  function endTour() {
    tour.sayId++; tour.typing = 0;
    if (tour.saved) setState(null);
    if (tour.base) tour.cam = { t: tour.base.t.clone(), z: tour.base.z, back: true };
    tour.all = true; tour.steps = null; tour.btns.textContent = '';
    tour.el.classList.add('talkie--mini'); tour.mouth.setAttribute('aria-label', STR[lang].tour.again); tour.mouth.title = STR[lang].tour.again;
  }
  function tourLang() { if (tour.steps) { tour.sayId++; say(tourLine(tour.steps[tour.i].key)); } else if (tour.mouth) { tour.mouth.title = STR[lang].tour.again; tour.mouth.setAttribute('aria-label', STR[lang].tour.again); } }

  function build(gltf) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;        // no shadow maps: shadows are painted into vertex colours (PS1.md §8)
    stage.appendChild(renderer.domElement); makePost();
    scene = new THREE.Scene(); root = gltf.scene; scene.add(root);
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
    var h0 = (location.hash || '').replace('#', ''), from = h0 === 'southwest' ? [-1, 0.8, 1] : (h0 === 'northeast' ? [1, 0.6, -1] : (h0 === 'low' ? [1, 0.35, 1] : [1, 0.8, 1]));   // extra start angles, handy for checking the portal
    camera.position.copy(TARGET).addScaledVector(new THREE.Vector3(from[0], from[1], from[2]).normalize(), 120);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(TARGET); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.65;
    controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.38; controls.minZoom = 0.6; controls.maxZoom = 3; controls.update();

    // PS1 materials: lit things become Lambert (per vertex), everything outdoors Basic (unlit, tinted by the hour);
    // one converted copy per original material, so shared materials stay shared. Big flat surfaces get a vertex grid.
    var outdoor0 = root.getObjectByName('Outdoor'), conv = {};
    root.updateMatrixWorld(true);
    root.traverse(function (o) {
      if (!o.isMesh) return;
      var out = false; for (var p = o; p; p = p.parent) if (p === outdoor0) out = true;
      var m0 = o.material, key0 = m0.uuid + (out ? 'u' : 'l');
      if (!conv[key0]) {
        var m = conv[key0] = toPS1(m0, out);
        if (!out) { mat[m.name] = m; (byName[m.name] = byName[m.name] || []).push(m); }
        if (m.name === 'lamp_glow' && m.vertexColors) {      // the shade's painted top-to-bottom gradient shades its glow too
          m.userData.psxKey = 'glowvc';
          m.userData.psxExtra = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif'); };
          ps1(m);
        }
        if (m.name === 'window_glass' || m.name === 'pc_glass') { m.transparent = true; m.opacity = m.name === 'pc_glass' ? 0.22 : 0.1; m.depthWrite = false; }
      }
      o.material = conv[key0]; o.castShadow = o.receiveShadow = false;
      // flat decals (clock face, LED quads, painted plates) sit a millimetre off their base; vertex snapping tilts each
      // triangle's depth by up to half a pixel of slope, so without an offset the base wins and the decal vanishes
      if (!out && !/^Screen_|^Window_Glass$/.test(o.name)) {
        var db = new THREE.Box3().setFromObject(o), ds = db.getSize(new THREE.Vector3());
        if (Math.min(ds.x, ds.y, ds.z) < 0.004 && Math.max(ds.x, ds.y, ds.z) < 1 && !o.material.polygonOffset) {
          o.material.polygonOffset = true; o.material.polygonOffsetFactor = -2; o.material.polygonOffsetUnits = -4;
        }
      }
      if (o.name === 'Out_sea' || o.name === 'Out_shallow') tessellate(o, 6, 500);        // only for the slow bob
      else if (!out && !/^Screen_|^Window_Glass$/.test(o.name)) {      // the screens' corners define the hand-off frame
        // only big flat-ish parts need inner vertices for a lamp pool (desk top, mattress, headboard, rack, shelves, AC);
        // floor and walls already come as 0.5 m grids, so tessellate() leaves them alone. Long thin parts (skirting, sill,
        // bars, the slab under the floor) would only multiply triangles without a visible pool, so they are skipped.
        var ts = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).toArray().sort(function (a, b) { return b - a; });
        if (ts[0] > 1.0 && ts[1] > 0.3 && !/^Slab$|^Wall_/.test(o.name)) tessellate(o, 0.5, 2000);
      }
    });
    // Things laid onto other surfaces (poster prints, mouse pad, keyboard glow, LEDs, the duvet's folded band, wet sand,
    // foam...) sit a few millimetres off their base. Seen at a grazing angle that is not enough and the two flicker or the
    // print sinks in. Each gets its own material copy drawn with a depth bias, so it always wins against its base.
    var DECAL = /^(Poster_\d|Mousepad|Keyboard_glow|Keyboard$|Mouse$|Rack_led_|Rack_unit_|Router_led|AC_led|Desk_led|Shelf_led|PC_glass|PC_inner|PC_strip|PC_front_led|PC_power|Bed_duvet_\w+_fold|Bed_pillow|Mug_coffee|Out_wet|Out_foam|Out_wave_)/;      // (not the monitor necks: their edge-on sides got such a bias they showed through the screens)
    root.traverse(function (o) {
      if (!o.isMesh || !DECAL.test(o.name) || Array.isArray(o.material)) return;
      var c = cloneM(o.material); c.polygonOffset = true; c.polygonOffsetFactor = -2; c.polygonOffsetUnits = -4;
      c.userData.psxKey = (c.userData.psxKey || '') + 'dec'; o.material = c;
      if (byName[c.name]) byName[c.name].push(c);
    });
    // the face is flat shapes laid on a round head: bias them forward too, or an eye sinks at the curve
    ['eye_white', 'eye_dark', 'mouth', 'brow'].forEach(function (n) { (byName[n] || []).forEach(function (m) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; m.needsUpdate = true; }); });
    tex = { saver: liveCanvas('saver'), code: liveCanvas('code'), editor: screenTexture('editor'), terminal: screenTexture('terminal'), other: screenTexture('game'), dota: screenTexture('dota'), cs: screenTexture('cs'), youtube: screenTexture('youtube') };
    // the owner's own splash screens for Dota and CS replace the drawn placeholders once they load (kept if they fail)
    ['dota', 'cs'].forEach(function (k) {
      var im = new Image();
      im.onload = function () {
        var c = tex[k].image; c.width = 1280; c.height = 720;
        var g = c.getContext('2d'), r = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight), w = im.naturalWidth * r, hh = im.naturalHeight * r;
        g.drawImage(im, (c.width - w) / 2, (c.height - hh) / 2, w, hh);
        tex[k].needsUpdate = true;
      };
      im.src = 'games/' + k + '.jpg';
    });
    ['L', 'R'].forEach(function (s, i) {
      var sc = root.getObjectByName('Screen_' + s); if (!sc) return;
      sc.material = ps1(new THREE.MeshBasicMaterial({ map: i ? tex.terminal : tex.editor })); screens.push(sc.material);   // the canvases keep their filtering: they are the hand-off surface
      // the glass sits millimetres off the bezel: snapped, the bezel would win the depth test (only depth moves, not the frame)
      sc.material.polygonOffset = true; sc.material.polygonOffsetFactor = -2; sc.material.polygonOffsetUnits = -4;
      var mon = root.getObjectByName('Monitor_' + s); if (mon) monitors.push(mon);
    });

    // glow: an additive card a little larger than each screen (a PS1 light card, not bloom): a ring around the glass in four
    // hard steps, empty over the glass itself so the picture on the screen is never tinted
    var HN = 64, hm0 = HN * 0.1, hc = document.createElement('canvas'); hc.width = hc.height = HN; var hg = hc.getContext('2d'), hx, hy;
    for (hy = 0; hy < HN; hy++) for (hx = 0; hx < HN; hx++) {
      var ex = Math.max(hm0 - (hx + 0.5), 0, hx + 0.5 - (HN - hm0)), ey = Math.max(hm0 - (hy + 0.5), 0, hy + 0.5 - (HN - hm0)), hr = Math.hypot(ex, ey) / hm0;
      var step = hr > 0 ? Math.max(0, Math.ceil((1 - hr) * 4)) / 4 : 0;
      if (step > 0) { hg.fillStyle = 'rgba(255,255,255,' + (step * 0.9).toFixed(2) + ')'; hg.fillRect(hx, hy, 1, 1); }
    }
    var haloTex = nearest(new THREE.CanvasTexture(hc));
    ['L', 'R'].forEach(function (sd) {
      var sc = root.getObjectByName('Screen_' + sd); if (!sc) return;
      var hm = ps1(new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
      var halo = new THREE.Mesh(sc.geometry, hm); halo.position.copy(sc.position); halo.quaternion.copy(sc.quaternion);
      sc.geometry.computeBoundingBox(); var bc = sc.geometry.boundingBox.getCenter(new THREE.Vector3());
      halo.scale.copy(sc.scale).multiplyScalar(1.25); halo.position.sub(bc.clone().multiplyScalar(0.25).applyQuaternion(sc.quaternion));    // grow about the screen centre
      halo.renderOrder = 5; sc.parent.add(halo); halos.push(hm);
    });
    // Each monitor's panel (frame, glass, glow) sits in its own group pivoting on the glass centre, so the panel can take the
    // visitor's screen proportions (see fitMonitors): a 16:10 laptop gets a 16:10 monitor, and the flight into it ends on the
    // whole picture instead of a crop.
    ['L', 'R'].forEach(function (sd) {
      var mon = root.getObjectByName('Monitor_' + sd), sc = root.getObjectByName('Screen_' + sd), body = root.getObjectByName('Monitor_' + sd + '_body');
      if (!mon || !sc) return;
      mon.updateMatrixWorld(true);
      var pivot = new THREE.Group(); pivot.name = 'Panel_' + sd; pivot.position.copy(sc.position); mon.add(pivot); pivot.updateMatrixWorld(true);
      [body, sc].concat(sc.parent.children.filter(function (c) { return c.material && halos.indexOf(c.material) >= 0; })).forEach(function (o) { if (o) pivot.attach(o); });
      panels.push({ g: pivot, sc: sc });
    });
    // the screens' light: no shadow map any more; a cone aimed forward and down keeps most of it off the floor under the desk
    screenLight = new THREE.SpotLight(0xa9d2ff, 1, 5, 0.95, 1, 1);
    scene.add(screenLight); scene.add(screenLight.target);
    duvetMade = root.getObjectByName('Bed_duvet_made'); duvetSleep = root.getObjectByName('Bed_duvet_sleep');

    // the window is a portal: the coast is drawn only where the glass is visible, from any angle
    wallN = root.getObjectByName('WallN'); wallW = root.getObjectByName('WallW'); outdoor = root.getObjectByName('Outdoor');
    var portal = function (m) { m.stencilWrite = true; m.stencilFunc = THREE.EqualStencilFunc; m.stencilRef = 1; m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp; return m; };
    var seaPal = [0x0E86C8, 0x19A8D8, 0x5FD8E8, 0xFFFFFF], shorePal = [0x22C8C0, 0x4FE0D0, 0xA8F5E4, 0xFFFFFF];
    var tiles = { Out_sea: seaTile(seaPal, 7), Out_shallow: seaTile(shorePal, 7) }, layerB = [];
    outdoor.traverse(function (o) {
      if (!o.isMesh || o.userData.layerB) return;
      o.renderOrder = 3;
      if (o.name === 'Sun') { sunObj = o; sunMat = portal(ps1(new THREE.MeshBasicMaterial({ color: col(0xfff3c4) }))); o.material = sunMat; return; }
      o.material = portal(cloneM(o.material)); o.material.userData.base0 = o.material.color.clone(); outdoorMats.push(o.material);
      if (/^Cloud/.test(o.name)) o.material.userData.cloud = true;
      if (tiles[o.name]) {
        // layer A: the mesh itself, a 2 m tile in world xz; layer B: an additive copy just above, mirrored and 4/3 larger
        var p = o.geometry.attributes.position, uv = new Float32Array(p.count * 2), v = new THREE.Vector3(), j;
        for (j = 0; j < p.count; j++) { v.fromBufferAttribute(p, j).applyMatrix4(o.matrixWorld); uv[j * 2] = v.x / 2; uv[j * 2 + 1] = v.z / 2; }
        o.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        var m = o.material; m.map = tiles[o.name]; m.userData.base0.setRGB(1, 1, 1); m.userData.psxExtra = seaBob; m.userData.psxKey = 'sea'; ps1(m);
        seaLayers.push({ map: m.map, v: [5, 3] });
        var tb = m.map.clone(); tb.needsUpdate = true; tb.repeat.set(-0.75, 0.75);
        var mb = portal(cloneM(m)); mb.map = tb; mb.transparent = true; mb.opacity = 0.25; mb.blending = THREE.AdditiveBlending; mb.depthWrite = false;
        mb.userData.base0 = new THREE.Color(1, 1, 1); outdoorMats.push(mb); seaLayers.push({ map: tb, v: [-3, 4] });
        var b = new THREE.Mesh(o.geometry, mb); b.userData.layerB = true; b.position.copy(o.position); b.quaternion.copy(o.quaternion); b.scale.copy(o.scale);
        b.position.y += 0.005; b.renderOrder = 4; layerB.push([o.parent, b]);
      }
      if (/^Out_wave_|^Out_foam$/.test(o.name)) {
        o.userData.p0 = o.position.clone(); o.userData.ph = waves.length * 1.7; waves.push(o);
        // the shore foam is a scalloped cut-out band (alpha test, opaque), the wave lines fade in three steps
        if (o.name === 'Out_foam') { o.material.transparent = false; o.material.opacity = 1; o.material.alphaTest = 0.5; o.material.blending = THREE.NormalBlending; o.material.depthWrite = true; }
        else o.material.transparent = true;
      }
    });
    layerB.forEach(function (x) { x[0].add(x[1]); });
    // sky: 8 sides, 6 rings, colours per vertex (written by applyTime)
    var dg = new THREE.SphereGeometry(150, 8, 6); dg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dg.attributes.position.count * 3), 3));
    dome = new THREE.Mesh(dg, portal(ps1(new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, vertexColors: true }))));
    dome.renderOrder = 2; outdoor.add(dome);
    var glass = root.getObjectByName('Window_Glass');
    var mask = new THREE.Mesh(glass.geometry, ps1(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide })));
    mask.material.stencilWrite = true; mask.material.stencilRef = 1; mask.material.stencilFunc = THREE.AlwaysStencilFunc; mask.material.stencilZPass = THREE.ReplaceStencilOp;
    mask.position.copy(glass.position); mask.quaternion.copy(glass.quaternion); mask.scale.copy(glass.scale); mask.renderOrder = 1; mask.userData.mask = true; glass.parent.add(mask); portalMask = mask;
    makeFrames();
    // a wall the camera is behind turns see-through instead of vanishing; each wall gets its own material copies to fade
    fades = [wallN, wallW].map(function (g) {
      var list = [];
      g.traverse(function (o) {
        if (!o.isMesh || o.userData.mask) return;
        var m = cloneM(o.material), panel = /^Wall_/.test(o.name); (byName[m.name] = byName[m.name] || []).push(m);
        m.userData.base = m.transparent ? m.opacity : 1; m.userData.panel = panel; o.material = m; list.push(m);
        if (m.userData.base === 1) m.side = THREE.FrontSide;      // see-through walls show only their near faces, never their insides
        // fixed draw order while see-through: wall panels first, then what hangs on them, then glass. Without it the
        // renderer re-sorts them by distance every frame and each object seems to fade at its own pace.
        o.renderOrder = m.userData.base < 1 ? 12 : (panel ? 10 : 11);
      });
      return { mats: list, k: 1, t: 1 };
    });

    makeWeather(portal);
    makeTags();

    // light cards on the west wall: 32 px, four hard radial steps, additive; a PS1 light pool, not bloom
    var CN = 32, cc0 = document.createElement('canvas'); cc0.width = cc0.height = CN; var cg = cc0.getContext('2d');
    for (var cy = 0; cy < CN; cy++) for (var cx = 0; cx < CN; cx++) {
      var cr = Math.hypot((cx + 0.5) / CN * 2 - 1, (cy + 0.5) / CN * 2 - 1), cs = Math.max(0, Math.ceil((1 - cr) * 4)) / 4;
      if (cs > 0) { cg.fillStyle = 'rgba(255,255,255,' + cs.toFixed(2) + ')'; cg.fillRect(cx, cy, 1, 1); }
    }
    var cardTex = nearest(new THREE.CanvasTexture(cc0)), wallWm = root.getObjectByName('Wall_W'), wx = wallWm ? new THREE.Box3().setFromObject(wallWm).max.x : -3.5;
    [['Bedside_lamp_shade', 0xffb964, 0.9, 0.9, 0.18]].forEach(function (d) {
      var o = root.getObjectByName(d[0]); if (!o) return;
      var p = new THREE.Vector3(); o.getWorldPosition(p);
      if (d[0] === 'Bedside_lamp_shade') { var bb = new THREE.Box3().setFromObject(o); bb.getCenter(p); }
      var cm = ps1(new THREE.MeshBasicMaterial({ map: cardTex, color: col(d[1]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      var cmesh = new THREE.Mesh(new THREE.PlaneGeometry(d[2], d[3]), cm);
      cmesh.rotation.y = Math.PI / 2; cmesh.position.set(wx + 0.006, p.y, p.z); cmesh.renderOrder = 11;
      wallW.add(cmesh); wallW.worldToLocal(cmesh.position); cards.push({ m: cm, mesh: cmesh, base: d[4], on: 1 });
    });

    // the figure is not vertex-snapped (CRASH.md §4): one unsnapped copy per source material, shared by the four poses, listed
    // in byName so the LED levels still reach the headphones. A material already private to the coast (portal copy, tinted by
    // the hour) is flagged in place instead, so it stays in outdoorMats.
    var noSnap = {};
    STATES.forEach(function (k) {
      var me = root.getObjectByName('Me_' + k); if (!me) return;
      me.traverse(function (o) {
        if (!o.isMesh) return;
        var m0 = o.material;
        if (outdoorMats.indexOf(m0) >= 0) { m0.userData.psxNoSnap = true; m0.userData.psxKey = (m0.userData.psxKey || '') + 'ns'; ps1(m0); return; }
        if (!noSnap[m0.uuid]) {
          var c = cloneM(m0); c.userData.psxNoSnap = true; c.userData.psxKey = (c.userData.psxKey || '') + 'ns'; ps1(c);
          noSnap[m0.uuid] = c; if (c.name) (byName[c.name] = byName[c.name] || []).push(c);
        }
        o.material = noSnap[m0.uuid];
      });
    });
    STATES.forEach(function (k) {
      persons[k] = root.getObjectByName('Me_' + k);
      var parts = {}; ['head', 'torso', 'arm_n', 'arm_p', 'prop', 'breath'].forEach(function (p) { parts[p] = root.getObjectByName('Me_' + k + '_' + p); });
      Object.keys(parts).forEach(function (p) { if (parts[p]) parts[p].userData.q0 = parts[p].quaternion.clone(); });   // rest pose: idle motion is added on top, never replaces it
      rig[k] = parts;
    });
    swing = root.getObjectByName('Hammock_swing');
    // "z z z" over the bed while asleep: an 8x8 pixel z, nearest filtered
    var zc = document.createElement('canvas'); zc.width = zc.height = 8; var zg = zc.getContext('2d');
    zg.fillStyle = '#ffffff'; ['11111111', '00000110', '00001100', '00011000', '00110000', '01100000', '11111111'].forEach(function (row, ry) {
      for (var rx = 0; rx < 8; rx++) if (row[rx] === '1') zg.fillRect(rx, ry, 1, 1);
    });
    var zt = nearest(new THREE.CanvasTexture(zc));
    for (var zi = 0; zi < 3; zi++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: zt, transparent: true, depthTest: false, opacity: 0 })); sp.renderOrder = 20; sp.visible = false; scene.add(sp); zzz.push(sp); }
    var cd = root.getObjectByName('Clock_display');
    if (cd) {                                              // the digital clock's face is a tiny canvas, nearest-filtered like every PS1 texture
      var ccv = document.createElement('canvas'); ccv.width = 72; ccv.height = 32;
      var ct = nearest(new THREE.CanvasTexture(ccv)); ct.encoding = THREE.sRGBEncoding; ct.flipY = false;
      cd.material = ps1(new THREE.MeshBasicMaterial({ map: ct, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      clockDisp = { c: ccv, t: ct, key: '' };
    }
    anchor = root.getObjectByName('Anchor_projects');

    hemi = new THREE.HemisphereLight(0x8a86c8, 0x2a2238, 0.42); scene.add(hemi);
    key = new THREE.DirectionalLight(0xaab4ff, 0.12); key.position.set(5, 9, 6); scene.add(key);      // no shadow map
    var at = function (name, dy) { var v = new THREE.Vector3(); var o = root.getObjectByName(name); if (o) o.getWorldPosition(v); v.y += dy || 0; return v; };
    // linear falloff (decay 1) over short distances: over coarse vertices it gives the clean PS1 lamp pool
    // the lamps sit almost in the wall plane, where per-vertex N.L is ~0: pulled into the room so the wall gets a pool,
    // and a shorter reach so the pool has an edge on the 0.5 m grid
    [[at('Lamp_bar', 0).add(new THREE.Vector3(-0.30, 0.20, 0.50)), 0xffb964, 2.2, 3.5, lamps], [at('Bedside_lamp', 0.55).add(new THREE.Vector3(0.45, 0.10, 0.30)), 0xffb964, 1.7, 3.5, lamps],
     [at('Desk_led', -0.2), 0xff3fa8, 0.5, 2.5, glow], [at('PC_case', 0).add(new THREE.Vector3(0.3, 0, 0)), 0x29e0ff, 0.6, 2.5, glow]]
      .forEach(function (p) { var l = new THREE.PointLight(p[1], 0, p[3], 1); l.position.copy(p[0]); l.userData.max = p[2]; scene.add(l); p[4].push(l); });
    // aim the screen light from between the monitors towards the chair and the floor in front of the desk
    var sp = new THREE.Vector3(); anchor.getWorldPosition(sp); sp.y -= 0.32; sp.z += 0.08;
    screenLight.position.copy(sp); screenLight.target.position.set(sp.x - 0.1, 0.2, sp.z + 2.2); screenLight.target.updateMatrixWorld();
    // window fill: just inside the glass, the colour of the sky low down; on only when the room's own lights are off
    winFill = new THREE.PointLight(0x000000, 0, 7, 1); winFill.position.copy(at('Window_Glass', -0.2)).add(new THREE.Vector3(0, 0.4, 1.4)); scene.add(winFill);
    sunPatch = makeSunPatch();
    window.__psx = { psx: psx, scene: scene, renderer: renderer, camera: camera, controls: controls, sitDown: sitDown, standUp: standUp, strike: function () { if (wxFx) wxFx.next = 0.001; } };     // debug handle for screenshots
    layout(); applyTime();
  }

  /* The sun patch (CRASH.md §3): the window glass projected along the sun's direction onto the floor, clipped to the floor
     rectangle, drawn as one flat additive polygon with hard edges. Its opacity (0.4 x daylight, outside only) is set in applyTime. */
  function makeSunPatch() {
    var glass = root.getObjectByName('Window_Glass'), floor = root.getObjectByName('Floor'); if (!glass || !floor) return null;
    var gb = new THREE.Box3().setFromObject(glass), fb = new THREE.Box3().setFromObject(floor), Y = 0.004, D = new THREE.Vector3(0.25, -1.0, 0.75);
    var zg = gb.max.z;                                    // the room side of the glass
    var poly = [[gb.min.x, gb.min.y], [gb.max.x, gb.min.y], [gb.max.x, gb.max.y], [gb.min.x, gb.max.y]].map(function (c) {
      var k = (c[1] - Y) / -D.y; return [c[0] + D.x * k, zg + D.z * k];      // (x, z) on the floor
    });
    // Sutherland-Hodgman against the four floor edges
    [[0, fb.min.x, 1], [0, fb.max.x, -1], [1, fb.min.z, 1], [1, fb.max.z, -1]].forEach(function (e) {
      var out = [], inside = function (p) { return (p[e[0]] - e[1]) * e[2] >= 0; };
      poly.forEach(function (p, i) {
        var q = poly[(i + 1) % poly.length], a = inside(p), b = inside(q);
        if (a) out.push(p);
        if (a !== b) { var s = (e[1] - p[e[0]]) / (q[e[0]] - p[e[0]]); out.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]); }
      });
      poly = out;
    });
    if (poly.length < 3) return null;
    var pos = []; for (var i = 1; i < poly.length - 1; i++) [poly[0], poly[i + 1], poly[i]].forEach(function (p) { pos.push(p[0], Y, p[1]); });
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    var m = ps1(new THREE.MeshBasicMaterial({ color: col(0xFFE9A0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
    var mesh = new THREE.Mesh(g, m); mesh.name = 'Sun_patch'; mesh.renderOrder = 6; mesh.visible = false; scene.add(mesh); return mesh;
  }
  // the wall clock runs: hours and minutes from the Phuket clock (or the debug preview), seconds from the real clock
  function tickClock() {
    if (!clockDisp) return;
    var sec = new Date().getSeconds(), key = bkk.h + ':' + bkk.m + ':' + (sec % 2);
    if (key === clockDisp.key) return;
    clockDisp.key = key;
    var c = clockDisp.c, g = c.getContext('2d'), W = c.width, H = c.height;
    g.fillStyle = '#0A1022'; g.fillRect(0, 0, W, H);
    // seven-segment digits drawn as blocks, PS1-chunky; unlit segments faintly visible, as on a real LED clock
    var SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
    var on = '#3CF0FF', off = 'rgba(60,240,255,0.10)', dw = 12, dh = 22, t = 3;
    function digit(x, n) {
      var segs = SEG[n], rects = { a: [x + t, 4, dw - 2 * t, t], b: [x + dw - t, 4 + t, t, dh / 2 - t], c: [x + dw - t, 4 + dh / 2 + 1, t, dh / 2 - t],
        d: [x + t, 4 + dh - t + 1, dw - 2 * t, t], e: [x, 4 + dh / 2 + 1, t, dh / 2 - t], f: [x, 4 + t, t, dh / 2 - t], g: [x + t, 4 + dh / 2 - 1, dw - 2 * t, t] };
      Object.keys(rects).forEach(function (k) { var r = rects[k]; g.fillStyle = segs.indexOf(k) >= 0 ? on : off; g.fillRect(r[0], r[1], r[2], r[3]); });
    }
    var hh = ('0' + bkk.h).slice(-2), mm = ('0' + bkk.m).slice(-2), x0 = 6;
    digit(x0, +hh[0]); digit(x0 + 15, +hh[1]);
    g.fillStyle = sec % 2 ? on : off; g.fillRect(x0 + 30, 11, 3, 3); g.fillRect(x0 + 30, 19, 3, 3);      // the colon blinks every second
    digit(x0 + 36, +mm[0]); digit(x0 + 51, +mm[1]);
    clockDisp.t.needsUpdate = true;
  }
  // PS1 pixels per metre of the room at zoom 1 (CRASH.md: 96, the cleaner hi-res look)
  var PSX_PX_PER_M = 96;
  var panels = [], panelA0 = 0;
  function fitMonitors() {
    if (!panels.length || zoomed) return;
    panels.forEach(function (p) { p.g.scale.set(1, 1, 1); p.g.updateMatrixWorld(true); });
    if (!panelA0) { var f0 = screenFrame(panels[0].sc); panelA0 = f0.w / f0.h; }
    var W = stage.clientWidth || window.innerWidth, H = stage.clientHeight || window.innerHeight;
    if (W <= H) return;                                   // portrait phones keep the stock 16:9 panel
    var target = Math.max(1.33, Math.min(2.4, W / H)), sy = panelA0 / target;
    panels.forEach(function (p) { p.g.scale.set(1, sy, 1); p.g.updateMatrixWorld(true); });
  }
  function layout() {
    fitMonitors();
    if (liveC.codeR) codeCanvasFor(stage.clientWidth || window.innerWidth, stage.clientHeight || window.innerHeight);
    var w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight, aspect = w / h;
    renderer.setSize(w, h, false);
    var vh = Math.max(8.6, 9.6 / aspect);
    psx.base = h * renderer.getPixelRatio() / (vh * PSX_PX_PER_M);      // device pixels per PS1 pixel at zoom 1; render() scales it with the zoom
    psx.S0 = Math.max(2, Math.min(8, Math.round(psx.base)));
    camera.left = -vh * aspect / 2; camera.right = vh * aspect / 2; camera.top = vh / 2; camera.bottom = -vh / 2; camera.updateProjectionMatrix();
  }

  /* ---------- idle animations: one small loop per state ---------- */
  // Figure parts are separate meshes with their origins on the joints (see character.py), so each is turned about its joint.
  // In a figure's own axes: x is sideways, y is up, -z is forward.
  var poseE = has3d ? new THREE.Euler() : null, poseQ = has3d ? new THREE.Quaternion() : null;
  function pose(o, x, y, z) {                                                   // small offset from the modelled rest pose
    if (!o || !o.userData.q0) return;
    o.quaternion.copy(o.userData.q0).multiply(poseQ.setFromEuler(poseE.set(x || 0, y || 0, z || 0)));
  }
  function idle(t) {
    var st = status(), r = rig[st], i;
    if (swing) swing.rotation.x = Math.sin(t * 1.1) * (st === 'outside' ? 0.085 : 0.03);        // the hammock always sways a little; more with someone in it
    zzz.forEach(function (sp) { sp.visible = st === 'sleep'; });
    if (!r || !r.head) return;
    if (st === 'work') {
      var look = Math.sin(t * 0.42); look = look * look * look;                 // dwells on one monitor, then glances at the other
      pose(r.head, Math.sin(t * 0.9) * 0.015, look * 0.3, 0);
      var burst = smooth(-0.25, 0.15, Math.sin(t * 0.6));                       // types in bursts with short pauses
      pose(r.arm_n, Math.max(0, Math.sin(t * 13)) * 0.05 * burst);
      pose(r.arm_p, Math.max(0, Math.sin(t * 13 + 2.4)) * 0.05 * burst);
      r.torso.scale.y = 1 + Math.sin(t * 1.5) * 0.008;
    } else if (st === 'play') {
      var lean = Math.sin(t * 1.25) * 0.07 + Math.sin(t * 3.1) * 0.025;         // leans into the turns
      pose(r.head, Math.sin(t * 2.3) * 0.03, 0, lean);
      pose(r.arm_n, Math.sin(t * 15) * 0.014); pose(r.arm_p, Math.sin(t * 15 + 1.7) * 0.014);      // thumbs at work
      pose(r.prop, Math.sin(t * 9) * 0.035, 0, lean * 0.5);
      r.torso.scale.y = 1 + Math.sin(t * 1.8) * 0.008;
    } else if (st === 'sleep') {
      var b = Math.sin(t * 1.15);                                               // slow breathing under the blanket
      if (duvetSleep) duvetSleep.scale.set(1, 1 + b * 0.035, 1);              // the duvet rises and falls with the sleeper
      pose(r.head, b * 0.012); pose(r.arm_n, b * 0.01); pose(r.arm_p, b * 0.01);
      r.head.getWorldPosition(zHead);
      for (i = 0; i < zzz.length; i++) {
        var p = (t / 3.2 + i / zzz.length) % 1, sp = zzz[i];
        sp.position.set(zHead.x + 0.2 + p * 0.22 + Math.sin(p * 6) * 0.05, zHead.y + 0.45 + p * 0.75, zHead.z + 0.1);   // starts clear of the face
        sp.scale.setScalar(0.12 + p * 0.2); sp.material.opacity = Math.sin(Math.PI * p) * 0.9;
      }
    } else if (st === 'outside') {
      pose(r.arm_p, Math.sin(t * 1.1 + 0.9) * 0.12);                      // the hanging arm trails behind the swing
      pose(r.head, Math.sin(t * 0.55) * 0.035);
      r.torso.scale.y = 1 + Math.sin(t * 1.3) * 0.008;
    }
  }

  /* ---------- panels ---------- */
  var drawer = $('drawer'), sheet = $('sheet'), sheetBack = $('sheet-back');
  function setHash(h) { if ((location.hash || '').replace('#', '') !== h) location.hash = h; }
  function openDrawer() { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); setHash('projects'); }
  function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); if ((location.hash || '') === '#projects') setHash(''); }
  function openResume() { sheet.hidden = false; sheet.style.opacity = 1; sheet.scrollTop = 0; sheetBack.hidden = false; setHash('resume'); }
  function closeResume() { sheet.hidden = true; sheetBack.hidden = true; if ((location.hash || '') === '#resume') setHash(''); }
  $('pin').addEventListener('click', function () { sitDown('L'); }); $('close-drawer').addEventListener('click', closeDrawer);
  $('open-resume').addEventListener('click', openResume); sheetBack.addEventListener('click', closeResume);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); closeResume(); } });
  function route() {
    var h = (location.hash || '').replace('#', '');
    var times = { day: 13, sunset: 18.2, night: 1.5 };      // a state link keeps the real hour: the light follows the clock
    preview = times[h] != null ? times[h] : null;
    forced = (h === 'work' || h === 'play' || h === 'sleep' || h === 'outside') ? h : null;
    if (h === 'pcdota') h = 'dota';
    if (h === 'dota' || h === 'cs') { forced = 'play'; game.kind = h; game.name = h === 'dota' ? 'Dota 2' : 'Counter-Strike 2'; }
    if (h === 'resume') openResume(); else if (!sheet.hidden) closeResume();
    if (h === 'projects') openDrawer(); else if (drawer.classList.contains('open')) closeDrawer();
    readClock(); applyTime();
  }
  window.addEventListener('hashchange', route);

  /* ---------- sitting down at the PC ---------- */
  // The camera flies to the clicked monitor until its screen fills the view, then the desktop (xp/core.js) fades in exactly
  // over it and grows to the full window. Leaving plays the same in reverse. Without the desktop script the old drawer opens.
  function screenFrame(mesh) {
    var p = mesh.geometry.attributes.position, pts = [], i;
    mesh.updateWorldMatrix(true, false);
    for (i = 0; i < p.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
    var c = pts.reduce(function (a, v) { return a.add(v); }, new THREE.Vector3()).multiplyScalar(1 / pts.length);
    var e1 = pts[1].clone().sub(pts[0]), e2 = pts[2].clone().sub(pts[0]), n = e1.clone().cross(e2).normalize();
    if (n.dot(camera.position.clone().sub(c)) < 0) n.negate();
    // the glass's own axes: across (horizontal in the world) and up along the glass
    var across = new THREE.Vector3(0, 1, 0).cross(n).normalize(), upG = n.clone().cross(across).normalize();
    var w = 0, h = 0;
    pts.forEach(function (v) { var d = v.clone().sub(c); w = Math.max(w, Math.abs(d.dot(across)) * 2); h = Math.max(h, Math.abs(d.dot(upG)) * 2); });
    return { c: c, n: n, w: w, h: h, up: upG };
  }

  /* ---------- live screens: the floating logo while the owner sleeps or is out, an opencode session while he works ---------- */
  var liveC = {}, liveKey = '';
  function liveCanvas(name) {
    var c = document.createElement('canvas'); c.width = 768; c.height = 432;
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.flipY = false; screenFilter(t);
    liveC[name] = c; return t;
  }
  var flagImg = null, SAVER_BG = '#0a1a4a';      // the same colour as the desktop's own saver (xp/core.js, xp.css)
  function tri(x, span) { var m = ((x % (2 * span)) + 2 * span) % (2 * span); return m < span ? m : 2 * span - m; }      // bounce between 0 and span
  // where the floating logo is at time t, as a 0..1 share of its free travel: the monitor in the room and the screen saver
  // inside the desktop both read this, so the logo is in the same place when one takes over from the other
  function saverUV(t) { return { u: tri(40 + t * 46, 518) / 518, v: tri(25 + t * 31, 354) / 354 }; }
  function drawSaver(t) {
    var c = liveC.saver, g = c.getContext('2d'), W = c.width, H = c.height, bw = 250, bh = 78;
    if (!flagImg && window.XP_ICO && window.XP_ICO.logo) { flagImg = new Image(); flagImg.src = window.XP_ICO.logo; }
    g.fillStyle = SAVER_BG; g.fillRect(0, 0, W, H);      // deep blue, not black: asleep, the screens are the room's light source
    var uv = saverUV(t), x = uv.u * (W - bw), y = uv.v * (H - bh);
    if (flagImg && flagImg.complete && flagImg.naturalWidth) g.drawImage(flagImg, x, y + 4, 70, 70 * flagImg.naturalHeight / flagImg.naturalWidth);
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#fff'; g.font = 'italic bold 34px "Trebuchet MS", Tahoma, sans-serif'; g.fillText('Windows', x + 80, y + 54);
    var w = g.measureText('Windows').width;
    g.fillStyle = '#F7941D'; g.font = 'italic bold 20px "Trebuchet MS", Tahoma, sans-serif'; g.fillText('XD', x + 82 + w, y + 38);
  }
  /* An opencode session that never ends: the owner asks to centre a div, the agent tries, the test says "almost", repeat.
     Every attempt is assembled from phrase pools with a seeded random, so it keeps going without visibly looping.
     Line kinds: u = the owner's prompt, a = the agent's text, t = a tool call, + / - = diff lines, o = tool output, ' ' = a gap. */
  var codeS = new CodeSession();
  function drawCode(t) {
    codeS.step(codeS.last ? Math.min(Math.max(t - codeS.last, 0), 0.25) : (RMOTION ? 40 : 6)); codeS.last = t;      // starts a few lines in, never from an empty screen
    paintCode(liveC.code, t, 1);
    if (liveC.codeR && zoomed) { var d = liveC.codeR.userData; paintCode(liveC.codeR, t, d.dpr); }      // the readable copy for the desktop window
  }
  // A second, page-sized canvas for the opencode window on the desktop: the monitor's 768x432 picture is right for the
  // hand-off frame, but on a narrow phone it is either cropped or unreadably small. This one has the window's own shape,
  // the same session, and lines wrapped to its width.
  function codeCanvasFor(Wc, Hc) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), c = liveC.codeR || document.createElement('canvas');
    c.width = Math.round(Wc * dpr); c.height = Math.round(Hc * dpr); c.userData = { dpr: dpr };
    liveC.codeR = c; return c;
  }
  function wrapText(g, tx, maxW) {
    if (!tx || g.measureText(tx).width <= maxW) return [tx];
    var out = [], words = tx.split(' '), line = '';
    words.forEach(function (w) {
      var tryL = line ? line + ' ' + w : w;
      if (g.measureText(tryL).width <= maxW) { line = tryL; return; }
      if (line) out.push(line);
      while (g.measureText(w).width > maxW && w.length > 1) {     // a single long token: hard split
        var n = w.length; while (n > 1 && g.measureText(w.slice(0, n)).width > maxW) n--;
        out.push(w.slice(0, n)); w = w.slice(n);
      }
      line = w;
    });
    if (line) out.push(line);
    return out;
  }
  function paintCode(c, t, k) {
    var g = c.getContext('2d'), W = c.width / k, H = c.height / k, i, narrow = W < 520;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, W, H);
    g.textBaseline = 'middle';
    var pad = narrow ? 12 : 18;
    // header
    g.font = 'bold 15px Menlo, Consolas, monospace'; g.fillStyle = '#e8e8e8'; g.fillText('open', pad, 20);
    g.fillStyle = '#808080'; g.fillText('code', pad + g.measureText('open').width, 20);
    g.font = '12px Menlo, Consolas, monospace'; g.fillStyle = '#5c5c5c';
    if (!narrow) g.fillText('~/Projects/landing', 110, 21);
    g.textAlign = 'right'; g.fillText('v1.3.0', W - pad, 21); g.textAlign = 'left';
    // transcript: finished lines plus the one being typed, each wrapped to the width, the tail kept in view
    var src = codeS.lines.map(function (l) { return [l[0], l[1], false]; }), lh = 19, rows = [];
    if (codeS.cur) src.push([codeS.cur[0], codeS.cur[1].slice(0, Math.floor(codeS.shown)), true]);
    g.font = '13px Menlo, Consolas, monospace';
    var indent = { u: 14, a: 14, t: 30, '+': 46, '-': 46, o: 30, ' ': 0 };
    src.forEach(function (r) {
      var parts = wrapText(g, r[1], W - pad * 2 - (indent[r[0]] || 0) - 10);
      parts.forEach(function (tx, j) { rows.push([r[0], tx, r[2] && j === parts.length - 1, j > 0]); });
    });
    var maxRows = Math.floor((H - 40 - 74) / lh), from = Math.max(0, rows.length - maxRows), y = 46;
    for (i = from; i < rows.length; i++, y += lh) {
      var kd = rows[i][0], tx = rows[i][1], cont = rows[i][3], x = pad;
      if (kd === 'u') { g.fillStyle = '#141414'; g.fillRect(pad, y - lh / 2, W - pad * 2, lh); g.fillStyle = '#fab283'; g.fillRect(pad, y - lh / 2, 3, lh); g.fillStyle = '#eeeeee'; x = pad + 14; }
      else if (kd === 'a') { g.fillStyle = '#d0d0d0'; x = pad + 14; }
      else if (kd === 't') { if (!cont) { g.fillStyle = '#5c9cf5'; g.fillText('∗', pad + 14, y); } g.fillStyle = '#9d9d9d'; x = pad + 30; }
      else if (kd === '+') { g.fillStyle = '#12261a'; g.fillRect(pad + 30, y - lh / 2, W - pad * 2 - 30, lh); if (!cont) { g.fillStyle = '#7fd88f'; g.fillText('+', pad + 34, y); } g.fillStyle = '#7fd88f'; x = pad + 46; }
      else if (kd === '-') { g.fillStyle = '#2a1416'; g.fillRect(pad + 30, y - lh / 2, W - pad * 2 - 30, lh); if (!cont) { g.fillStyle = '#e06c75'; g.fillText('-', pad + 34, y); } g.fillStyle = '#e06c75'; x = pad + 46; }
      else if (kd === 'o') { g.fillStyle = /✓/.test(tx) ? '#7fd88f' : (/✗/.test(tx) ? '#e06c75' : '#6f6f6f'); x = pad + 30; }
      g.fillText(tx, x, y);
      if (rows[i][2] && Math.floor(t * 3) % 2) { g.fillStyle = '#fab283'; g.fillRect(x + g.measureText(tx).width + 2, y - 7, 7, 14); }
    }
    // prompt box and footer
    var by = H - 66, asking = codeS.asking;
    g.fillStyle = '#141414'; g.fillRect(pad, by, W - pad * 2, 34); g.fillStyle = '#fab283'; g.fillRect(pad, by, 3, 34);
    if (Math.floor(t * 2) % 2) { g.fillStyle = '#eeeeee'; g.fillRect(pad + 14, by + 10, 8, 14); }
    g.font = '12px Menlo, Consolas, monospace';
    g.fillStyle = '#5c9cf5'; g.fillText('Build', pad, H - 16);
    g.fillStyle = '#5c5c5c';
    var spin = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'.charAt(Math.floor(t * 10) % 10);
    g.fillText(narrow ? (asking ? '' : spin + ' working') : (asking ? 'tab switch agent   ctrl+p commands' : spin + ' working   esc interrupt'), pad + 52, H - 16);
    g.textAlign = 'right'; g.fillText('попытка №' + Math.max(1, codeS.n), W - pad, H - 16); g.textAlign = 'left';
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  var liveLast = -1, liveT = 0;                      // liveT: the time the monitor picture was last drawn for
  function liveScreens(t) {
    if (!tex || !tex.saver) return;
    var st = status(), f = Math.floor(t * (st === 'work' ? 12 : 30));              // the terminal needs fewer redraws than the logo
    if (st === 'work') { if (f !== liveLast || liveKey !== st) { drawCode(t); tex.code.needsUpdate = true; } }
    else if (st === 'sleep' || st === 'outside') { liveT = RMOTION ? 3 : t; drawSaver(liveT); tex.saver.needsUpdate = true; }      // every frame, and the desktop's saver reads the same liveT
    liveLast = f; liveKey = st;
  }

  function tweenCam(to, dur, done, tick) {
    var from = { p: camera.position.clone(), t: controls.target.clone(), z: camera.zoom }, t0 = performance.now();
    controls.enabled = false;
    (function step() {
      var k = Math.min(1, (performance.now() - t0) / (dur * 1000)); if (RMOTION) k = 1;       // same clock as t0; the frame timestamp can run on another one
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(from.p, to.p, e); controls.target.lerpVectors(from.t, to.t, e);
      camera.zoom = Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e); camera.updateProjectionMatrix(); camera.lookAt(controls.target);
      camera.updateMatrixWorld();
      if (tick) tick(k, e);
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    })();
  }
  function ramp(a, b, x) { return Math.max(0, Math.min(1, (x - a) / (b - a))); }
  // what monitor i shows for the current status (0 = left, 1 = right)
  function screenTex(i) {
    var st = status();
    return st === 'play' ? (i ? tex.youtube : (tex[game.kind] || tex.other)) : (st === 'sleep' || st === 'outside') ? tex.saver : (i ? tex.editor : tex.code);
  }
  // debug: slows the whole fly-to-monitor transition down (camera, hand-off, wake-up) to inspect it frame by frame
  var SLOW = 1;
  /* Fading objects in and out: each mesh gets its own transparent copy of its material for the duration (materials are
     shared across the room, e.g. the chair's black is also the desk legs'), and the original comes back at full opacity. */
  function fadeObjs(objs, a) {
    objs.forEach(function (root0) {
      if (!root0) return;
      root0.traverse(function (m) {
        if (!m.isMesh) return;
        var u = m.userData;
        if (!u.fadeMat) {
          u.baseMat = m.material;
          u.fadeMat = (Array.isArray(m.material) ? m.material : [m.material]).map(function (x) { var c = cloneM(x); c.transparent = true; return c; });
          u.baseOpacity = u.fadeMat.map(function (x) { return x.opacity; });
        }
        if (a >= 1) { m.material = u.baseMat; m.castShadow = u.baseShadow != null ? u.baseShadow : m.castShadow; return; }
        if (u.baseShadow == null) u.baseShadow = m.castShadow;
        m.material = Array.isArray(u.baseMat) ? u.fadeMat : u.fadeMat[0];
        u.fadeMat.forEach(function (x, i) { x.opacity = u.baseOpacity[i] * a; x.depthWrite = a > 0.6; });
        m.castShadow = u.baseShadow && a > 0.5;
      });
      root0.visible = a > 0.002;
    });
  }
  // The desktop shell is built ahead of time (invisible, full-size), so the click on a monitor starts the camera at once
  // instead of spending its first frames creating a few hundred elements.
  function ensureDesktop() {
    if (!xpRoot) { xpRoot = document.createElement('div'); xpRoot.id = 'xp-root'; document.body.appendChild(xpRoot); }
    xpRoot.style.cssText = 'position:fixed;z-index:40;overflow:hidden;left:0;top:0;width:100%;height:100%;opacity:0;transform-origin:0 0;pointer-events:none;will-change:transform,opacity';
    if (!xpMounted) {
      window.XPDesktop.mount(xpRoot, { lang: lang, phuketTime: function () { return { h: bkk.h, m: bkk.m }; }, status: status, onExit: standUp, onOpenResume: openResume,
        saverPos: function () { return saverUV(liveT); }, saverBase: 768,
        onLangChange: function (l) { if (l !== lang) setLang(l); } });      // the desktop's language switch moves the whole page too      // exactly the position the monitor shows this frame
      xpMounted = true;
    }
  }
  /* Sitting down at the computer, with no overlay tricks:
     1. The camera flies to the monitor and stops head-on, zoomed so that the glass COVERS the window (its edges end up
        just outside the page, like walking up close to a screen). Until then the only thing on the monitor is its own
        3D texture.
     2. In that last frame the page shows nothing but the glass, i.e. the monitor's canvas stretched over the glass and
        cropped by the window. The desktop opens with exactly that picture: the same canvas, in a box with the glass's
        proportions, covering the window the same way. So the switch from 3D to the real desktop changes no pixel.
     3. Then the desktop does what a computer would: a game or the terminal minimizes to the taskbar, a screen saver
        is dismissed (the owner is away), and the desktop underneath is live. */
  /* The minimize happens ON THE MONITOR, at the very start of the flight: the picture (terminal, game, screen saver) folds into
     the taskbar of a desktop painted onto the glass from the real one (same wallpaper, icons, taskbar, clock, measured from
     the live DOM desktop, which is already open and laid out, just invisible). When the camera arrives the painted desktop
     is swapped for the real one. */
  var snapImgs = {};
  // an icon label as the browser wrapped it: each line's text and box, read character by character from the layout
  function labelLines(el, rr) {
    var out = [], rg = document.createRange(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, cur = null;
    while ((n = walker.nextNode())) {
      for (var i = 0; i < n.length; i++) {
        rg.setStart(n, i); rg.setEnd(n, i + 1);
        var b = rg.getBoundingClientRect(); if (!b.width && !b.height) continue;
        if (!cur || b.top > cur.top + b.height * 0.5) { cur = { t: '', top: b.top, x0: b.left, x1: b.right, y: b.top - rr.top, h: b.height }; out.push(cur); }
        cur.t += n.data.charAt(i); cur.x0 = Math.min(cur.x0, b.left); cur.x1 = Math.max(cur.x1, b.right);
      }
    }
    return out.map(function (l) { return { t: l.t.trim(), x: l.x0 - rr.left, w: l.x1 - l.x0, y: l.y, h: l.h }; });
  }
  function deskSnapshot() {
    var rootEl = xpRoot && xpRoot.querySelector('.xp'); if (!rootEl) return null;
    var rr = rootEl.getBoundingClientRect();
    function rel(el) { var b = el.getBoundingClientRect(); return { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height }; }
    function img(src) { if (!src) return null; var im = snapImgs[src]; if (!im) { im = snapImgs[src] = new Image(); im.src = src; } return im; }      // cached: a re-measure never paints a frame without the wallpaper
    var snap = { W: rr.width, H: rr.height, icons: [] };
    var wi = rootEl.querySelector('.xp-wall image'); snap.wall = img(wi ? (wi.getAttribute('href') || wi.getAttribute('xlink:href')) : window.XP_WALL);
    var tb = rootEl.querySelector('.xp-taskbar'); if (tb) snap.tb = rel(tb);
    var sb = rootEl.querySelector('.xp-startbtn');
    if (sb) { snap.sb = rel(sb); var bi = getComputedStyle(sb).backgroundImage, mm = /url\("?([^")]+)"?\)/.exec(bi || ''); snap.sbImg = img(mm && mm[1]); }
    var tray = rootEl.querySelector('.xp-tray'); if (tray) snap.tray = rel(tray);
    var ck = rootEl.querySelector('.xp-clock'); snap.clock = ck ? ck.textContent : '';
    var lg = rootEl.querySelector('.xp-lang'); if (lg) { snap.lang = lg.textContent; snap.langR = rel(lg); }
    // every small picture in the taskbar (start flag, quick launch, task and tray icons) is drawn where it sits
    snap.bits = [];
    if (tb) tb.querySelectorAll('image').forEach(function (ie) {
      var b = ie.getBoundingClientRect(); if (!b.width) return;
      snap.bits.push({ r: { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height }, im: img(ie.getAttribute('href') || ie.getAttribute('xlink:href')) });
    });
    var st = rootEl.querySelector('.xp-startbtn__t'); if (st) { snap.startT = st.textContent; snap.startTR = rel(st); snap.startFont = getComputedStyle(st).font; }
    var tk = rootEl.querySelectorAll('.xp-task'); if (tk.length) { var t = tk[tk.length - 1]; snap.task = rel(t); snap.taskText = t.textContent.trim(); var ti = t.querySelector('image'); snap.taskIcon = img(ti && ti.getAttribute('href')); }
    rootEl.querySelectorAll('.xp-icon').forEach(function (ic) {
      var im = ic.querySelector('.xp-icon__img'), lb = ic.querySelector('.xp-icon__label'), ie = im && im.querySelector('image');
      if (!im || getComputedStyle(ic).visibility === 'hidden') return;
      snap.icons.push({ r: rel(im), im: img(ie && ie.getAttribute('href')), label: lb ? lb.textContent : '', lr: lb ? rel(lb) : null, lines: lb ? labelLines(lb, rr) : null,
        font: lb ? (function (cs) { return { fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: +cs.fontWeight || 400 }; })(getComputedStyle(lb)) : null });
    });
    return snap;
  }
  function paintDesk(c, snap, A) {
    var g = c.getContext('2d'), cw = c.width, ch = c.height, W = snap.W, H = snap.H, rw, rh;
    if (W / H > A) { rw = cw; rh = cw * H / W; } else { rh = ch; rw = ch * W / H; }
    var rx = (cw - rw) / 2, ry = (ch - rh) / 2, s = rw / W;
    var R2 = function (r) { return [rx + r.x * s, ry + r.y * s, r.w * s, r.h * s]; };
    g.fillStyle = '#3A6EA5'; g.fillRect(0, 0, cw, ch);
    var wl = snap.wall;
    if (wl && wl.complete && wl.naturalWidth) { var k = Math.max(rw / wl.naturalWidth, rh / wl.naturalHeight), dw = wl.naturalWidth * k, dh = wl.naturalHeight * k; g.drawImage(wl, rx + (rw - dw) / 2, ry + (rh - dh) / 2, dw, dh); }
    g.textAlign = 'center'; g.textBaseline = 'top';
    snap.icons.forEach(function (ic) {
      var b = R2(ic.r); if (ic.im && ic.im.complete && ic.im.naturalWidth) g.drawImage(ic.im, b[0], b[1], b[2], b[3]);
      if (ic.lines && ic.lines.length) {            // line by line, exactly where the desktop wrapped the label
        var fs = ic.font ? parseFloat(ic.font.fontSize) || 11 : 11, ff = ic.font ? ic.font.fontFamily : 'Tahoma, Verdana, sans-serif';
        g.font = (ic.font && ic.font.fontWeight >= 600 ? 'bold ' : '') + (fs * s) + 'px ' + ff; g.textBaseline = 'middle';
        ic.lines.forEach(function (ln) {
          var cx = rx + (ln.x + ln.w / 2) * s, cy = ry + (ln.y + ln.h / 2) * s;
          g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillText(ln.t, cx + s, cy + s);
          g.fillStyle = '#fff'; g.fillText(ln.t, cx, cy);
        });
        g.textBaseline = 'top';
      } else if (ic.lr && ic.label) {
        var l = R2(ic.lr); g.font = (11 * s) + 'px Tahoma, Verdana, sans-serif';
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillText(ic.label, l[0] + l[2] / 2 + s, l[1] + s, l[2] + 20 * s);
        g.fillStyle = '#fff'; g.fillText(ic.label, l[0] + l[2] / 2, l[1], l[2] + 20 * s);
      }
    });
    if (snap.tb) {
      var t = R2(snap.tb), gr = g.createLinearGradient(0, t[1], 0, t[1] + t[3]);
      [[0, '#1C4CB8'], [0.03, '#3F82EE'], [0.09, '#2B6CE2'], [0.45, '#2560D6'], [0.8, '#2057CB'], [0.95, '#1A47AE'], [1, '#143A93']].forEach(function (st) { gr.addColorStop(st[0], st[1]); });
      g.fillStyle = gr; g.fillRect(t[0], t[1], t[2], t[3]);
    }
    if (snap.tray) {
      var tr = R2(snap.tray), g2 = g.createLinearGradient(0, tr[1], 0, tr[1] + tr[3]);
      [[0, '#0F86DC'], [0.04, '#27AEF5'], [0.1, '#17A0EE'], [0.5, '#1290E3'], [0.9, '#0F82D6'], [1, '#0B6CBC']].forEach(function (st) { g2.addColorStop(st[0], st[1]); });
      g.fillStyle = g2; g.fillRect(tr[0], tr[1], tr[2], tr[3]);
      g.fillStyle = '#fff'; g.font = (11 * s) + 'px Tahoma, Verdana, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(snap.clock, tr[0] + tr[2] - 10 * s, tr[1] + tr[3] / 2);
      if (snap.langR) { var lr = R2(snap.langR); g.textAlign = 'center'; g.fillText(snap.lang, lr[0] + lr[2] / 2, lr[1] + lr[3] / 2); }
    }
    if (snap.sb) { var sb = R2(snap.sb); if (snap.sbImg && snap.sbImg.complete && snap.sbImg.naturalWidth) g.drawImage(snap.sbImg, sb[0], sb[1], sb[2], sb[3]); }
    if (snap.startT && snap.startTR) {
      var sr = R2(snap.startTR); g.font = 'italic bold ' + (14 * s) + 'px "Trebuchet MS", Tahoma, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText(snap.startT, sr[0] + s, sr[1] + sr[3] / 2 + s); g.fillStyle = '#fff'; g.fillText(snap.startT, sr[0], sr[1] + sr[3] / 2);
    }
    if (snap.task) taskButton(g, R2(snap.task), snap, s, snap.taskText, true);
    (snap.bits || []).forEach(function (bt) { var b = R2(bt.r); if (bt.im && bt.im.complete && bt.im.naturalWidth) g.drawImage(bt.im, b[0], b[1], b[2], b[3]); });
    return { rx: rx, ry: ry, s: s, R2: R2 };
  }
  function taskButton(g, b, snap, s, label, noIcon) {
    var gr = g.createLinearGradient(0, b[1], 0, b[1] + b[3]);
    gr.addColorStop(0, '#4F93F5'); gr.addColorStop(0.12, '#3D82EC'); gr.addColorStop(0.6, '#3275E3'); gr.addColorStop(1, '#2A68D6');
    g.fillStyle = gr; g.fillRect(b[0], b[1], b[2], b[3]);
    if (!noIcon && snap.taskIcon && snap.taskIcon.complete && snap.taskIcon.naturalWidth) g.drawImage(snap.taskIcon, b[0] + 6 * s, b[1] + (b[3] - 16 * s) / 2, 16 * s, 16 * s);
    g.fillStyle = '#fff'; g.font = (11 * s) + 'px Tahoma, Verdana, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(label || '', b[0] + 26 * s, b[1] + b[3] / 2, b[2] - 30 * s);
  }
  function sitDown(which) {
    if (zoomed || !ready) return;
    if (!window.XPDesktop) { openDrawer(); return; }
    var mesh = root.getObjectByName('Screen_' + (which || 'L')); if (!mesh) return;
    hotK = 0; monitors.forEach(function (m) { m.scale.setScalar(1); m.updateMatrixWorld(true); });     // measure the glass at its real size, not mid hover-bounce
    var f = screenFrame(mesh), vh = camera.top - camera.bottom, vw = camera.right - camera.left;
    zoomed = { p: camera.position.clone(), t: controls.target.clone(), z: camera.zoom, up: camera.up.clone(), bloom: 1, covered: false };
    var haloBase = halos.map(function (h) { return h.opacity; });
    $('pin').style.opacity = 0; $('note').style.opacity = 0; document.body.classList.add('at-pc');
    var seat = root.getObjectByName('Chair');
    var gone = [seat].concat(STATES.filter(function (k) { return k !== 'outside' && persons[k] && persons[k].visible; }).map(function (k) { return persons[k]; }));
    ensureDesktop();
    xpRoot.style.opacity = 0; xpRoot.style.transform = 'none'; xpRoot.style.pointerEvents = 'none';
    var st = status(), away = st === 'sleep' || st === 'outside', right = which === 'R', A = f.w / f.h;
    var pic = mesh.material.map && mesh.material.map.image;
    var g = {
      kind: away ? 'saver' : (st === 'play' && !right ? game.kind : 'term'),
      name: away ? 'Windows XD' : (st === 'play' ? (right ? 'YouTube' : (game.name || '')) : (right ? 'code' : 'opencode')),
      image: pic, live: true, frame: A, hold: 0, dismiss: away ? 'close' : 'minimize',
      after: (!away && st === 'work' && !right) ? codeCanvasFor(stage.clientWidth, stage.clientHeight) : null
    };
    var dur = (RMOTION ? 0.01 : 1.35) * SLOW;
    // the real desktop opens at once, already in its final state (window minimized, saver gone), invisible: it is measured
    // for the painted copy on the glass and shown when the camera arrives
    window.XPDesktop.setLang(lang);
    if (away) window.XPDesktop.open({ noBoot: true, instant: true }); else window.XPDesktop.open({ game: g, noBoot: true, instant: true });
    var hc = document.createElement('canvas'); hc.width = 1024; hc.height = Math.round(1024 / A);
    var ht = new THREE.CanvasTexture(hc); ht.encoding = THREE.sRGBEncoding; ht.flipY = false;
    var snap = null, srcPic = pic, glassM = mesh.material;
    requestAnimationFrame(function () { snap = deskSnapshot(); });
    var snapT = setInterval(function () { if (!zoomed) return clearInterval(snapT); snap = deskSnapshot() || snap; }, 250 * Math.max(1, SLOW / 4));
    function paintHand(k) {
      var gx = hc.getContext('2d'), m = RMOTION ? 1 : ramp(0.38, 0.72, k);      // mid-flight: the screen is big enough to see it fold, not yet the whole view
      if (!snap) { gx.drawImage(srcPic, 0, 0, hc.width, hc.height); ht.needsUpdate = true; return; }
      var L = paintDesk(hc, snap, A);
      if (snap.task && !away) {
        var tb = L.R2(snap.task);
        if (m < 1) {
          // XP's own minimize: a few hard steps from the full picture down to the taskbar button
          var q = Math.floor(m * 9) / 9, e = q * q * (3 - 2 * q);
          var fx = 0 + (tb[0] - 0) * e, fy = 0 + (tb[1] - 0) * e, fw = hc.width + (tb[2] - hc.width) * e, fh = hc.height + (tb[3] - hc.height) * e;
          if (q < 0.34) gx.drawImage(srcPic, fx, fy, fw, fh);
          else { taskButton(gx, [fx, fy, fw, Math.max(tb[3], fh * 0.12)], snap, L.s, snap.taskText); }
        }
      } else if (m < 1) { gx.globalAlpha = 1 - m; gx.drawImage(srcPic, 0, 0, hc.width, hc.height); gx.globalAlpha = 1; }      // the saver simply fades out
      ht.needsUpdate = true;
    }
    paintHand(0); glassM.map = ht; glassM.userData.hand = true;
    zoomed.hand = { paint: paintHand, glass: glassM,
      fromBlack: function (a) {            // after a shutdown: the monitor is black and the status picture comes up on it
        var gx = hc.getContext('2d'); gx.fillStyle = '#000'; gx.fillRect(0, 0, hc.width, hc.height);
        gx.globalAlpha = a; gx.drawImage(srcPic, 0, 0, hc.width, hc.height); gx.globalAlpha = 1; ht.needsUpdate = true;
      }, reSnap: function () { snap = deskSnapshot() || snap; }, setSrc: function (p) { srcPic = p; } };      // standUp plays it backwards
    var zoomTo = Math.max(vh / f.h, vw / f.w);           // cover, not contain: the glass fills the window, nothing around it
    tweenCam({ p: f.c.clone().addScaledVector(f.n, 120), t: f.c.clone(), z: zoomTo }, dur, function () {
      clearInterval(snapT);
      xpRoot.style.opacity = 1; xpRoot.style.pointerEvents = '';                       // the one and only switch, on a matching frame
      var xr = xpRoot.querySelector('.xp'); if (xr) try { xr.focus({ preventScroll: true }); } catch (e) { }      // keyboard (language hotkeys, menus) goes to the desktop right away
      requestAnimationFrame(function () { if (zoomed) zoomed.covered = true; });
    }, function (k) {
      paintHand(k);
      fadeObjs(gone, 1 - ramp(0.1, 0.34, k));             // the chair and the owner melt away instead of popping out
      halos.forEach(function (h, i) { h.opacity = haloBase[i] * (1 - ramp(0.55, 0.95, k)); });
      psx.fx = 1 - ramp(0.45, 0.9, k);                   // the PS1 look melts away as the camera arrives: at 0 the frame is drawn directly
      zoomed.bloom = 1 - ramp(0.55, 0.95, k);           // the glow would wash the picture out up close and break the matching frame      // the glow fakes bloom around the glass; up close it would only wash the picture out
    });
  }
  function standUp(how) {
    if (!zoomed) return;
    var off = how === 'off';
    var back = zoomed;
    var restored = false, back2 = null;
    function restore() {                                   // puts the right figure back, still fully transparent, then it fades in
      if (restored) return; restored = true; zoomed = null; applyTime(); zoomed = back;
      back2 = [root.getObjectByName('Chair')].concat(STATES.filter(function (k) { return k !== 'outside' && persons[k] && persons[k].visible; }).map(function (k) { return persons[k]; }));
      fadeObjs(back2, 0);
    }
    document.body.classList.remove('at-pc');
    back.covered = false; back.bloom = 0;
    if (xpRoot) xpRoot.style.pointerEvents = 'none';
    // the glass shows the desktop as it is now (measured before it closes), and the status picture unfolds from the taskbar
    // on the way out: the sit-down minimize played backwards, so nothing on the monitor ever switches in one frame
    var hand = back.hand, hi = hand ? screens.indexOf(hand.glass) : -1;
    if (hand) { hand.setSrc(screenTex(hi).image); if (off) hand.fromBlack(0); else { hand.reSnap(); hand.paint(1); } }
    // the screen goes back to what the monitor shows (the camera has not moved yet), then the camera pulls away
    if (xpRoot) { xpRoot.style.transition = 'opacity ' + (0.35 * SLOW) + 's ease'; xpRoot.style.opacity = 0; }
    setTimeout(function () {
      if (window.XPDesktop && window.XPDesktop.isOpen()) window.XPDesktop.close();
      if (xpRoot) xpRoot.style.transition = '';
      tweenCam(back, (RMOTION ? 0.01 : 1.1) * SLOW, function () {
        restore(); fadeObjs(back2, 1); zoomed = null; controls.enabled = true; $('pin').style.opacity = 1; psx.fx = 1;
        if (hand) { delete hand.glass.userData.hand; hand.glass.map = screenTex(hi); }      // the live status texture, the same picture the last painted frame showed
      }, function (k) {
        if (hand) { if (off) hand.fromBlack(ramp(0.05, 0.5, k)); else hand.paint(1 - k); }
        back.bloom = ramp(0.05, 0.45, k); psx.fx = ramp(0.1, 0.55, k);
        if (k > 0.45) { restore(); fadeObjs(back2, ramp(0.45, 0.8, k)); }
      });
    }, RMOTION ? 0 : 380 * SLOW);
  }

  /* ---------- pointer ---------- */
  var ray = has3d ? new THREE.Raycaster() : null, ndc = has3d ? new THREE.Vector2() : null, hot = false, hotK = 0, downAt = null;
  function overMonitor(ev) {
    var r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObjects(monitors, true)[0], o = hit && hit.object;
    while (o && !/^Monitor_[LR]$/.test(o.name)) o = o.parent;
    return o ? o.name.slice(-1) : null;                 // 'L', 'R' or null
  }

  /* ---------- loop ---------- */
  var RMOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var last = performance.now(), clockAcc = 0, proj = has3d ? new THREE.Vector3() : null, rel = has3d ? new THREE.Vector3() : null, ready = false;
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05); last = now; clockAcc += dt;
    if (clockAcc > 5) { clockAcc = 0; if (readClock()) applyTime(); }
    if (ready) {
      if (!zoomed) controls.update();
      // dollhouse: a wall and everything on it disappears while the camera is behind it
      rel.copy(camera.position).sub(controls.target).normalize();
      [rel.z, rel.x].forEach(function (side, i) {
        var f = fades[i], goal = side > -0.12 ? 1 : 0;
        if (f.t === goal) return;
        f.t = Math.max(0, Math.min(1, f.t + (goal > f.t ? 1 : -1) * dt / 0.55));   // a steady 0.55 s fade, eased below
        f.k = f.t * f.t * (3 - 2 * f.t);
        var solid = f.t >= 1;                 // back to opaque only once the fade has fully finished, so nothing snaps
        f.mats.forEach(function (m) {
          var b = m.userData.base; m.opacity = b * (0.16 + 0.84 * f.k); m.transparent = !solid || b < 1;
          m.depthWrite = b < 1 ? false : (m.userData.panel ? solid : true);      // only the big panels stop hiding what is behind them
        });
        if (i === 1) fadeCards();
      });
      // the coast switches exactly when the window is edge-on to the camera, the one moment the switch cannot be seen
      portalMask.visible = outdoor.visible = rel.z > 0;
      hotK += ((hot && !zoomed ? 1 : 0) - hotK) * Math.min(1, dt * 10);
      monitors.forEach(function (m) { m.scale.setScalar(1 + hotK * 0.05); });
      if (!RMOTION) idle(now / 1000);
      tickClock();
      liveScreens(performance.now() / 1000);          // one clock for everything that must agree with the desktop (frame timestamps drift from it in some browsers)
      animateWater(performance.now() / 1000);
      tickWeather(performance.now() / 1000, dt);
      if (zoomed && zoomed.covered) { requestAnimationFrame(frame); return; }      // the desktop covers the whole window: nothing to draw
      render();
      anchor.getWorldPosition(proj); proj.project(camera);
      var pin = $('pin'); pin.style.left = ((proj.x + 1) / 2 * stage.clientWidth) + 'px'; pin.style.top = ((1 - proj.y) / 2 * stage.clientHeight - 8) + 'px';
      placeTags(); pin.style.visibility = tagOn('projects') ? 'visible' : 'hidden';
      tourCam(dt);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- debug panel: pick what I am doing and the time of day (temporary) ---------- */
  var manualTime = null;
  (function () {
    var css = document.createElement('style');
    css.textContent = '.dbg{position:fixed;z-index:7;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:grid;gap:6px;font-size:12.5px}' +
      '.dbg div{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.dbg b{font-weight:600;opacity:.75;min-width:44px}' +
      '.dbg button{background:var(--chip);border:1px solid var(--chip-line);border-radius:999px;color:var(--text);padding:4px 10px;font-size:12.5px}' +
      '.dbg button[aria-pressed="true"]{background:var(--text);color:var(--ink);border-color:var(--text)}' +
      '@media (max-width:640px){.dbg{bottom:calc(env(safe-area-inset-bottom,0px) + 56px)}}';
    document.head.appendChild(css);
    var box = document.createElement('div'); box.className = 'dbg';
    var rows = [['state', 'debug', [['auto', null], ['работаю', 'work'], ['Dota', 'play:dota'], ['CS', 'play:cs'], ['другая игра', 'play:other'], ['сплю', 'sleep'], ['на улице', 'outside']]],
                ['time', 'время', [['auto', null], ['день', 13], ['закат', 18.2], ['ночь', 1.5]]],
                ['wx', 'погода', [['auto', null], ['ясно', 'clear'], ['облачно', 'cloud'], ['дождь', 'rain'], ['гроза', 'storm']]],
                ['slow', 'полёт', [['×20', 20], ['обычный', 1]]],
                ['ps1', 'ps1', [['вкл', true], ['выкл', false]]]];
    rows.forEach(function (row) {
      var line = document.createElement('div'), lab = document.createElement('b'); lab.textContent = row[1]; line.appendChild(lab);
      row[2].forEach(function (opt) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = opt[0]; b.setAttribute('aria-pressed', String(row[0] === 'slow' ? opt[1] === SLOW : row[0] === 'ps1' ? opt[1] === psx.on : opt[1] === null));
        b.addEventListener('click', function () {
          if (row[0] === 'slow' || row[0] === 'ps1') { if (row[0] === 'slow') SLOW = opt[1]; else psx.on = opt[1]; line.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); return; }
          if (row[0] === 'wx') { wx.forced = opt[1]; line.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); applyTime(); return; }
          if (row[0] === 'state') {
            var parts = opt[1] ? String(opt[1]).split(':') : [null]; forced = parts[0];
            if (parts[1]) { game.kind = parts[1]; game.name = { dota: 'Dota 2', cs: 'Counter-Strike 2', other: null }[parts[1]]; }
            if (!forced && steam && steam.state === 'in-game') { game.kind = gameKind(steam.appid); game.name = steam.game || null; }
          } else manualTime = opt[1];
          // the state and the hour are independent: the light follows the hour (asleep is night anyway, see applyTime)
          preview = manualTime;
          line.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          readClock(); applyTime();
        });
        line.appendChild(b);
      });
      box.appendChild(line);
    });
    document.body.appendChild(box);
  })();

  /* ---------- boot ---------- */
  // the weather goes first, in parallel with the room; the last answer is remembered so a repeat visit starts with it
  WX.restoreWeather(wx, Date.now());
  fetchWeather(); setInterval(fetchWeather, 15 * 60e3);
  applyLang(); readClock(); applyTime();
  function fail() { $('loading').style.opacity = 0; $('note').style.opacity = 0; var p = $('pin'); p.hidden = false; p.style.left = '50%'; p.style.top = '50%'; }
  if (has3d) {
    fetch('room.json').then(function (r) { return r.json(); }).then(function (data) {
      $('meter').style.width = '60%';
      var bin = atob(data.gz || data.glb), buf = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      var inflate = !data.gz ? Promise.resolve(buf.buffer) : (typeof DecompressionStream === 'function'
        ? new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
        : new Promise(function (res, rej) {               // older browsers: a small inflater from the CDN
            var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako_inflate.min.js';
            sc.onload = function () { res(window.pako.inflate(buf).buffer); }; sc.onerror = rej; document.head.appendChild(sc);
          }));
      return inflate.then(function (ab) { return new Promise(function (res, rej) { new THREE.GLTFLoader().parse(ab, '', res, rej); }); });
    }).then(function (gltf) {
      $('meter').style.width = '100%';
      build(gltf); ready = true; $('loading').style.opacity = 0; $('pin').hidden = false;
      setTimeout(function () { if (!zoomed) startTour(false); }, RMOTION ? 0 : 900);
      if (window.XPDesktop) (window.requestIdleCallback || function (f) { setTimeout(f, 1200); })(function () { if (!zoomed) ensureDesktop(); });
      if (/^pc/.test((location.hash || '').replace('#', ''))) setTimeout(function () { sitDown('L'); }, 700);     // #pc opens straight at the computer, #pcdota with a game running
      var el = renderer.domElement;
      el.addEventListener('pointermove', function (ev) { hot = !zoomed && !downAt && !!overMonitor(ev); el.style.cursor = hot || (!zoomed && !downAt && overFrame(ev)) ? 'pointer' : 'grab'; });
      el.addEventListener('pointerdown', function (ev) { downAt = [ev.clientX, ev.clientY]; });
      el.addEventListener('pointerup', function (ev) {
        var moved = downAt ? Math.abs(ev.clientX - downAt[0]) + Math.abs(ev.clientY - downAt[1]) : 99; downAt = null;
        if (moved > 6) { $('note').style.opacity = 0; return; }       // it was a drag: the hint has done its job
        var which = overMonitor(ev);
        if (which) { sitDown(which); return; }
        var fr = overFrame(ev);
        if (fr && fr.kind === 'resume') { openResume(); return; }
        if (fr) { var fb = new THREE.Box3().setFromObject(fr.mesh), fp = new THREE.Vector3(); fb.getCenter(fp); fp.y = fb.max.y + 0.1; showInfo(fp, STR[lang].diploma); return; }
        closeDrawer();
      });
      el.addEventListener('pointerleave', function () { hot = false; downAt = null; });
      window.addEventListener('resize', layout);
    }).catch(function (e) { if (window.console) console.error(e); fail(); });
  } else fail();
  route();
  pollSteam(); if (STEAM_ENDPOINT) setInterval(pollSteam, 60000);
  requestAnimationFrame(frame);
})();

export {};
