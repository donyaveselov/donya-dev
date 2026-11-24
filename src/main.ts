// Entry point. Evaluation order matters and matches build.py: styles, the XP icons, the XP shell, the XP apps
// (in xp/apps/manifest.json order), then the room, which mounts the desktop on demand through window.XPDesktop.
import './styles/room.css';
import './styles/extra.css';
import './styles/xp.css';
import './styles/apps.css';
import './styles/mocks-verifikat.css';
import './styles/mocks-kompi.css';

import './xp';

import './room/legacy-app';
