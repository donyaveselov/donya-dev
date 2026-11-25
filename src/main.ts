// Entry point: the room's styles, then the room. The desktop (its styles, icons, shell and apps) is loaded by the room
// once it is up (src/services/desktop.service.ts) and mounted when the visitor sits down at a monitor.
import './modules/room/room.css';

import './modules/room';
