// The floating-logo screen saver is drawn twice: by the room on its 3D monitors (src/room/live-screens.ts) and by the
// desktop's own saver (src/xp/shell/screensaver.ts), which takes over at the same spot when the visitor sits down.
// They agree on these numbers, so the logo neither jumps nor changes size at the switch.

/** The canvas the room draws its saver on (the monitors' 16:9 glass); the desktop gets its width as `saverBase`. */
export const SAVER_SCREEN = { w: 768, h: 432 } as const;
/** The box the logo and its lettering take up; it bounces inside the screen minus this box. */
export const SAVER_LOGO = { w: 250, h: 78 } as const;
/** Deep blue, not black: with the owner asleep the screens are the room's light source. */
export const SAVER_BG = '#0a1a4a';
