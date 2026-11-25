import { describe, expect, it } from 'vitest';
import { closePopups, type Popup, registerPopup } from './popups';

/** Registers all three pop-ups; `closed` lists the ones asked to close, in order. */
function setup(): { closed: Popup[]; off: (() => void)[] } {
  const closed: Popup[] = [];
  const kinds: Popup[] = ['start', 'menus', 'volume'];
  const off = kinds.map((k) => registerPopup(k, () => closed.push(k)));
  return { closed, off };
}

describe('the pop-up registry', () => {
  it('closes every pop-up, in registration order', () => {
    const { closed, off } = setup();
    closePopups();
    expect(closed).toEqual(['start', 'menus', 'volume']);
    for (const f of off) f();
  });

  it('closes only the named ones', () => {
    const { closed, off } = setup();
    closePopups('volume');
    closePopups('menus', 'start');
    expect(closed).toEqual(['volume', 'start', 'menus']);
    for (const f of off) f();
  });

  it('forgets a pop-up once it is unregistered', () => {
    const { closed, off } = setup();
    for (const f of off) f();
    closePopups();
    expect(closed).toEqual([]);
  });

  it('keeps a newer registration when an older one is undone late', () => {
    const closed: string[] = [];
    const offOld = registerPopup('start', () => closed.push('old'));
    const offNew = registerPopup('start', () => closed.push('new'));
    offOld();
    closePopups('start');
    expect(closed).toEqual(['new']);
    offNew();
  });

  it('lets a pop-up close another while closing', () => {
    const closed: string[] = [];
    const offMenus = registerPopup('menus', () => closed.push('menus'));
    const offStart = registerPopup('start', () => {
      closed.push('start');
      closePopups('menus');
    });
    closePopups('start');
    expect(closed).toEqual(['start', 'menus']);
    offMenus();
    offStart();
  });
});
