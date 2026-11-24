// Publishes the desktop on window for the room and the regression harness, and the icon bitmaps for the room's
// painted copy of the desktop. Imported before any app so the theme's custom properties exist from the start.
import { installThemeVars, XP_ICO, XP_WALL } from './icons';
import { api } from './shell/desktop';

installThemeVars();
window.XP_ICO = XP_ICO;
window.XP_WALL = XP_WALL;
window.XPDesktop = api;
