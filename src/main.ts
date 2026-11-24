// Entry point. Evaluation order matters and matches build.py: the room's styles, the desktop (its styles, icons, shell
// and apps), then the room, which mounts the desktop on demand through window.XPDesktop.
import './room/room.css';

import './xp';

import './room';
