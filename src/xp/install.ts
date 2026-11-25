// Runs before any app registers: the theme's custom properties exist from the start. The desktop itself is this
// module's exports (index.ts); window.XPDesktop is only a debug handle for the regression harness.
import { debugWanted } from '../shared/debug';
import { installThemeVars } from './icons';
import { api } from './shell/desktop';

installThemeVars();
if (debugWanted()) window.XPDesktop = api;
