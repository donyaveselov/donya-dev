-- The analytics' tables. Days are Phuket days (Asia/Bangkok), "YYYY-MM-DD"; times are ms since the epoch.
-- No IP address and no User-Agent is ever stored: a visitor is sha256(daily salt + ip + ua)[:16], and of the
-- User-Agent only a browser and an OS family are kept.

-- one row per event the page sent, as the list (src/services/analytics.schema.ts) allows it
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  ts INTEGER NOT NULL,
  session TEXT NOT NULL,
  visitor TEXT NOT NULL,
  event TEXT NOT NULL,
  -- ms since the visit began, by the page's clock
  ct INTEGER NOT NULL DEFAULT 0,
  props TEXT NOT NULL DEFAULT '{}',
  browser TEXT NOT NULL DEFAULT 'other',
  os TEXT NOT NULL DEFAULT 'other'
);
CREATE INDEX events_day ON events (day);
CREATE INDEX events_session ON events (session);

-- one row per visit (a tab's session), and its Telegram message
CREATE TABLE sessions (
  session TEXT PRIMARY KEY,
  visitor TEXT NOT NULL,
  day TEXT NOT NULL,
  started INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  -- the longest active and total time a visit_end brought
  active_ms INTEGER NOT NULL DEFAULT 0,
  total_ms INTEGER NOT NULL DEFAULT 0,
  device TEXT,
  lang TEXT,
  referrer TEXT,
  utm TEXT,
  -- the message: its id, when it was sent and last edited (s since the epoch), and its text
  message_id INTEGER,
  notified_at INTEGER,
  edited_at INTEGER,
  message_text TEXT
);
CREATE INDEX sessions_day ON sessions (day);

-- today's random salt; the cron deletes the other days'
CREATE TABLE salts (
  day TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);

-- events per visitor per rate window (floor(s / 600))
CREATE TABLE rate (
  visitor TEXT NOT NULL,
  win INTEGER NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (visitor, win)
);

-- small things to remember: digest_last (the day the last digest was for)
CREATE TABLE state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
