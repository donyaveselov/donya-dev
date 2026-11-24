// Notification-area balloon tips: queued, one at a time; hover pauses the timeout, a swipe right dismisses.
import type { XPBalloonOptions } from '../../shared/types';
import { D, esc, h } from './dom';
import { localPt } from './geometry';
import { messageIcon } from './glyphs';
import { sound } from './sound';
import { domOrNull } from './state';
import { L, tr } from './strings';

let queue: XPBalloonOptions[] = [];
let cur: HTMLDivElement | null = null;

export function showBalloon(o: XPBalloonOptions = {}): void {
  queue.push(o);
  if (!cur) next();
}

export function clearBalloons(): void {
  queue = [];
  cur?.remove();
  cur = null;
}

function next(): void {
  const o = queue.shift();
  const R = domOrNull();
  if (!o || !R) {
    cur = null;
    return;
  }
  const el = h(
    'div',
    'xp-balloon',
    `<div class="xp-balloon__t">${messageIcon(o.icon)}<span>${esc(tr(o.title))}</span></div><div class="xp-balloon__b">${esc(tr(o.text))}</div><button class="xp-balloon__x" aria-label="${esc(L('close'))}"></button>`,
  );
  R.root.appendChild(el);
  let t0 = 0;
  let left = o.timeout ?? 8000;
  let paused = false;
  let sx: number | null = null;
  cur = el;
  const close = (): void => {
    if (cur !== el) return;
    clearTimeout(t0);
    el.classList.add('xp--out');
    setTimeout(() => {
      el.remove();
      cur = null;
      next();
    }, D(400));
  };
  const arm = (): void => {
    clearTimeout(t0);
    t0 = window.setTimeout(close, left);
  };
  el.addEventListener('pointerenter', () => {
    paused = true;
    clearTimeout(t0);
  });
  el.addEventListener('pointerleave', () => {
    if (paused) {
      paused = false;
      left = 3000;
      arm();
    }
  });
  el.querySelector('.xp-balloon__x')?.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    sx = localPt(e).x;
  });
  el.addEventListener('pointerup', (e) => {
    if (sx != null && localPt(e).x - sx > 60) {
      close();
      sx = null;
      return;
    }
    sx = null;
    if (e.target instanceof Element && e.target.closest('.xp-balloon__x')) return;
    o.onClick?.();
    close();
  });
  sound('notify');
  arm();
}
