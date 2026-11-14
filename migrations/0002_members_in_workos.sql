-- Board members now live in WorkOS (the CIC organization), so board_members
-- goes and owner_id, by_id and approved_by hold WorkOS user IDs. SQLite can't
-- drop a foreign key, so the tables that pointed at board_members are rebuilt.
-- The new children point at donors_new; renaming it to donors updates them.
PRAGMA defer_foreign_keys = on;

CREATE TABLE donors_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  org TEXT,
  owner_id TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]',
  next_step_text TEXT,
  next_step_due TEXT,
  next_step_event_id TEXT REFERENCES events(id),
  last_touch_at TEXT
);
INSERT INTO donors_new SELECT id, name, email, phone, org, owner_id, sources, next_step_text, next_step_due, next_step_event_id, last_touch_at FROM donors;

CREATE TABLE gifts_new (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors_new(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  program TEXT NOT NULL
);
INSERT INTO gifts_new SELECT id, donor_id, amount, date, source, program FROM gifts;

CREATE TABLE interactions_new (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors_new(id),
  by_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT NOT NULL
);
INSERT INTO interactions_new SELECT id, donor_id, by_id, channel, date, summary FROM interactions;

CREATE TABLE drafts_new (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors_new(id),
  kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT
);
INSERT INTO drafts_new SELECT id, donor_id, kind, channel, body, created_at, status, approved_by FROM drafts;

-- Children first, so dropping a parent never leaves rows pointing at it.
DROP TABLE drafts;
DROP TABLE interactions;
DROP TABLE gifts;
DROP TABLE donors;
DROP TABLE board_members;

ALTER TABLE donors_new RENAME TO donors;
ALTER TABLE gifts_new RENAME TO gifts;
ALTER TABLE interactions_new RENAME TO interactions;
ALTER TABLE drafts_new RENAME TO drafts;

CREATE INDEX donors_owner ON donors(owner_id);
CREATE INDEX gifts_donor ON gifts(donor_id);
CREATE INDEX interactions_donor ON interactions(donor_id);
CREATE INDEX drafts_donor ON drafts(donor_id);
