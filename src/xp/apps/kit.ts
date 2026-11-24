// The apps' UI kit: a DOM builder whose bilingual text re-renders on a language switch, menu bars, toolbars, status
// bars, buttons and the clipboard. Each app makes one kit per window with ui(api) and calls destroy() on close.
import { isBilingual, type Text } from '../../shared/i18n';
import type { Bilingual, Lang, XPAppApi, XPDialogOptions } from '../../shared/types';
import { G16, G24, iconMarkup } from './icons';

const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = (): boolean => reducedMQ.matches;

export const pad = (n: number | string, w = 2): string => String(n).padStart(w, '0');

/** Phuket time (UTC+7), with the host's hour and minute when it provides them. */
export function phuketNow(api?: XPAppApi): { h: number; m: number; s: number; date: Date } {
  const d = new Date(Date.now() + 7 * 3600e3);
  const out = { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), date: d };
  try {
    const t = api?.phuketTime();
    if (t) {
      out.h = t.h;
      out.m = t.m || 0;
    }
  } catch {
    /* the computer's own clock */
  }
  return out;
}

export function copyText(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const fallback = (): void => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.select();
        // the old API still works where the async clipboard is missing (http, older browsers)
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const ok = document.execCommand('copy');
        ta.remove();
        resolve(ok);
      } catch {
        resolve(false);
      }
    };
    if (window.isSecureContext && 'clipboard' in navigator)
      navigator.clipboard.writeText(text).then(() => {
        resolve(true);
      }, fallback);
    else fallback();
  });
}

/* ------------------------------------------------------------------ h() typing */

type TagOf<S extends string> = S extends `${infer T}.${string}` ? T : S extends `${infer T}#${string}` ? T : S;
/** The element type a selector like 'input.xpa-field' builds. */
export type El<S extends string> =
  TagOf<S> extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[TagOf<S>] : HTMLElement;

export type Child = Node | Text | number | null | undefined | false | Child[];
type AttrValue = string | number | boolean | Bilingual | null | undefined;
export interface Attrs {
  on?: Partial<Record<keyof HTMLElementEventMap, (e: Event) => void>>;
  html?: string;
  style?: Record<string, string>;
  class?: string;
  text?: Text | number;
  [attr: string]: AttrValue | Attrs['on'] | Attrs['style'];
}

const isChildArg = (v: unknown): v is Child =>
  typeof v === 'string' || Array.isArray(v) || v instanceof Node || isBilingual(v);

/* ------------------------------------------------------------------ menus and toolbars */

export interface MenuItemDef {
  label?: Text;
  key?: string;
  sep?: boolean;
  radio?: boolean;
  disabled?: boolean | (() => boolean);
  checked?: boolean | (() => boolean);
  action?: () => void;
}
export interface MenuDef {
  label: Text;
  items: MenuItemDef[];
}

export interface ToolButton {
  /** A glyph name, or markup starting with '<'. */
  g?: string;
  label?: Text;
  title?: Text;
  showLabel?: boolean;
  /** Large toolbar: the 24 px glyph when there is one. */
  big?: boolean;
  drop?: boolean;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
}

export interface StatusBar {
  el: HTMLDivElement;
  set(i: number, v: Text | number): void;
  cell(i: number): HTMLDivElement | undefined;
}

export type Kit = ReturnType<typeof ui>;

