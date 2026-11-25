// The Windows XD desktop: its styles, the shell, then the apps in registration order (the order of the desktop icons).
// The room loads this module on demand and uses its exports (src/shared/desktop.ts).
import './styles/xp.css';
import './styles/apps.css';
import './styles/mocks-verifikat.css';
import './styles/mocks-kompi.css';
import './install';
import './apps/projects';
import './apps/resume';
import './apps/about';
import './apps/contact';
import './apps/terminal';
import './apps/minesweeper';
import './apps/paint';
import './apps/recycle';
import './apps/browser';
import './apps/notepad';

export { XP_ICO, XP_WALL } from './icons';
export { api } from './shell/desktop';
