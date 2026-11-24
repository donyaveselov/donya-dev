// Entry point: the room's styles, then the room. The desktop (its styles, icons, shell and apps) is loaded by the room
// once it is up (src/room/desktop-loader.ts) and mounted on demand through window.XPDesktop.
import './room/room.css';

import './room';
