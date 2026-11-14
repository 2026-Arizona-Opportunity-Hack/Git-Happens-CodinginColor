-- Donor platform schema. Arrays (sources) are stored as JSON text.

CREATE TABLE board_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE donors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  org TEXT,
  owner_id TEXT NOT NULL REFERENCES board_members(id),
  sources TEXT NOT NULL DEFAULT '[]',
  next_step_text TEXT,
  next_step_due TEXT,
  next_step_event_id TEXT REFERENCES events(id),
  last_touch_at TEXT
);
CREATE INDEX donors_owner ON donors(owner_id);

CREATE TABLE gifts (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  program TEXT NOT NULL
);
CREATE INDEX gifts_donor ON gifts(donor_id);

CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors(id),
  by_id TEXT NOT NULL REFERENCES board_members(id),
  channel TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT NOT NULL
);
CREATE INDEX interactions_donor ON interactions(donor_id);

CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors(id),
  kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT REFERENCES board_members(id)
);
CREATE INDEX drafts_donor ON drafts(donor_id);
