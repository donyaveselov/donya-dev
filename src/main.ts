// Entry point. Evaluation order matters and matches build.py: styles, the XP icons, the XP shell, the XP apps
// (in xp/apps/manifest.json order), then the room, which mounts the desktop on demand through window.XPDesktop.
import './styles/room.css';
import './styles/extra.css';
import './styles/xp.css';
import './styles/apps.css';
import './styles/mocks-verifikat.css';
import './styles/mocks-kompi.css';

import './xp/legacy/icons-xp';
import './xp/legacy/core';
import './xp/legacy/apps/common';
import './xp/legacy/apps/stack';
import './xp/legacy/apps/mocks';
import './xp/legacy/apps/mocks-verifikat';
import './xp/legacy/apps/mocks-kompi';
import './xp/legacy/apps/projects';
import './xp/legacy/apps/resume';
import './xp/legacy/apps/about';
import './xp/legacy/apps/contact';
import './xp/legacy/apps/terminal';
import './xp/legacy/apps/minesweeper';
import './xp/legacy/apps/paint';
import './xp/legacy/apps/recycle';
import './xp/legacy/apps/browser';
import './xp/legacy/apps/notepad';

import './room/legacy-app';