export function ui(api: XPAppApi) {
  let bindings: (() => void)[] = [];
  let cleanups: (() => void)[] = [];
  let dead = false;

  function t(d: Text | number | null | undefined): string {
    if (d == null) return '';
    return isBilingual(d) ? api.t(d) : String(d);
  }
  function bind(fn: () => void): () => void {
    fn();
    bindings.push(fn);
    return fn;
  }
  function refresh(): void {
    if (dead) return;
    for (const b of bindings) {
      try {
        b();
      } catch (e) {
        console.error(e);
      }
    }
  }
  const unLang = api.onLang(refresh);

  function append(node: Node, c: Child): void {
    if (c == null || c === false) return;
    if (Array.isArray(c)) {
      for (const x of c) append(node, x);
      return;
    }
    if (c instanceof Node) {
      node.appendChild(c);
      return;
    }
    if (isBilingual(c)) {
      const tn = document.createTextNode('');
      bind(() => {
        tn.nodeValue = t(c);
      });
      node.appendChild(tn);
      return;
    }
    node.appendChild(document.createTextNode(String(c)));
  }

  /** h('div.a.b#id', {attr..., on: {click: fn}, html: '...'}, children); bilingual text and attributes follow the language. */
  function h<S extends string>(sel: S, attrs?: Attrs | Child, children?: Child): El<S> {
    let a: Attrs | null = null;
    let kids: Child = children;
    if (isChildArg(attrs)) kids = attrs;
    else if (typeof attrs === 'object') a = attrs;
    const m = sel.split(/(?=[.#])/);
    const node = document.createElement(m[0] ?? 'div');
    for (const part of m.slice(1)) {
      if (part.startsWith('.')) node.classList.add(part.slice(1));
      else node.id = part.slice(1);
    }
    if (a)
      for (const [k, v] of Object.entries(a) as [string, unknown][]) {
        if (v == null || v === false) continue;
        if (k === 'on') {
          for (const [ev, fn] of Object.entries(v as Record<string, EventListener>)) node.addEventListener(ev, fn);
          continue;
        }
        if (k === 'html') {
          node.innerHTML = v as string;
          continue;
        }
        if (k === 'style') {
          for (const [s, sv] of Object.entries(v as Record<string, string>)) node.style.setProperty(s, sv);
          continue;
        }
        if (k === 'class') {
          for (const c of (v as string).split(/\s+/)) if (c) node.classList.add(c);
          continue;
        }
        if (isBilingual(v)) {
          bind(
            k === 'text'
              ? () => {
                  node.textContent = t(v);
                }
              : () => {
                  node.setAttribute(k, t(v));
                },
          );
          continue;
        }
        const str = typeof v === 'number' ? String(v) : v === true ? '' : (v as string);
        if (k === 'text') node.textContent = str;
        else node.setAttribute(k, str);
      }
    append(node, kids);
    return node as El<S>;
  }

  function icon(name: string, cls?: string): HTMLSpanElement {
    const s = document.createElement('span');
    s.className = `xpa-ico${cls ? ` ${cls}` : ''}`;
    s.innerHTML = iconMarkup(name);
    return s;
  }
  function glyph(name: string): HTMLSpanElement {
    const s = document.createElement('span');
    s.className = 'xpa-g16';
    s.innerHTML = G16[name] ?? '';
    return s;
  }

  function sound(n: string): void {
    api.sound(n);
  }

  function listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Document | Window,
    ev: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    opt?: boolean | AddEventListenerOptions,
  ): void {
    const l = fn as EventListener;
    target.addEventListener(ev, l, opt);
    cleanups.push(() => {
      target.removeEventListener(ev, l, opt);
    });
  }
  function onCleanup(fn: () => void): void {
    cleanups.push(fn);
  }
  function every(ms: number, fn: () => void): number {
    const id = window.setInterval(fn, ms);
    cleanups.push(() => {
      clearInterval(id);
    });
    return id;
  }
  function later(ms: number, fn: () => void): number {
    const id = window.setTimeout(fn, ms);
    cleanups.push(() => {
      clearTimeout(id);
    });
    return id;
  }

  /** A menu bar: hover between open menus, arrow keys, Escape, and items that may be disabled or checked. */
  function menubar(menus: MenuDef[]): HTMLDivElement & { closeMenu: (focusBack: boolean) => void } {
    const bar = h('div.xpa-menubar', { role: 'menubar' });
    let openIdx = -1;
    let drop: HTMLDivElement | null = null;
    const buttons: HTMLButtonElement[] = [];

    function close(focusBack: boolean): void {
      drop?.remove();
      drop = null;
      const b = buttons[openIdx];
      if (b) {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
        if (focusBack) b.focus();
      }
      openIdx = -1;
    }
    const itemsEls = (): HTMLElement[] =>
      drop ? [...drop.querySelectorAll<HTMLElement>('.xpa-mi:not([aria-disabled="true"])')] : [];
    function open(i: number, focusFirst: boolean): void {
      close(false);
      const b = buttons[i];
      const menu = menus[i];
      if (!b || !menu) return;
      openIdx = i;
      b.classList.add('open');
      b.setAttribute('aria-expanded', 'true');
      const d = h('div.xpa-menu', { role: 'menu' });
      drop = d;
      for (const it of menu.items) {
        if (it.sep) {
          d.appendChild(h('div.xpa-msep', { role: 'separator' }));
          continue;
        }
        const dis = typeof it.disabled === 'function' ? it.disabled() : !!it.disabled;
        const chk = typeof it.checked === 'function' ? it.checked() : !!it.checked;
        const mi = h(
          'div.xpa-mi',
          {
            role: it.checked ? 'menuitemcheckbox' : 'menuitem',
            tabindex: '-1',
            'aria-disabled': dis ? 'true' : 'false',
            'aria-checked': it.checked ? String(chk) : null,
          },
          [
            h(`span.xpa-mi-chk${chk ? (it.radio ? '.radio' : '.on') : ''}`),
            h('span.xpa-mi-l', t(it.label)),
            h('span.xpa-mi-k', it.key ?? ''),
          ],
        );
        const run = (): void => {
          if (dis) {
            sound('error');
            return;
          }
          close(false);
          sound('click');
          try {
            it.action?.();
          } catch (e) {
            console.error(e);
          }
        };
        mi.addEventListener('click', run);
        mi.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            run();
          }
        });
        mi.addEventListener('mouseenter', () => {
          if (!dis) mi.focus();
        });
        d.appendChild(mi);
      }
      d.addEventListener('keydown', (e) => {
        const els = itemsEls();
        const k = els.indexOf(document.activeElement as HTMLElement);
        const n = menus.length;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          (els[(k + 1) % els.length] ?? els[0])?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          (els[(k - 1 + els.length) % els.length] ?? els[0])?.focus();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          open((openIdx + 1) % n, true);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          open((openIdx - 1 + n) % n, true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close(true);
        } else if (e.key === 'Tab') close(false);
      });
      bar.appendChild(d);
      // under the button, kept inside the bar's width
      const left = b.offsetLeft;
      d.style.left = `${String(left)}px`;
      const maxLeft = Math.max(0, bar.clientWidth - d.offsetWidth - 2);
      if (left > maxLeft) d.style.left = `${String(maxLeft)}px`;
      if (focusFirst) itemsEls()[0]?.focus();
    }

    menus.forEach((m, i) => {
      const n = menus.length;
      const b = h(
        'button.xpa-mb',
        { type: 'button', role: 'menuitem', 'aria-haspopup': 'true', 'aria-expanded': 'false' },
        m.label,
      );
      b.addEventListener('click', () => {
        if (openIdx === i) close(false);
        else open(i, false);
      });
      b.addEventListener('mouseenter', () => {
        if (openIdx >= 0 && openIdx !== i) open(i, false);
      });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(i, true);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          buttons[(i + 1) % buttons.length]?.focus();
          if (openIdx >= 0) open((i + 1) % n, false);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          buttons[(i - 1 + buttons.length) % buttons.length]?.focus();
          if (openIdx >= 0) open((i - 1 + n) % n, false);
        } else if (e.key === 'Escape') close(false);
      });
      buttons.push(b);
      bar.appendChild(b);
    });
    bar.appendChild(h('span.xpa-menubar-fill'));
    listen(
      document,
      'pointerdown',
      (e) => {
        if (drop && !(e.target instanceof Node && bar.contains(e.target))) close(false);
      },
      true,
    );
    bind(() => {
      if (drop) close(false);
    });
    return Object.assign(bar, { closeMenu: close });
  }

  function tbtn(o: ToolButton): HTMLButtonElement {
    const title = o.title ?? o.label ?? null;
    const g = o.g;
    const big = o.big ? (g ? G24[g] : undefined) : undefined;
    const b = h('button.xpa-tb', { type: 'button', title, 'aria-label': title }, [
      g
        ? g.startsWith('<')
          ? h('span.xpa-g16', { html: g })
          : big
            ? h('span.xpa-g16.x24', { html: big })
            : glyph(g)
        : null,
      o.showLabel ? h('span.xpa-tb-l', o.label) : null,
      o.drop ? h('span.xpa-tb-dd', '▾') : null,
    ]);
    if (o.big) b.classList.add('big');
    if (o.disabled) b.disabled = true;
    const click = o.onClick;
    if (click)
      b.addEventListener('click', (e) => {
        sound('click');
        click(e);
      });
    return b;
  }
  function toolbar(children: Child, cls?: string): HTMLDivElement {
    const el = h('div.xpa-toolbar', { role: 'toolbar' }, children);
    if (cls) el.classList.add(cls);
    return el;
  }
  const tsep = (): HTMLSpanElement => h('span.xpa-tsep');

  function statusbar(n: number): StatusBar {
    const cells: HTMLDivElement[] = [];
    const el = h('div.xpa-status');
    for (let i = 0; i < n; i++) {
      const c = h('div.xpa-st');
      cells.push(c);
      el.appendChild(c);
    }
    el.appendChild(h('div.xpa-grip', { 'aria-hidden': 'true' }));
    const bound: (Text | number | undefined)[] = [];
    bind(() => {
      bound.forEach((v, i) => {
        const c = cells[i];
        if (v != null && c) c.textContent = t(v);
      });
    });
    return {
      el,
      set(i, v) {
        bound[i] = v;
        const c = cells[i];
        if (c) c.textContent = t(v);
      },
      cell: (i) => cells[i],
    };
  }

  function button(
    label: Child,
    onClick?: ((e: MouseEvent, b: HTMLButtonElement) => void) | null,
    opts: { primary?: boolean; title?: Text } = {},
  ): HTMLButtonElement {
    const b = h('button.xpa-btn', { type: 'button', title: opts.title ?? null }, label);
    if (opts.primary) b.classList.add('primary');
    if (onClick)
      b.addEventListener('click', (e) => {
        onClick(e, b);
      });
    return b;
  }

  /** A copy button with a short "Copied" state. */
  function copyButton(
    getText: string | (() => string),
    opts: { label?: Text; title?: Text; onCopied?: (ok: boolean) => void } = {},
  ): HTMLButtonElement {
    const base = opts.label ?? { ru: 'Копировать', en: 'Copy' };
    const label = h('span', base);
    const b = h(
      'button.xpa-btn.xpa-copy',
      { type: 'button', title: opts.title ?? { ru: 'Скопировать в буфер обмена', en: 'Copy to clipboard' } },
      [glyph('copy'), label],
    );
    let timer = 0;
    b.addEventListener('click', () => {
      void copyText(typeof getText === 'function' ? getText() : getText).then((ok) => {
        sound(ok ? 'click' : 'error');
        b.classList.toggle('ok', ok);
        b.classList.toggle('fail', !ok);
        label.textContent = ok
          ? t({ ru: 'Скопировано', en: 'Copied' })
          : t({ ru: 'Не вышло: выделите вручную', en: 'Failed: select it manually' });
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          b.classList.remove('ok', 'fail');
          label.textContent = t(base);
        }, 1600);
        opts.onCopied?.(ok);
      });
    });
    cleanups.push(() => {
      clearTimeout(timer);
    });
    return b;
  }

  function dialog(o: XPDialogOptions): void {
    api.dialog(o);
  }
  function aboutDialog(name: Text, extra?: Text): void {
    dialog({
      title: { ru: 'О программе', en: 'About' },
      icon: 'info',
      text:
        t(name) +
        '\n' +
        t({
          ru: 'Версия 1.0 · сделано вручную для этого рабочего стола',
          en: 'Version 1.0 · handmade for this desktop',
        }) +
        (extra ? `\n\n${t(extra)}` : ''),
      buttons: [{ label: 'OK', primary: true }],
    });
  }

  /** An app's root element; it gets xpa-narrow / xpa-tiny classes as the window narrows. */
  function root(contentEl: HTMLElement, cls: string, narrowAt = 520): HTMLDivElement {
    const r = h('div.xpa');
    r.classList.add(cls);
    contentEl.appendChild(r);
    const measure = (): void => {
      const w = r.clientWidth;
      if (w) {
        r.classList.toggle('xpa-narrow', w < narrowAt);
        r.classList.toggle('xpa-tiny', w < 380);
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    cleanups.push(() => {
      ro.disconnect();
    });
    setTimeout(measure, 0);
    return r;
  }

  function destroy(): void {
    dead = true;
    for (const f of cleanups) {
      try {
        f();
      } catch {
        /* a cleanup of a window that is going away */
      }
    }
    cleanups = [];
    bindings = [];
    unLang();
  }

  const lang = (): Lang => api.lang();

  return {
    t,
    h,
    bind,
    refresh,
    icon,
    glyph,
    sound,
    listen,
    onCleanup,
    every,
    later,
    menubar,
    toolbar,
    tbtn,
    tsep,
    statusbar,
    button,
    copyButton,
    dialog,
    aboutDialog,
    root,
    destroy,
    lang,
  };
}
