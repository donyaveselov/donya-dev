// The Windows XP bitmaps (c) Microsoft, from github.com/ShizukuIchi/winXP, github.com/rozniak/xfce-winxp-tc
// (luna.msstyles, msgina, shell icons), github.com/B00merang-Artwork/LinXP, github.com/botoxparty/XP.css (pixel-traced
// caption and scrollbar buttons), github.com/bartekl1/windows-ui-assets (shell32.dll) and github.com/1j01/jspaint
// (mspaint tool box). The PNGs are data: URLs in a JSON asset, which Vite inlines into the bundle as one JSON.parse
// string; the default wallpaper is a JPEG inlined as a data: URL.
import blissUrl from './assets/bliss.jpg?inline';
import icons from './assets/xp-icons.json';

export type XPIconKey = keyof typeof icons;
/** Icon bitmaps as data: URLs, by name. */
export const XP_ICO: Readonly<Record<XPIconKey, string>> = icons;
/** The default (Bliss) wallpaper as a data: URL. */
export const XP_WALL: string = blissUrl;

const lookup = XP_ICO as Readonly<Partial<Record<string, string>>>;
/** A bitmap by a key that may not exist (`ms_n${n}`, `${key}16`). */
export const ico = (key: string): string | undefined => lookup[key];

export function svg(body: string, vb = '0 0 32 32'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
}
export function svgImage(src: string, cls = '', size = 32, pixel = false): string {
  return `<image${cls ? ` class="${cls}"` : ''} href="${src}" width="${String(size)}" height="${String(size)}"${pixel ? ' style="image-rendering:pixelated"' : ''}/>`;
}

/* A bitmap wrapped in <svg> so every sizing rule still applies. A key with an original 16 px version (key + '16')
   carries both: the 32 px one (class xi32) shows by default, the 16 px one (class xi16) in the 16 px slots listed in
   xp.css. A key with only a 16 px original is used as is. */
export function bmp(key: string, pixel = false): string {
  const big = ico(key);
  const small = ico(`${key}16`);
  if (big)
    return svg(small ? svgImage(big, 'xi32', 32, pixel) + svgImage(small, 'xi16') : svgImage(big, '', 32, pixel));
  return small ? svg(svgImage(small, '', 32, pixel)) : '';
}

/** A two-state bitmap (normal / hot) for buttons drawn by the theme: the hot one (class xh) shows on hover, see xp.css. */
export function bmpHot(key: string): string {
  const n = ico(key);
  if (!n) return '';
  const hot = ico(`${key}Hot`);
  return svg(svgImage(n, 'xn') + (hot ? svgImage(hot, 'xh') : ''));
}

/** Theme bitmaps (caption buttons, scroll bars, check boxes, tabs...) reach the stylesheets as custom properties. */
export function installThemeVars(doc: Document = document): void {
  if (doc.getElementById('xp-ico-css')) return;
  const vars = Object.entries(lookup)
    .filter(([k]) => /^(cap|sb|cb|combo|menuCheck|tab|prog|tree[PM]|btn|allProg|tp[CE]|startBtn)/.test(k))
    .map(([k, v]) => `--xpi-${k}:url("${v ?? ''}")`)
    .join(';');
  const st = doc.createElement('style');
  st.id = 'xp-ico-css';
  st.textContent = `.xp{${vars}}`;
  doc.head.appendChild(st);
}
