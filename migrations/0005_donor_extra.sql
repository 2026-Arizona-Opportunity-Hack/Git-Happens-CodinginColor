-- Custom donor fields an admin creates while importing ("Create a new column"
-- in the staging step), stored as a JSON object of field name -> text.
ALTER TABLE donors ADD COLUMN extra TEXT NOT NULL DEFAULT '{}';
