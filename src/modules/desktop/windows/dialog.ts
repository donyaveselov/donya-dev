// Message boxes. A dialog is modal to its owner window (or to the whole desktop when it has none): clicks on what it
// blocks flash its title bar.
import type { XPDialogButton, XPDialogHandle, XPDialogOptions } from '../../../types';
import { Z } from '../store/constants';
import { h } from '../dom';
import { ICON, messageIcon } from '../glyphs';
import { sound, soundByName } from '../sound';
import { dom, S } from '../store/state';
import { BRAND, L, tr } from '../strings';
import { growIn, startFlash, Win } from './window';

export interface DialogOptions extends XPDialogOptions {
  owner?: Win | null;
}

export function dialog(o: DialogOptions = {}): XPDialogHandle {
  const owner = o.owner && !o.owner.closed ? o.owner : null;
  const icon = messageIcon(o.icon);
  const w = new Win({
    kind: 'dialog',
    title: o.title ?? BRAND,
    icon: owner ? owner.icon : ICON.logo,
    resizable: false,
    modal: true,
    owner,
    noTask: true,
    center: true,
    w: 420,
    h: 160,
  });
  const body = h('div', 'xp-dlg');
  const row = h(
    'div',
    'xp-dlg__row',
    `${icon ? `<div class="xp-dlg__ic">${icon}</div>` : ''}<div class="xp-dlg__text"></div>`,
  );
  const txt = row.querySelector('.xp-dlg__text');
  if (txt) {
    if (o.html) txt.innerHTML = o.html;
    else txt.textContent = tr(o.text);
  }
  body.appendChild(row);
  const btns = h('div', 'xp-dlg__btns');
  const list: XPDialogButton[] = o.buttons?.length ? o.buttons : [{ label: L('ok'), primary: true }];
  let primaryBtn: HTMLButtonElement | null = null;
  for (const b of list) {
    const bt = h('button', `xp-btn${b.primary ? ' xp-btn--default' : ''}`);
    bt.textContent = tr(b.label);
    bt.addEventListener('click', () => {
      if (b.onClick?.() !== false) w.close();
    });
    if (b.primary) primaryBtn = bt;
    btns.appendChild(bt);
  }
  body.appendChild(btns);
  w.body.appendChild(body);
  w.fitToContent();
  // modality: the owner (or, without one, the desktop and every window on it) goes inert, and a click on the shield
  // over it flashes the dialog
  let shield: HTMLDivElement;
  if (owner) {
    owner.setBlockedBy(w);
    shield = h('div', 'xp-modal-shield');
    owner.el.appendChild(shield);
  } else {
    shield = h('div', 'xp-modal');
    dom().wins.appendChild(shield);
    shield.style.zIndex = String(Z.modalShield);
    S.modalBlock = w;
    for (const x of S.wins) if (x !== w) x.setBlockedBy(w);
  }
  shield.addEventListener(
    'pointerdown',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      w.focus();
      w.flashTitle();
    },
    true,
  );
  w.unblock = () => {
    shield.remove();
    if (owner) {
      if (owner.blockedBy === w) owner.setBlockedBy(null);
    } else {
      S.modalBlock = null;
      for (const x of S.wins) if (x.blockedBy === w) x.setBlockedBy(null);
    }
  };
  w.hooks.onEsc = () => {
    list.find((b) => b.cancel)?.onClick?.();
    w.close();
  };
  w.focus();
  if (owner?.state === 'min') startFlash(owner);
  if (o.icon === 'error' || o.icon === 'warn') sound('error');
  else soundByName(o.sound ?? 'notify');
  growIn(w.el);
  setTimeout(() => {
    primaryBtn?.focus();
  }, 0);
  return {
    close: () => {
      w.close(true);
    },
    el: w.el,
  };
}
