// The shell's shared numbers: gesture timings, sizes the layout code and the CSS agree on, and stacking order.

/** Two presses within this many ms are a double click (window icon, title bar, desktop icon). */
export const DOUBLE_CLICK_MS = 450;
/** A finger held this long opens the context menu (the ring under it grows for as long). */
export const LONG_PRESS_MS = 500;

/** The title bar's height in the geometry (the ghost strip, how much of a window must stay reachable). */
export const CAPTION_H = 28;
/** The taskbar's height by size class (--xp-taskbar-h in xp.css). */
export const TASKBAR_H = { desk: 30, phone: 40 } as const;

/** Size classes by the desktop's width: phone up to 520 px, compact up to 820, desk above. */
export const PHONE_MAX_W = 520;
export const COMPACT_MAX_W = 820;
/** Narrower than this, context menus open as a sheet along the bottom (.xp--tiny in xp.css). */
export const TINY_W = 400;

/** The screen saver's floating logo: the box that bounces off the edges (the room's copy uses the same one). */
export const SAVER_LOGO = { w: 250, h: 78 } as const;

/**
 * Stacking order inside .xp-wins; the layers above the windows (taskbar 5000, menus 6000, tips 7000, overlays 9000)
 * are in xp.css.
 */
export const Z = {
  /** The shield of a desktop-wide modal dialog: under every window. */
  modalShield: 99,
  /** The first window; each next one in z-order is two higher. */
  windows: 100,
  /** A window that covers the taskbar too (the game hand-off). */
  cover: 8000,
} as const;
