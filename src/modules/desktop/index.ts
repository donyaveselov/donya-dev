// The Windows XD desktop: its styles, the shell, then the apps in registration order (the order of the desktop icons).
// The room loads this module on demand and uses its exports (src/services/desktop-registry.ts).
import './xp.css';
import '../apps/apps.css';
import '../apps/projects/mocks/mocks-verifikat.css';
import '../apps/projects/mocks/mocks-kompi.css';
import './install';
import '../apps/projects';
import '../apps/resume';
import '../apps/about';
import '../apps/contact';
import '../apps/terminal';
import '../apps/minesweeper';
import '../apps/paint';
import '../apps/recycle';
import '../apps/browser';
import '../apps/notepad';
import '../apps/calculator';

export { XP_ICO, XP_WALL } from './icons';
export { api } from './desktop';
