-- One row per source per committed import, so the Import page can show when
-- each spreadsheet/export was last loaded and Notifications can flag stale ones.
CREATE TABLE imports (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  file_name TEXT,
  row_count INTEGER NOT NULL,
  imported_at TEXT NOT NULL, -- full ISO timestamp, so same-day imports order correctly
  imported_by TEXT NOT NULL  -- WorkOS user ID
);
CREATE INDEX imports_source ON imports(source, imported_at);
