-- Keys for the read API (/api/v1/*). Only a SHA-256 hash is kept; the full
-- key is shown once, when an admin creates it. prefix lets people tell keys apart.
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,   -- full ISO timestamp
  created_by TEXT NOT NULL,   -- WorkOS user ID
  last_used_at TEXT,
  revoked_at TEXT
);
